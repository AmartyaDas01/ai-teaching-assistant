"""Vector store selection.

`store` is whichever backend VECTOR_STORE names. Both expose the same interface
(add_chunks / similarity_search / get_document_chunks / delete_document /
delete_collection), so callers import `store` and never care which is active.

  "chroma" (default) - local, on-disk. Fine for dev and hosts with a real disk.
  "qdrant"           - remote. Survives restarts on hosts with no persistent disk
                       (free tiers), where Chroma's on-disk data would be wiped.
"""
from app.config import settings

if settings.vector_store == "qdrant":
    from app.vectorstore import qdrant_store as store
else:
    from app.vectorstore import chroma_store as store

__all__ = ["store"]
