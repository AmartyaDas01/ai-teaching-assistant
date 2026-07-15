"""Qdrant vector store - one collection per course.

Drop-in alternative to chroma_store (same function signatures), selected with
VECTOR_STORE=qdrant. Vectors live in a remote Qdrant instance rather than on local
disk, so they survive restarts on hosts with no persistent disk (e.g. free tiers)
- which is the whole reason this backend exists.

Set QDRANT_URL (+ QDRANT_API_KEY for Qdrant Cloud). With neither set, an in-memory
client is used, which is handy for tests but persists nothing.
"""
from __future__ import annotations

import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from app.config import settings
from app.utils.chunker import Chunk
from app.vectorstore.embeddings import embed_query, embed_texts, embedding_dim

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        url = settings.qdrant_url.strip()
        if not url or url == ":memory:":
            _client = QdrantClient(":memory:")
        else:
            _client = QdrantClient(
                url=url, api_key=settings.qdrant_api_key.strip() or None
            )
    return _client


def _ensure_collection(name: str) -> None:
    client = _get_client()
    if not client.collection_exists(name):
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(
                size=embedding_dim(), distance=Distance.COSINE
            ),
        )
    # A real Qdrant server refuses to filter on an un-indexed payload field (400:
    # "Index required but not found"), which get_document_chunks and delete_document
    # both do on doc_id. The in-memory client is lenient, so this only shows up
    # against a live cluster. Creating an existing index is a no-op, so this is safe
    # to call every time (and also back-fills collections made before this fix).
    try:
        client.create_payload_index(
            collection_name=name,
            field_name="doc_id",
            field_schema=PayloadSchemaType.INTEGER,
        )
    except Exception:  # noqa: BLE001 - index already present, or a transient race
        pass


def _doc_filter(doc_id: int) -> Filter:
    return Filter(
        must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
    )


def _point_id(doc_id: int, chunk_index: int) -> str:
    """Deterministic UUID: re-ingesting a document overwrites rather than duplicates.

    Qdrant point ids must be int or UUID (Chroma allowed arbitrary strings), so the
    old "doc{id}_chunk{i}" key is hashed into a stable UUID.
    """
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"doc{doc_id}_chunk{chunk_index}"))


def add_chunks(
    collection_name: str,
    doc_id: int,
    course_id: int,
    filename: str,
    chunks: list[Chunk],
) -> int:
    """Embed and store chunks. Returns the number of chunks added."""
    if not chunks:
        return 0
    _ensure_collection(collection_name)
    vectors = embed_texts([c.text for c in chunks])
    points = [
        PointStruct(
            id=_point_id(doc_id, c.chunk_index),
            vector=vector,
            payload={
                "text": c.text,
                "doc_id": doc_id,
                "course_id": course_id,
                "filename": filename,
                "page_number": c.page_number,
                "chunk_index": c.chunk_index,
            },
        )
        for c, vector in zip(chunks, vectors)
    ]
    _get_client().upsert(collection_name=collection_name, points=points)
    return len(points)


def similarity_search(collection_name: str, query: str, k: int = 5) -> list[dict]:
    """Return top-k relevant chunks as dicts with text + metadata + distance."""
    client = _get_client()
    if not client.collection_exists(collection_name):
        return []
    res = client.query_points(
        collection_name=collection_name,
        query=embed_query(query),
        limit=k,
        with_payload=True,
    )
    results: list[dict] = []
    for point in res.points:
        payload = dict(point.payload or {})
        text = payload.pop("text", "")
        # Qdrant returns cosine *similarity* (1.0 = identical); callers rank by
        # distance ascending, matching Chroma's cosine distance.
        results.append(
            {"text": text, "metadata": payload, "distance": 1.0 - float(point.score)}
        )
    return results


def get_document_chunks(
    collection_name: str, doc_id: int, limit: int = 20
) -> list[dict]:
    """Return up to `limit` chunks for a single document, ordered by chunk_index."""
    client = _get_client()
    if not client.collection_exists(collection_name):
        return []
    points, _ = client.scroll(
        collection_name=collection_name,
        scroll_filter=_doc_filter(doc_id),
        limit=limit,
        with_payload=True,
    )
    items: list[dict] = []
    for point in points:
        payload = dict(point.payload or {})
        text = payload.pop("text", "")
        items.append({"text": text, "metadata": payload})
    items.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
    return items[:limit]


def delete_document(collection_name: str, doc_id: int) -> None:
    """Remove all chunks for a document from its collection."""
    client = _get_client()
    if not client.collection_exists(collection_name):
        return
    client.delete(
        collection_name=collection_name,
        points_selector=FilterSelector(filter=_doc_filter(doc_id)),
    )


def delete_collection(collection_name: str) -> None:
    """Drop an entire course collection (used when a course is deleted)."""
    client = _get_client()
    try:
        if client.collection_exists(collection_name):
            client.delete_collection(collection_name)
    except Exception:
        # Collection may not exist (ingestion failed before any add) - nothing to do.
        pass
