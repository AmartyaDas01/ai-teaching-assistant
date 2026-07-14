"""Chat endpoints — grounded Q&A over the user's course documents."""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.user import User
from app.schemas import ChatQuery, ChatResponse
from app.services import rag_service

router = APIRouter(prefix="/chat", tags=["chat"])

NO_CONTENT_MESSAGE = (
    "I couldn't find any relevant content in the uploaded documents. "
    "Try uploading course materials first, or rephrasing your question."
)


def _collections_for(payload: ChatQuery, db: Session, user: User) -> list[str]:
    """Resolve which vector collections this question may search.

    A named course must be one the user owns. With no course selected, retrieval fans
    out across every collection they own — it must never fall back to guessing one,
    which used to send the query to the wrong course's documents.
    """
    if payload.course_id:
        course = db.get(Course, payload.course_id)
        if course is None or course.user_id != user.id:
            raise HTTPException(status_code=404, detail="Course not found")
        return [course.collection_name]

    courses = db.query(Course).filter(Course.user_id == user.id).all()
    return [c.collection_name for c in courses]


@router.post("/query", response_model=ChatResponse)
def query(
    payload: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty")

    collections = _collections_for(payload, db, current_user)
    try:
        return rag_service.answer_query(payload.question, collections)
    except rag_service.LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/stream")
def stream(
    payload: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Same answer as /query, streamed token by token.

    Retrieval can't be streamed — the prompt needs the full context before generation
    starts — so the citations are sent first as one event, then the prose arrives in
    pieces. Sending sources up front is deliberate: the reader sees which material is
    being used *before* the answer, rather than reading an unattributed wall of text
    and learning its provenance afterwards.

    Errors are delivered as an in-stream "error" event, not an HTTP status: by the time
    the model fails, headers are long since sent and the status code is fixed at 200.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty")

    collections = _collections_for(payload, db, current_user)

    def generate():
        chunks = rag_service.retrieve_for(payload.question, collections)
        if not chunks:
            yield _sse({"type": "sources", "sources": [], "provider": "none"})
            yield _sse({"type": "token", "text": NO_CONTENT_MESSAGE})
            yield _sse({"type": "done"})
            return

        sources = [s.model_dump() for s in rag_service._to_sources(chunks)]
        yield _sse(
            {
                "type": "sources",
                "sources": sources,
                "provider": rag_service.active_provider(),
            }
        )
        try:
            for piece in rag_service.stream_answer(payload.question, chunks):
                yield _sse({"type": "token", "text": piece})
        except rag_service.LLMUnavailableError as exc:
            yield _sse({"type": "error", "detail": str(exc)})
            return
        yield _sse({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Tell any proxy not to buffer, or the whole point of streaming is lost.
            "X-Accel-Buffering": "no",
        },
    )
