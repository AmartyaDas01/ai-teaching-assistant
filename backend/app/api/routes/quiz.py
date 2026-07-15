"""Quiz endpoints - generate, list, take, submit, export (scoped to the user)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.course import Course
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas import (
    AttemptResult,
    QuestionPublic,
    QuizGenerateRequest,
    QuizOut,
    QuizSummary,
    SubmitRequest,
)
from app.services import quiz_service, rag_service

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _owned_quiz(quiz_id: int, db: Session, user: User) -> Quiz:
    quiz = (
        db.query(Quiz)
        .join(Course)
        .filter(Quiz.id == quiz_id, Course.user_id == user.id)
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


def _to_quiz_out(quiz: Quiz) -> QuizOut:
    return QuizOut(
        id=quiz.id,
        title=quiz.title,
        document_id=quiz.document_id,
        config=quiz.config_json,
        created_at=quiz.created_at,
        share_token=quiz.share_token,
        questions=[
            QuestionPublic(
                id=q.id,
                question_text=q.question_text,
                options=q.options_json,
                bloom_level=q.bloom_level,  # type: ignore[arg-type]
            )
            for q in quiz.questions
        ],
    )


@router.post("/generate", response_model=QuizOut, status_code=201)
def generate_quiz(
    req: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        quiz = quiz_service.generate_quiz(db, req, current_user.id)
    except rag_service.LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except quiz_service.QuizGenerationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _to_quiz_out(quiz)


@router.get("", response_model=list[QuizSummary])
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quizzes = (
        db.query(Quiz)
        .join(Course)
        .filter(Course.user_id == current_user.id)
        .order_by(Quiz.created_at.desc())
        .all()
    )
    return [
        QuizSummary(
            id=q.id,
            title=q.title,
            document_id=q.document_id,
            num_questions=len(q.questions),
            num_attempts=len(q.attempts),
            created_at=q.created_at,
        )
        for q in quizzes
    ]


@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_quiz_out(_owned_quiz(quiz_id, db, current_user))


@router.post("/{quiz_id}/submit", response_model=AttemptResult)
def submit_quiz(
    quiz_id: int,
    submit: SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _owned_quiz(quiz_id, db, current_user)
    return quiz_service.score_attempt(db, quiz, submit)


@router.get("/{quiz_id}/export")
def export_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full quiz with answer key as downloadable JSON."""
    quiz = _owned_quiz(quiz_id, db, current_user)
    payload = {
        "title": quiz.title,
        "config": quiz.config_json,
        "questions": [
            {
                "question": q.question_text,
                "options": q.options_json,
                "answer": q.correct_answer,
                "bloom_level": q.bloom_level,
                "explanation": q.explanation,
            }
            for q in quiz.questions
        ],
    }
    filename = f"quiz-{quiz.id}.json"
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _owned_quiz(quiz_id, db, current_user)
    db.delete(quiz)
    db.commit()
