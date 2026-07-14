"""Shared test fixtures.

Every test runs against a throwaway SQLite database and Chroma directory, so the suite
never touches a developer's real data and each test starts from a clean slate.

The LLM is stubbed. Tests must be deterministic and free: a real model would make the
quiz assertions flaky (it might phrase a question differently on any run) and would cost
money on every CI push. Everything *around* the model — ingestion, chunking, embedding,
retrieval, JSON parsing/repair, scoring, analytics — is exercised for real.
"""
import json
import os
import tempfile

import pytest

# Must be set before the app package is imported: config is read at import time.
_tmp = tempfile.mkdtemp(prefix="ata_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["CHROMA_PERSIST_DIR"] = f"{_tmp}/chroma"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["VECTOR_STORE"] = "chroma"
os.environ["EMBEDDING_PROVIDER"] = "local"
os.environ["JWT_SECRET_KEY"] = "test-secret"
# No mail transport -> signups auto-activate, so tests don't need an inbox.
os.environ["BREVO_API_KEY"] = ""
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""
# Skip the MX/DNS lookup: it needs network and would make the suite flaky offline.
os.environ["CHECK_EMAIL_DELIVERABILITY"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import rag_service  # noqa: E402

QUIZ_JSON = json.dumps(
    {
        "questions": [
            {
                "question": "What does photosynthesis produce?",
                "options": ["Glucose", "Iron", "Sound", "Gravity"],
                "answer": "Glucose",
                "bloom_level": "L1",
                "explanation": "The text states glucose is produced.",
            },
            {
                "question": "Where does the Calvin cycle occur?",
                "options": ["Stroma", "Nucleus", "Ribosome", "Membrane"],
                "answer": "Stroma",
                "bloom_level": "L2",
                "explanation": "It fixes carbon dioxide in the stroma.",
            },
        ]
    }
)

CHAT_ANSWER = "Photosynthesis converts light energy into glucose."

SAMPLE_DOC = (
    b"Photosynthesis converts light energy into chemical energy stored as glucose. "
    b"The Calvin cycle fixes carbon dioxide into sugar within the stroma."
)


class _FakeResult:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeLLM:
    def __init__(self, content: str) -> None:
        self._content = content

    def invoke(self, *args, **kwargs):
        return _FakeResult(self._content)


@pytest.fixture(autouse=True)
def stub_llm(monkeypatch):
    """Deterministic LLM for every test: quiz JSON in json_mode, prose otherwise."""
    monkeypatch.setattr(
        rag_service,
        "get_llm",
        lambda json_mode=False, **kw: _FakeLLM(QUIZ_JSON if json_mode else CHAT_ANSWER),
    )


@pytest.fixture(scope="session")
def client():
    # Context-manager form runs the real lifespan, which creates the tables.
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    """A registered professor: returns the Authorization header."""
    import uuid

    email = f"prof-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        "/auth/register",
        json={"name": "Prof Test", "email": email, "password": "pw123456"},
    )
    assert r.status_code == 201, r.text
    token = r.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def course(client, auth):
    r = client.post("/courses", json={"name": "Biology 101"}, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def document(client, auth, course):
    """A real ingested document: parsed, chunked, embedded and stored."""
    r = client.post(
        f"/documents/upload?course_id={course['id']}",
        files={"file": ("bio.txt", SAMPLE_DOC, "text/plain")},
        headers=auth,
    )
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["status"] == "ready", doc
    return doc


@pytest.fixture
def quiz(client, auth, document):
    r = client.post(
        "/quiz/generate",
        json={
            "document_id": document["id"],
            "num_questions": 2,
            "difficulty": "medium",
            "bloom_levels": ["L1", "L2"],
        },
        headers=auth,
    )
    assert r.status_code == 201, r.text
    return r.json()
