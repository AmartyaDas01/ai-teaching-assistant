"""Public student endpoints - take a quiz via a share link, no account needed.

These are the only unauthenticated routes that touch course content. The share token
is the sole credential, so it is deliberately unguessable (quiz ids are sequential and
would let anyone enumerate every quiz). Nothing here exposes the answer key, the owning
professor, or any other quiz.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.quiz import Quiz
from app.schemas import (
    AttemptResult,
    PublicQuizOut,
    QuestionPublic,
    StudentSubmitRequest,
    SubmitRequest,
)
from app.services import quiz_service

router = APIRouter(prefix="/public", tags=["public"])


def _quiz_by_token(token: str, db: Session) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.share_token == token).first()
    if quiz is None:
        raise HTTPException(status_code=404, detail="This quiz link is not valid.")
    return quiz


@router.get("/quiz/{share_token}", response_model=PublicQuizOut)
def get_shared_quiz(share_token: str, db: Session = Depends(get_db)):
    quiz = _quiz_by_token(share_token, db)
    # Built field-by-field on purpose: it guarantees correct_answer and explanation
    # can never be serialized to a student, whatever the ORM model gains later.
    return PublicQuizOut(
        title=quiz.title,
        questions=[
            QuestionPublic(
                id=q.id,
                question_text=q.question_text,
                options=q.options_json,
                bloom_level=q.bloom_level,
            )
            for q in quiz.questions
        ],
    )


@router.post("/quiz/{share_token}/submit", response_model=AttemptResult)
def submit_shared_quiz(
    share_token: str, payload: StudentSubmitRequest, db: Session = Depends(get_db)
):
    quiz = _quiz_by_token(share_token, db)
    # Reuse the same scoring path as the professor's own attempt, so a student's
    # result is recorded identically and feeds the analytics without a second code path.
    return quiz_service.score_attempt(
        db,
        quiz,
        SubmitRequest(student_name=payload.student_name, answers=payload.answers),
    )
