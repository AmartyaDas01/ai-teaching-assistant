"""Analytics aggregation, and the chunker the whole pipeline rests on."""
from app.utils.chunker import chunk_pages


def test_analytics_is_empty_before_anyone_takes_a_quiz(client, auth):
    r = client.get("/analytics/overview", headers=auth)
    assert r.status_code == 200
    assert r.json()["num_attempts"] == 0


def test_a_students_attempt_reaches_the_professors_analytics(client, auth, quiz):
    """This is the whole point of the share link.

    Before it existed the only person who could take a quiz was the professor who
    made it, so every number on the dashboard was self-produced.
    """
    token = quiz["share_token"]
    public = client.get(f"/public/quiz/{token}").json()
    answers = {str(q["id"]): q["options"][0] for q in public["questions"]}
    client.post(
        f"/public/quiz/{token}/submit",
        json={"student_name": "Riya", "answers": answers},
    )

    data = client.get("/analytics/overview", headers=auth).json()
    assert data["num_attempts"] >= 1
    assert data["num_quizzes"] >= 1
    assert "Riya" in data["heatmap_students"]
    assert data["bloom_performance"], "Bloom breakdown is the point of the dashboard"
    for row in data["bloom_performance"]:
        assert row["level"].startswith("L")
        assert 0 <= row["accuracy"] <= 100


def test_analytics_only_counts_the_current_users_data(client, auth, quiz):
    """A second professor must not see the first one's attempts."""
    token = quiz["share_token"]
    public = client.get(f"/public/quiz/{token}").json()
    client.post(
        f"/public/quiz/{token}/submit",
        json={
            "student_name": "Riya",
            "answers": {str(q["id"]): q["options"][0] for q in public["questions"]},
        },
    )
    other = client.post(
        "/auth/register",
        json={"name": "E", "email": "analytics-other@example.com", "password": "pw123456"},
    ).json()["token"]["access_token"]

    data = client.get(
        "/analytics/overview", headers={"Authorization": f"Bearer {other}"}
    ).json()
    assert data["num_attempts"] == 0
    assert data["num_documents"] == 0


# ── Chunker ─────────────────────────────────────────────────────────────────


def test_chunks_carry_the_page_they_came_from():
    """Page numbers are what make a citation checkable; losing them breaks grounding."""
    chunks = chunk_pages([(1, "Alpha beta gamma. " * 40), (2, "Delta epsilon. " * 40)])
    pages = {c.page_number for c in chunks}
    assert pages == {1, 2}


def test_chunk_indexes_are_sequential_across_the_document():
    chunks = chunk_pages([(1, "word " * 800), (2, "other " * 800)])
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))


def test_long_text_is_split_into_several_chunks():
    chunks = chunk_pages([(1, "sentence about sorting. " * 400)])
    assert len(chunks) > 1


def test_empty_pages_produce_no_chunks():
    assert chunk_pages([(1, "   "), (2, "")]) == []
