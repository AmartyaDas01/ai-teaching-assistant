"""FastAPI application entry point.

Registers CORS, routers, and creates DB tables on startup.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, documents, quiz
from app.config import settings
from app.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AI Teaching Assistant API",
    version="0.1.0",
    description="Phase 1 — Core RAG: document ingestion + grounded chat with citations.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    # Also accept any localhost port so Vite's dev-server port-hopping
    # (5173 -> 5174 -> ...) doesn't break the frontend in local dev.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(quiz.router)


@app.get("/health", tags=["health"])
def health() -> dict:
    return {
        "status": "ok",
        "llm_provider": "openai" if settings.use_openai else "ollama",
        "embedding_model": settings.local_embedding_model,
    }
