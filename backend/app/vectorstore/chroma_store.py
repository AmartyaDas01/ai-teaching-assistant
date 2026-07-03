"""ChromaDB wrapper — one persistent collection per course.

Embeddings are computed locally via sentence-transformers (all-MiniLM-L6-v2). This model
is fixed by design: mixing embedding models in a collection corrupts similarity search,
and switching would require re-indexing every document.

The embedding model is loaded lazily on first use so importing this module (and starting
the API) stays fast and doesn't require the ~90MB download until a document is ingested
or a query is run.
"""
from __future__ import annotations

import logging

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions

from app.config import settings
from app.utils.chunker import Chunk

# Silence a noisy, harmless ChromaDB telemetry bug ("capture() takes 1 positional
# argument...") that fires even when anonymized_telemetry is disabled.
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.CRITICAL)

_client: chromadb.ClientAPI | None = None
_embedding_fn: embedding_functions.EmbeddingFunction | None = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def _get_embedding_fn() -> embedding_functions.EmbeddingFunction:
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.local_embedding_model
        )
    return _embedding_fn


def _collection(name: str):
    return _get_client().get_or_create_collection(
        name=name,
        embedding_function=_get_embedding_fn(),
        metadata={"hnsw:space": "cosine"},
    )


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
    coll = _collection(collection_name)
    ids = [f"doc{doc_id}_chunk{c.chunk_index}" for c in chunks]
    documents = [c.text for c in chunks]
    metadatas = [
        {
            "doc_id": doc_id,
            "course_id": course_id,
            "filename": filename,
            "page_number": c.page_number,
            "chunk_index": c.chunk_index,
        }
        for c in chunks
    ]
    coll.add(ids=ids, documents=documents, metadatas=metadatas)
    return len(chunks)


def similarity_search(collection_name: str, query: str, k: int = 5) -> list[dict]:
    """Return top-k relevant chunks as dicts with text + metadata + distance."""
    coll = _collection(collection_name)
    if coll.count() == 0:
        return []
    k = min(k, coll.count())
    res = coll.query(query_texts=[query], n_results=k)

    results: list[dict] = []
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]
    for text, meta, dist in zip(docs, metas, dists):
        results.append({"text": text, "metadata": meta, "distance": dist})
    return results


def get_document_chunks(
    collection_name: str, doc_id: int, limit: int = 20
) -> list[dict]:
    """Return up to `limit` chunks for a single document, ordered by chunk_index.

    Used for quiz generation, where we want broad coverage of one document rather
    than similarity to a query.
    """
    try:
        coll = _collection(collection_name)
    except Exception:
        return []
    res = coll.get(where={"doc_id": doc_id})
    docs = res.get("documents", []) or []
    metas = res.get("metadatas", []) or []
    items = [
        {"text": t, "metadata": m}
        for t, m in zip(docs, metas)
    ]
    items.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
    return items[:limit]


def delete_document(collection_name: str, doc_id: int) -> None:
    """Remove all chunks for a document from its collection."""
    try:
        coll = _collection(collection_name)
        coll.delete(where={"doc_id": doc_id})
    except Exception:
        # Collection may not exist (e.g. ingestion failed before any add) — nothing to do.
        pass
