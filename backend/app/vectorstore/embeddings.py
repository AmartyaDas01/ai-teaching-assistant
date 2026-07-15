"""Provider-aware embedding helpers.

ChromaDB computes embeddings itself (via its embedding_function), but Qdrant does
not - it stores vectors you supply. This module is the single place that turns text
into vectors, honoring EMBEDDING_PROVIDER:

  "openai" -> text-embedding-3-small via API (1536 dims, no local model, tiny RAM)
  "local"  -> sentence-transformers all-MiniLM-L6-v2 (384 dims, ~1GB RAM)

The two produce different dimensions, so a collection is tied to whichever provider
created it - switching means re-ingesting documents.
"""
from __future__ import annotations

from functools import lru_cache

from app.config import settings

_local_model = None


def _use_openai() -> bool:
    return settings.embedding_provider == "openai" and bool(
        settings.openai_api_key.strip()
    )


@lru_cache(maxsize=1)
def _openai_client():
    from openai import OpenAI

    return OpenAI(api_key=settings.openai_api_key)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Returns one vector per input, in order."""
    if not texts:
        return []

    if _use_openai():
        resp = _openai_client().embeddings.create(
            model=settings.openai_embedding_model, input=texts
        )
        return [d.embedding for d in resp.data]

    # Local model - imported lazily so the OpenAI path never pulls in torch.
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer

        _local_model = SentenceTransformer(settings.local_embedding_model)
    return [v.tolist() for v in _local_model.encode(texts)]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]


@lru_cache(maxsize=1)
def embedding_dim() -> int:
    """Vector size for the active provider - needed to create a Qdrant collection.

    Probed once (rather than hardcoded per model) so changing the embedding model
    doesn't silently create a collection with the wrong dimensions.
    """
    return len(embed_query("dimension probe"))
