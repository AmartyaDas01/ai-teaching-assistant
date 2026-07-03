"""Course model.

In Phase 1 there is no auth yet, so a single default course is auto-created on first
upload. ChromaDB uses one collection per course, so cross-document queries within a
course work naturally.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    semester: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Chroma collection name derived from id.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="courses")  # noqa: F821
    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        back_populates="course", cascade="all, delete-orphan"
    )

    @property
    def collection_name(self) -> str:
        return f"course_{self.id}"
