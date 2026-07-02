"""Pydantic request/response schemas for the API."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
