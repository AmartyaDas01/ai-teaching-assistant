"""Document model - one uploaded lecture file.

Follows the brief's `documents` schema, adapted for local storage (filepath instead of
s3_key) and with ingestion status tracking.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)  # pdf/docx/pptx/txt
    filepath: Mapped[str] = mapped_column(String(1024), nullable=False)
    chroma_collection_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # processing | ready | failed
    status: Mapped[str] = mapped_column(String(16), default="processing", nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    course: Mapped["Course"] = relationship(back_populates="documents")  # noqa: F821
