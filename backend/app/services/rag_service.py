"""RAG pipeline: retrieve relevant chunks -> build grounded prompt -> LLM -> answer.

The `get_llm()` factory returns ChatOpenAI when an OpenAI key is configured, otherwise
ChatOllama (local). Switching providers requires no code changes — only .env.
"""
from __future__ import annotations

from app.config import settings
from app.schemas import ChatResponse, Source
from app.vectorstore import chroma_store

TOP_K = 5

SYSTEM_PROMPT = """You are a teaching assistant for a university CSE course. Answer the \
student's question using ONLY the provided course excerpts. Ground every claim in the \
excerpts. If the excerpts do not contain the answer, say you don't have enough \
information in the uploaded materials — do not use outside knowledge or invent facts. \
Be concise and clear, as if explaining to a student."""


class LLMUnavailableError(RuntimeError):
    """Raised when no LLM backend can be reached (no OpenAI key and Ollama is down)."""


# Runtime override set via the settings API ("auto" | "openai" | "ollama").
# Process-global (resets on restart); fine for a single-professor tool.
_provider_override: str | None = None


def set_provider_override(provider: str | None) -> None:
    global _provider_override
    _provider_override = provider if provider in ("openai", "ollama") else None


def active_provider() -> str:
    """Resolve the effective provider, honoring the override and key availability."""
    if _provider_override == "ollama":
        return "ollama"
    if _provider_override == "openai":
        return "openai" if settings.openai_api_key.strip() else "ollama"
    # auto
    return "openai" if settings.use_openai else "ollama"


def get_llm(json_mode: bool = False, temperature: float = 0.2):
    """Return a LangChain chat model based on the active provider.

    When json_mode is True, the model is constrained to emit valid JSON (used for
    structured quiz generation).
    """
    if active_provider() == "openai":
        from langchain_openai import ChatOpenAI

        model_kwargs = {}
        if json_mode:
            model_kwargs["response_format"] = {"type": "json_object"}
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=temperature,
            model_kwargs=model_kwargs,
        )

    from langchain_ollama import ChatOllama

    kwargs = {}
    if settings.ollama_num_gpu is not None:
        kwargs["num_gpu"] = settings.ollama_num_gpu
    if json_mode:
        kwargs["format"] = "json"

    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=temperature,
        **kwargs,
    )


def _build_context(chunks: list[dict]) -> str:
    """Render retrieved chunks into a numbered, citable context block."""
    blocks = []
    for i, ch in enumerate(chunks, start=1):
        meta = ch["metadata"]
        blocks.append(
            f"[Excerpt {i} — {meta['filename']}, page {meta['page_number']}]\n{ch['text']}"
        )
    return "\n\n".join(blocks)


def _to_sources(chunks: list[dict]) -> list[Source]:
    sources: list[Source] = []
    for ch in chunks:
        meta = ch["metadata"]
        snippet = ch["text"].strip().replace("\n", " ")
        sources.append(
            Source(
                doc_id=int(meta["doc_id"]),
                filename=str(meta["filename"]),
                page_number=int(meta["page_number"]),
                snippet=snippet[:240] + ("…" if len(snippet) > 240 else ""),
            )
        )
    return sources


def _retrieve(question: str, collection_names: list[str]) -> list[dict]:
    """Fan out similarity search across one or more course collections.

    A single course id yields one collection; "All courses" (no selection) yields every
    collection the user owns. Results are merged and the globally closest TOP_K chunks
    are kept. Cosine distance is comparable across collections (all use the same local
    embedding model), so one global sort is valid.
    """
    merged: list[dict] = []
    for name in collection_names:
        merged.extend(chroma_store.similarity_search(name, question, k=TOP_K))
    merged.sort(key=lambda ch: ch["distance"])
    return merged[:TOP_K]


def answer_query(question: str, collection_names: list[str]) -> ChatResponse:
    """Retrieve, generate a grounded answer, and return it with source citations."""
    chunks = _retrieve(question, collection_names)

    if not chunks:
        return ChatResponse(
            answer=(
                "I couldn't find any relevant content in the uploaded documents. "
                "Try uploading course materials first, or rephrasing your question."
            ),
            sources=[],
            provider="none",
        )

    context = _build_context(chunks)
    user_prompt = (
        f"Course excerpts:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer using only the excerpts above."
    )
    provider = active_provider()

    try:
        llm = get_llm()
        result = llm.invoke(
            [
                ("system", SYSTEM_PROMPT),
                ("human", user_prompt),
            ]
        )
        answer = result.content if hasattr(result, "content") else str(result)
    except Exception as exc:  # noqa: BLE001 - convert any LLM/backend error to a clear msg
        raise LLMUnavailableError(
            "Could not reach the language model. Set OPENAI_API_KEY in .env, or start "
            f"Ollama (ollama pull {settings.ollama_model}) and try again. "
            f"Underlying error: {exc}"
        ) from exc

    return ChatResponse(answer=answer, sources=_to_sources(chunks), provider=provider)
