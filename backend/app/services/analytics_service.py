"""Analytics aggregation - computed on the fly from quizzes, questions, and attempts.

No dedicated analytics table: everything is derived from stored quiz attempts, so
metrics always reflect the latest data.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.document import Document
from app.models.quiz import Question, Quiz, QuizAttempt
from app.schemas import (
    AnalyticsOverview,
    BloomPerformance,
    HeatmapCell,
    HeatmapTopic,
    QuizPerformance,
    TimelinePoint,
)

BLOOM_NAMES = {
    "L1": "Remember",
    "L2": "Understand",
    "L3": "Apply",
    "L4": "Analyze",
    "L5": "Evaluate",
    "L6": "Create",
}
BLOOM_ORDER = ["L1", "L2", "L3", "L4", "L5", "L6"]


def compute_overview(db: Session, user_id: int) -> AnalyticsOverview:
    num_documents = (
        db.query(Document).join(Course).filter(Course.user_id == user_id).count()
    )
    quizzes = db.query(Quiz).join(Course).filter(Course.user_id == user_id).all()
    quiz_ids = [q.id for q in quizzes]
    questions = (
        db.query(Question).filter(Question.quiz_id.in_(quiz_ids)).all()
        if quiz_ids
        else []
    )
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id.in_(quiz_ids))
        .order_by(QuizAttempt.attempted_at)
        .all()
        if quiz_ids
        else []
    )

    quiz_title = {q.id: q.title for q in quizzes}
    q_by_id = {q.id: q for q in questions}

    # Overview
    num_attempts = len(attempts)
    avg_score = (
        round(sum(a.score for a in attempts) / num_attempts, 1) if num_attempts else 0.0
    )

    # Bloom performance: recompute per-question correctness across all attempts
    bloom_correct: dict[str, int] = defaultdict(int)
    bloom_total: dict[str, int] = defaultdict(int)
    for a in attempts:
        for qid_str, selected in (a.answers_json or {}).items():
            question = q_by_id.get(int(qid_str))
            if question is None:
                continue
            level = question.bloom_level
            bloom_total[level] += 1
            if str(selected).strip() == question.correct_answer.strip():
                bloom_correct[level] += 1

    bloom_performance = [
        BloomPerformance(
            level=lv,  # type: ignore[arg-type]
            name=BLOOM_NAMES[lv],
            accuracy=round(100.0 * bloom_correct[lv] / bloom_total[lv], 1),
            correct=bloom_correct[lv],
            total=bloom_total[lv],
        )
        for lv in BLOOM_ORDER
        if bloom_total[lv] > 0
    ]

    # Score timeline
    score_timeline = [
        TimelinePoint(
            attempt_id=a.id,
            date=a.attempted_at,
            score=a.score,
            quiz_title=quiz_title.get(a.quiz_id, "Deleted quiz"),
            student_name=a.student_name,
        )
        for a in attempts
    ]

    # Per-quiz performance
    per_quiz: dict[int, list[float]] = defaultdict(list)
    for a in attempts:
        per_quiz[a.quiz_id].append(a.score)
    quiz_performance = [
        QuizPerformance(
            quiz_id=qid,
            title=quiz_title.get(qid, "Deleted quiz"),
            avg_score=round(sum(scores) / len(scores), 1),
            attempts=len(scores),
        )
        for qid, scores in per_quiz.items()
    ]
    quiz_performance.sort(key=lambda x: x.avg_score)

    # Heatmap: student x quiz average score
    cell_scores: dict[tuple[str, int], list[float]] = defaultdict(list)
    students: list[str] = []
    for a in attempts:
        cell_scores[(a.student_name, a.quiz_id)].append(a.score)
        if a.student_name not in students:
            students.append(a.student_name)
    heatmap_topics = [
        HeatmapTopic(quiz_id=qid, title=quiz_title.get(qid, "Deleted quiz"))
        for qid in per_quiz.keys()
    ]
    heatmap_cells = [
        HeatmapCell(
            student=student,
            quiz_id=qid,
            score=round(sum(scores) / len(scores), 1),
        )
        for (student, qid), scores in cell_scores.items()
    ]

    return AnalyticsOverview(
        num_documents=num_documents,
        num_quizzes=len(quizzes),
        num_attempts=num_attempts,
        avg_score=avg_score,
        bloom_performance=bloom_performance,
        score_timeline=score_timeline,
        quiz_performance=quiz_performance,
        heatmap_students=students,
        heatmap_topics=heatmap_topics,
        heatmap_cells=heatmap_cells,
    )
