"""Quiz generation, the LLM-output repair path, scoring, and the public student link."""
import pytest

from app.services.quiz_service import (
    QuizGenerationError,
    _match_answer,
    _normalize_bloom,
    _validate_questions,
)


def test_generate_produces_bloom_tagged_questions(quiz):
    assert len(quiz["questions"]) >= 1
    for q in quiz["questions"]:
        assert q["bloom_level"] in {"L1", "L2", "L3", "L4", "L5", "L6"}
        assert len(q["options"]) >= 2


def test_generated_quiz_never_leaks_the_answer_key(quiz):
    for q in quiz["questions"]:
        assert "correct_answer" not in q
        assert "explanation" not in q


def test_submitting_scores_the_attempt(client, auth, quiz):
    answers = {str(q["id"]): q["options"][0] for q in quiz["questions"]}
    r = client.post(
        f"/quiz/{quiz['id']}/submit",
        json={"student_name": "Alice", "answers": answers},
        headers=auth,
    )
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["score"] <= 100
    assert body["total"] == len(quiz["questions"])
    # Review mode reveals the key - that's the point of it.
    assert body["graded"][0]["correct_answer"]


def test_a_quiz_cannot_be_generated_from_someone_elses_document(client, document):
    other = client.post(
        "/auth/register",
        json={"name": "D", "email": "quiz-other@example.com", "password": "pw123456"},
    ).json()["token"]["access_token"]
    r = client.post(
        "/quiz/generate",
        json={
            "document_id": document["id"],
            "num_questions": 2,
            "difficulty": "medium",
            "bloom_levels": ["L1"],
        },
        headers={"Authorization": f"Bearer {other}"},
    )
    assert r.status_code == 422  # QuizGenerationError -> "Document not found."


# ── The repair layer: LLM output is untrusted input ──────────────────────────


def test_answer_given_as_a_letter_is_resolved_to_the_option():
    options = ["Glucose", "Iron", "Sound", "Gravity"]
    assert _match_answer("A", options) == "Glucose"
    assert _match_answer("c) Sound", options) == "Sound"
    assert _match_answer("2", options) == "Iron"


def test_answer_that_matches_nothing_is_rejected():
    assert _match_answer("Photosynthesis", ["Glucose", "Iron"]) is None


def test_bloom_level_is_normalized_from_loose_model_output():
    allowed = ["L1", "L2", "L3"]
    assert _normalize_bloom("level 2", allowed) == "L2"
    assert _normalize_bloom("Understand", allowed) == "L2"
    # Out of the requested range -> clamped, never invented.
    assert _normalize_bloom("L6", allowed) == "L1"


def test_a_question_whose_answer_is_not_one_of_its_options_is_dropped():
    """A model sometimes states an answer that isn't among the options it wrote.

    Storing that would give a student an unanswerable question, so it is discarded
    rather than persisted.
    """
    data = {
        "questions": [
            {
                "question": "Good one?",
                "options": ["A", "B"],
                "answer": "A",
                "bloom_level": "L1",
            },
            {
                "question": "Broken one?",
                "options": ["A", "B"],
                "answer": "Z",  # not an option
                "bloom_level": "L1",
            },
        ]
    }
    valid = _validate_questions(data, ["L1"])
    assert len(valid) == 1
    assert valid[0]["question_text"] == "Good one?"


def test_output_with_no_usable_question_raises_rather_than_saving_an_empty_quiz():
    with pytest.raises(QuizGenerationError):
        _validate_questions({"questions": [{"question": "", "options": []}]}, ["L1"])


# ── Public student link ──────────────────────────────────────────────────────


def test_a_student_can_take_a_quiz_with_no_account(client, quiz):
    token = quiz["share_token"]
    r = client.get(f"/public/quiz/{token}")  # note: no Authorization header
    assert r.status_code == 200
    assert len(r.json()["questions"]) == len(quiz["questions"])


def test_the_public_quiz_never_exposes_the_answer_key(client, quiz):
    body = client.get(f"/public/quiz/{quiz['share_token']}").text
    assert "correct_answer" not in body
    assert "explanation" not in body
    assert "share_token" not in body  # nor any internal handle


def test_a_students_attempt_is_scored_and_recorded(client, quiz):
    token = quiz["share_token"]
    public = client.get(f"/public/quiz/{token}").json()
    answers = {str(q["id"]): q["options"][0] for q in public["questions"]}
    r = client.post(
        f"/public/quiz/{token}/submit",
        json={"student_name": "Riya", "answers": answers},
    )
    assert r.status_code == 200
    assert "score" in r.json()


def test_an_unknown_share_link_is_404(client):
    assert client.get("/public/quiz/does-not-exist").status_code == 404


def test_a_student_must_give_a_name(client, quiz):
    r = client.post(
        f"/public/quiz/{quiz['share_token']}/submit",
        json={"student_name": "", "answers": {}},
    )
    assert r.status_code == 422
