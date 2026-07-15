"""Quiz models - a generated quiz, its questions, and student attempts.

Follows the brief's schema. options_json / config_json / answers_json use SQLAlchemy's
JSON type (Postgres-compatible; stored as TEXT on SQLite).
"""
import secrets
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_share_token() -> str:
    """Unguessable handle for the public student link (URL-safe, ~128 bits)."""
    return secrets.token_urlsafe(16)


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    # Students take a quiz via /take/<share_token> with no account. The token is the
    # only credential, so it must be unguessable - quiz ids are sequential and would
    # let anyone enumerate every quiz in the system.
    share_token: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, default=new_share_token, nullable=False
    )
    # generation config: {num_questions, difficulty, bloom_levels, source_filename}
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="Question.id",
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[list] = mapped_column(JSON, default=list)  # list[str]
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)  # exact option text
    bloom_level: Mapped[str] = mapped_column(String(4), nullable=False)  # "L1".."L6"
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    quiz: Mapped["Quiz"] = relationship(back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False
    )
    student_name: Mapped[str] = mapped_column(String(255), default="Anonymous")
    # {question_id: selected_option_text}
    answers_json: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[float] = mapped_column(Float, default=0.0)  # percentage 0-100
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")
