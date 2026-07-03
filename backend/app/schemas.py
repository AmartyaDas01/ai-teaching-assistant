"""Pydantic request/response schemas for the API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

BloomLevel = Literal["L1", "L2", "L3", "L4", "L5", "L6"]
Difficulty = Literal["easy", "medium", "hard"]


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    filename: str
    file_type: str
    status: str
    page_count: int
    chunk_count: int
    error: str | None = None
    uploaded_at: datetime


class Source(BaseModel):
    doc_id: int
    filename: str
    page_number: int
    snippet: str


class ChatQuery(BaseModel):
    question: str
    course_id: int | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    provider: str  # "openai" | "ollama" | "none"


# ─── Quiz ────────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    document_id: int
    num_questions: int = Field(default=5, ge=1, le=20)
    difficulty: Difficulty = "medium"
    bloom_levels: list[BloomLevel] = Field(default_factory=lambda: ["L1", "L2", "L3"])


class QuestionPublic(BaseModel):
    """Question as shown while taking a quiz (no answer leaked)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    options: list[str]
    bloom_level: BloomLevel


class QuizOut(BaseModel):
    id: int
    title: str
    document_id: int | None
    config: dict
    created_at: datetime
    questions: list[QuestionPublic]


class QuizSummary(BaseModel):
    id: int
    title: str
    document_id: int | None
    num_questions: int
    num_attempts: int
    created_at: datetime


class SubmitRequest(BaseModel):
    student_name: str = "Anonymous"
    answers: dict[int, str]  # question_id -> selected option text


class GradedQuestion(BaseModel):
    question_id: int
    question_text: str
    options: list[str]
    your_answer: str | None
    correct_answer: str
    is_correct: bool
    bloom_level: BloomLevel
    explanation: str | None


class AttemptResult(BaseModel):
    attempt_id: int
    score: float  # percentage 0-100
    correct_count: int
    total: int
    graded: list[GradedQuestion]
