"""Streaming chat over SSE."""
import json

import pytest

from app.services import rag_service


class _Piece:
    def __init__(self, content: str) -> None:
        self.content = content


class _StreamingLLM:
    """Emits several pieces, so the test can prove they arrive separately."""

    def stream(self, _messages):
        for word in ["Photosynthesis ", "produces ", "glucose."]:
            yield _Piece(word)

    def invoke(self, *a, **kw):
        return _Piece("unused")


@pytest.fixture
def stub_streaming_llm(monkeypatch):
    monkeypatch.setattr(rag_service, "get_llm", lambda **kw: _StreamingLLM())


def _events(client, headers, **body):
    out = []
    with client.stream("POST", "/chat/stream", json=body, headers=headers) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        for line in r.iter_lines():
            if line.startswith("data: "):
                out.append(json.loads(line[6:]))
    return out


def test_citations_arrive_before_the_answer(
    client, auth, document, stub_streaming_llm
):
    """Sources must come first.

    Retrieval has to complete before generation can start anyway, so sending the
    citations up front costs nothing - and it means the reader sees which material is
    being used *before* the prose, rather than reading an unattributed answer and
    learning its provenance afterwards.
    """
    events = _events(client, auth, question="What does photosynthesis produce?")
    kinds = [e["type"] for e in events]

    assert kinds[0] == "sources"
    assert kinds[-1] == "done"
    assert events[0]["sources"], "streamed answer with no citation is not grounded"


def test_the_answer_is_delivered_incrementally(
    client, auth, document, stub_streaming_llm
):
    events = _events(client, auth, question="What does photosynthesis produce?")
    tokens = [e["text"] for e in events if e["type"] == "token"]

    # More than one piece is the whole point: a single token would mean the response
    # was buffered and streaming bought us nothing.
    assert len(tokens) > 1
    assert "".join(tokens) == "Photosynthesis produces glucose."


def test_a_question_with_no_matching_content_streams_the_no_content_message(
    client, auth, stub_streaming_llm
):
    empty = client.post("/courses", json={"name": "Empty"}, headers=auth).json()
    events = _events(client, auth, question="anything?", course_id=empty["id"])

    assert events[0]["sources"] == []
    text = "".join(e["text"] for e in events if e["type"] == "token")
    assert "couldn't find" in text.lower()
    assert events[-1]["type"] == "done"


def test_streaming_requires_authentication(client):
    r = client.post("/chat/stream", json={"question": "hi"})
    assert r.status_code == 401


def test_an_llm_failure_is_reported_in_stream_not_as_a_status_code(
    client, auth, document, monkeypatch
):
    """Once the first byte is sent the status code is already 200 and cannot change.

    A model failure therefore has to be delivered as an in-stream error event, or the
    client would just see a truncated answer with no explanation.
    """

    def boom(*a, **kw):
        raise rag_service.LLMUnavailableError("model is down")

    monkeypatch.setattr(rag_service, "stream_answer", boom)
    events = _events(client, auth, question="What does photosynthesis produce?")

    assert events[0]["type"] == "sources"  # retrieval still succeeded
    assert events[-1]["type"] == "error"
    assert "model is down" in events[-1]["detail"]
