"""Ingestion and grounded chat — including the collection-routing bug this suite exists to prevent."""
from tests.conftest import SAMPLE_DOC


def test_upload_ingests_and_reports_ready(client, auth, document):
    assert document["status"] == "ready"
    assert document["chunk_count"] >= 1


def test_upload_without_a_course_is_rejected(client, auth):
    """Uploading with no course used to fall back to the user's *oldest* course.

    That silently wrote the document's vectors into the wrong collection, where chat
    could never find them. Ambiguity must be an error, not a guess.
    """
    r = client.post(
        "/documents/upload",
        files={"file": ("x.txt", SAMPLE_DOC, "text/plain")},
        headers=auth,
    )
    assert r.status_code == 400
    assert "course" in r.json()["detail"].lower()


def test_unsupported_file_type_is_rejected(client, auth, course):
    r = client.post(
        f"/documents/upload?course_id={course['id']}",
        files={"file": ("virus.exe", b"MZ\x90\x00", "application/octet-stream")},
        headers=auth,
    )
    assert r.status_code == 400


def test_a_document_cannot_be_read_by_another_user(client, auth, document):
    """Ownership is enforced through the course, not just the document row."""
    other = client.post(
        "/auth/register",
        json={"name": "B", "email": "other-user@example.com", "password": "pw123456"},
    ).json()["token"]["access_token"]
    r = client.get(
        f"/documents/{document['id']}",
        headers={"Authorization": f"Bearer {other}"},
    )
    assert r.status_code == 404  # not 403: don't confirm the document exists


def test_chat_answers_from_the_document_and_cites_it(client, auth, document, course):
    r = client.post(
        "/chat/query",
        json={"question": "What does photosynthesis produce?", "course_id": course["id"]},
        headers=auth,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["sources"], "an answer with no citation is not grounded"
    assert body["sources"][0]["filename"] == "bio.txt"
    assert body["sources"][0]["page_number"] >= 1


def test_chat_with_no_course_fans_out_across_all_of_them(client, auth, document):
    """'All courses' must search every collection the user owns.

    It used to fall back to the oldest course, so a document uploaded to any other
    course was invisible and chat replied "I couldn't find any relevant content" —
    a false negative, with the document sitting right there.
    """
    r = client.post(
        "/chat/query",
        json={"question": "What does photosynthesis produce?"},  # no course_id
        headers=auth,
    )
    assert r.status_code == 200
    assert r.json()["sources"], "fan-out failed to find the document"


def test_chat_on_an_empty_course_reports_no_content(client, auth):
    empty = client.post("/courses", json={"name": "Empty"}, headers=auth).json()
    r = client.post(
        "/chat/query",
        json={"question": "anything at all?", "course_id": empty["id"]},
        headers=auth,
    )
    assert r.status_code == 200
    assert r.json()["sources"] == []


def test_chat_on_someone_elses_course_is_404(client, auth, course):
    other = client.post(
        "/auth/register",
        json={"name": "C", "email": "third-user@example.com", "password": "pw123456"},
    ).json()["token"]["access_token"]
    r = client.post(
        "/chat/query",
        json={"question": "hi", "course_id": course["id"]},
        headers={"Authorization": f"Bearer {other}"},
    )
    assert r.status_code == 404


def test_deleting_a_document_removes_its_vectors(client, auth, document, course):
    assert client.delete(f"/documents/{document['id']}", headers=auth).status_code == 204
    r = client.post(
        "/chat/query",
        json={"question": "What does photosynthesis produce?", "course_id": course["id"]},
        headers=auth,
    )
    # The row is gone; its embeddings must be gone too, or chat would cite a
    # document that no longer exists.
    assert r.json()["sources"] == []
