"""Quiz generation and scoring.

Generation: pull broad coverage of a document's chunks -> prompt the LLM (JSON mode)
to produce Bloom's-tagged MCQs -> validate/repair the JSON -> persist.
Scoring: compare submitted answers against stored correct options.
"""
from __future__ import annotations

import json
import re

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.document import Document
from app.models.quiz import Question, Quiz, QuizAttempt
from app.schemas import (
    AttemptResult,
    GradedQuestion,
    QuizGenerateRequest,
    SubmitRequest,
)
from app.services import rag_service
from app.vectorstore import store

BLOOM_DEFINITIONS = {
    "L1": "Remember - recall facts, terms, and basic concepts",
    "L2": "Understand - explain ideas or concepts in your own words",
    "L3": "Apply - use information in new situations to solve problems",
    "L4": "Analyze - break information into parts and examine relationships",
    "L5": "Evaluate - justify a decision or judge based on criteria",
    "L6": "Create - design or produce something new from the material",
}

MAX_CONTEXT_CHUNKS = 18


class QuizGenerationError(RuntimeError):
    """Raised when the LLM output could not be turned into a valid quiz."""


def _build_prompt(context: str, req: QuizGenerateRequest) -> str:
    levels = "\n".join(f"  {lv}: {BLOOM_DEFINITIONS[lv]}" for lv in req.bloom_levels)
    return f"""You are an expert CSE educator creating an assessment.

Using ONLY the course content below, write exactly {req.num_questions} \
multiple-choice questions at {req.difficulty} difficulty.

Distribute the questions across these Bloom's Taxonomy levels:
{levels}

Rules:
- Each question has exactly 4 options.
- Exactly one option is correct.
- "answer" must be the full text of the correct option (copied verbatim).
- "bloom_level" must be one of: {", ".join(req.bloom_levels)}.
- Base every question strictly on the content; do not invent facts.
- Include a one-sentence "explanation" of why the answer is correct.

Return ONLY valid JSON in exactly this shape:
{{"questions": [
  {{"question": "...", "options": ["...","...","...","..."],
    "answer": "...", "bloom_level": "L2", "explanation": "..."}}
]}}

Course content:
\"\"\"
{context}
\"\"\""""


def _extract_json(raw: str) -> dict:
    """Parse LLM output into a dict, tolerating stray prose or code fences."""
    raw = raw.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fall back to the first {...} or [...] block
        match = re.search(r"(\{.*\}|\[.*\])", raw, re.DOTALL)
        if not match:
            raise QuizGenerationError("Model did not return parseable JSON.")
        data = json.loads(match.group(1))
    if isinstance(data, list):
        return {"questions": data}
    return data


_LEVEL_WORDS = {
    "remember": "L1",
    "understand": "L2",
    "apply": "L3",
    "analyze": "L4",
    "analyse": "L4",
    "evaluate": "L5",
    "create": "L6",
}


def _normalize_bloom(value: str, allowed: list[str]) -> str:
    v = str(value).strip().lower()
    m = re.search(r"[1-6]", v)
    level = f"L{m.group(0)}" if m else _LEVEL_WORDS.get(v, allowed[0])
    return level if level in allowed else allowed[0]


def _match_answer(answer: str, options: list[str]) -> str | None:
    """Return the option that the model's answer refers to, or None."""
    answer = str(answer).strip()
    for opt in options:
        if opt.strip().lower() == answer.lower():
            return opt
    # Handle "A"/"B"/"1"/"a) ..." style references
    letter = re.match(r"^\(?([a-dA-D1-4])[).\s]", answer) or re.fullmatch(
        r"([a-dA-D1-4])", answer
    )
    if letter:
        key = letter.group(1).lower()
        idx = "abcd".find(key)
        if idx == -1 and key.isdigit():
            idx = int(key) - 1
        if 0 <= idx < len(options):
            return options[idx]
    return None


def _validate_questions(data: dict, allowed_levels: list[str]) -> list[dict]:
    questions = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(questions, list):
        raise QuizGenerationError("Model output missing a 'questions' list.")

    valid: list[dict] = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        text = str(q.get("question", "")).strip()
        options = q.get("options")
        if not text or not isinstance(options, list) or len(options) < 2:
            continue
        options = [str(o).strip() for o in options if str(o).strip()]
        if len(options) < 2:
            continue
        correct = _match_answer(q.get("answer", ""), options)
        if correct is None:
            continue
        valid.append(
            {
                "question_text": text,
                "options_json": options,
                "correct_answer": correct,
                "bloom_level": _normalize_bloom(
                    q.get("bloom_level", allowed_levels[0]), allowed_levels
                ),
                "explanation": str(q.get("explanation", "")).strip() or None,
            }
        )
    if not valid:
        raise QuizGenerationError(
            "The model did not produce any valid questions. Try again or reduce the count."
        )
    return valid


def generate_quiz(db: Session, req: QuizGenerateRequest, user_id: int) -> Quiz:
    doc = db.get(Document, req.document_id)
    if doc is None:
        raise QuizGenerationError("Document not found.")
    course = db.get(Course, doc.course_id)
    if course is None or course.user_id != user_id:
        raise QuizGenerationError("Document not found.")
    if doc.status != "ready" or not doc.chroma_collection_id:
        raise QuizGenerationError("Document is not ready - wait for processing to finish.")

    chunks = store.get_document_chunks(
        doc.chroma_collection_id, doc.id, limit=MAX_CONTEXT_CHUNKS
    )
    if not chunks:
        raise QuizGenerationError("No content found for this document.")
    context = "\n\n".join(c["text"] for c in chunks)

    try:
        llm = rag_service.get_llm(json_mode=True, temperature=0.4)
        result = llm.invoke(_build_prompt(context, req))
        raw = result.content if hasattr(result, "content") else str(result)
    except Exception as exc:  # noqa: BLE001
        raise rag_service.LLMUnavailableError(
            "Could not reach the language model to generate the quiz. "
            f"Underlying error: {exc}"
        ) from exc

    questions = _validate_questions(_extract_json(raw), req.bloom_levels)

    quiz = Quiz(
        document_id=doc.id,
        course_id=doc.course_id,
        title=f"Quiz · {doc.filename}",
        config_json={
            "num_questions": req.num_questions,
            "difficulty": req.difficulty,
            "bloom_levels": req.bloom_levels,
            "source_filename": doc.filename,
        },
    )
    quiz.questions = [Question(**q) for q in questions]
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def score_attempt(db: Session, quiz: Quiz, submit: SubmitRequest) -> AttemptResult:
    graded: list[GradedQuestion] = []
    correct_count = 0
    for q in quiz.questions:
        your = submit.answers.get(q.id)
        is_correct = your is not None and your.strip() == q.correct_answer.strip()
        if is_correct:
            correct_count += 1
        graded.append(
            GradedQuestion(
                question_id=q.id,
                question_text=q.question_text,
                options=q.options_json,
                your_answer=your,
                correct_answer=q.correct_answer,
                is_correct=is_correct,
                bloom_level=q.bloom_level,  # type: ignore[arg-type]
                explanation=q.explanation,
            )
        )

    total = len(quiz.questions)
    score = round(100.0 * correct_count / total, 1) if total else 0.0

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_name=submit.student_name or "Anonymous",
        answers_json={str(k): v for k, v in submit.answers.items()},
        score=score,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return AttemptResult(
        attempt_id=attempt.id,
        score=score,
        correct_count=correct_count,
        total=total,
        graded=graded,
    )
