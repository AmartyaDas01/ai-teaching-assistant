"""Document ingestion: save file -> parse -> chunk -> embed -> store in ChromaDB.

Runs synchronously for Phase 1. The ingest step is isolated in `ingest_document` so it
can later be wrapped by a Celery task without changing callers.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.course import Course
from app.models.document import Document
from app.utils.chunker import chunk_pages
from app.utils.parsers import detect_file_type, extract_text
from app.vectorstore import chroma_store

DEFAULT_COURSE_NAME = "My Course"


def get_or_create_default_course(db: Session, user_id: int) -> Course:
    course = (
        db.query(Course)
        .filter(Course.user_id == user_id)
        .order_by(Course.id)
        .first()
    )
    if course is None:
        course = Course(name=DEFAULT_COURSE_NAME, user_id=user_id)
        db.add(course)
        db.commit()
        db.refresh(course)
    return course


def _save_upload(upload: UploadFile) -> str:
    """Persist the uploaded file to disk and return its path."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(upload.filename or "").suffix
    dest = upload_dir / f"{uuid.uuid4().hex}{suffix}"
    with dest.open("wb") as f:
        f.write(upload.file.read())
    return str(dest)


def create_and_ingest(
    db: Session, upload: UploadFile, course_id: int | None, user_id: int
) -> Document:
    """Full upload flow. Raises ValueError for unsupported file types."""
    file_type = detect_file_type(upload.filename or "")

    course = None
    if course_id:
        candidate = db.get(Course, course_id)
        if candidate and candidate.user_id == user_id:
            course = candidate
    if course is None:
        course = get_or_create_default_course(db, user_id)

    filepath = _save_upload(upload)
    doc = Document(
        course_id=course.id,
        filename=upload.filename or Path(filepath).name,
        file_type=file_type,
        filepath=filepath,
        chroma_collection_id=course.collection_name,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    ingest_document(db, doc, course)
    return doc


def ingest_document(db: Session, doc: Document, course: Course) -> None:
    """Parse, chunk, embed, and store. Updates the document row's status."""
    try:
        pages = extract_text(doc.filepath, doc.file_type)
        chunks = chunk_pages(pages)
        added = chroma_store.add_chunks(
            collection_name=course.collection_name,
            doc_id=doc.id,
            course_id=course.id,
            filename=doc.filename,
            chunks=chunks,
        )
        doc.page_count = len({p for p, _ in pages})
        doc.chunk_count = added
        doc.status = "ready" if added > 0 else "failed"
        if added == 0:
            doc.error = "No extractable text found in document."
    except Exception as exc:  # noqa: BLE001 - surface any parse/embed failure to the row
        doc.status = "failed"
        doc.error = str(exc)[:1024]
    finally:
        db.commit()
        db.refresh(doc)


def delete_document(db: Session, doc: Document) -> None:
    """Remove a document's vectors, file, and DB row."""
    if doc.chroma_collection_id:
        chroma_store.delete_document(doc.chroma_collection_id, doc.id)
    try:
        Path(doc.filepath).unlink(missing_ok=True)
    except OSError:
        pass
    db.delete(doc)
    db.commit()
