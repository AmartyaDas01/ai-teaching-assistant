"""Chat endpoint — grounded Q&A over the user's course documents."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.user import User
from app.schemas import ChatQuery, ChatResponse
from app.services import rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
def query(
    payload: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty")

    if payload.course_id:
        course = db.get(Course, payload.course_id)
        if course is None or course.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Course not found")
        collections = [course.collection_name]
    else:
        # "All courses" — search across every collection the user owns and merge.
        courses = db.query(Course).filter(Course.user_id == current_user.id).all()
        collections = [c.collection_name for c in courses]

    try:
        return rag_service.answer_query(payload.question, collections)
    except rag_service.LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
