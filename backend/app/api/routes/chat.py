"""Chat endpoint — grounded Q&A over course documents."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.course import Course
from app.schemas import ChatQuery, ChatResponse
from app.services import document_service, rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
def query(payload: ChatQuery, db: Session = Depends(get_db)):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty")

    course = (
        db.get(Course, payload.course_id) if payload.course_id else None
    ) or document_service.get_or_create_default_course(db)

    try:
        return rag_service.answer_query(payload.question, course.collection_name)
    except rag_service.LLMUnavailableError as exc:
        # 503: retrieval worked but generation backend is unreachable.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
