"""Course/subject organization endpoints (scoped to the authenticated user)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.user import User
from app.schemas import CourseCreate, CourseOut
from app.vectorstore import store

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("", response_model=CourseOut, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = Course(
        name=payload.name, semester=payload.semester, user_id=current_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("", response_model=list[CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Course)
        .filter(Course.user_id == current_user.id)
        .order_by(Course.created_at.desc())
        .all()
    )


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.get(Course, course_id)
    if course is None or course.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Course not found")
    # Drop the course's vector collection, then the DB rows (documents/quizzes cascade).
    store.delete_collection(course.collection_name)
    db.delete(course)
    db.commit()
