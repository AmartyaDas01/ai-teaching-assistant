"""Chat endpoint — grounded Q&A over the user's course documents."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.user import User
from app.schemas import ChatQuery, ChatResponse
from app.services import document_service, rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
def query(
    payload: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty")

    course = None
    if payload.course_id:
        candidate = db.get(Course, payload.course_id)
        if candidate and candidate.user_id == current_user.id:
            course = candidate
    if course is None:
        course = document_service.get_or_create_default_course(db, current_user.id)

    try:
        return rag_service.answer_query(payload.question, course.collection_name)
    except rag_service.LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
