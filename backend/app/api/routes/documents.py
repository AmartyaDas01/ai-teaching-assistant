"""Document management endpoints (scoped to the authenticated user)."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.document import Document
from app.models.user import User
from app.schemas import DocumentOut
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])


def _owned_document(doc_id: int, db: Session, user: User) -> Document:
    doc = (
        db.query(Document)
        .join(Course)
        .filter(Document.id == doc_id, Course.user_id == user.id)
        .first()
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    course_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        doc = document_service.create_and_ingest(db, file, course_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(
    course_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).join(Course).filter(Course.user_id == current_user.id)
    if course_id is not None:
        query = query.filter(Document.course_id == course_id)
    return query.order_by(Document.uploaded_at.desc()).all()


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _owned_document(doc_id, db, current_user)


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _owned_document(doc_id, db, current_user)
    document_service.delete_document(db, doc)
