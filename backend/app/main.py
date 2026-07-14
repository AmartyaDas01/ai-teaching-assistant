"""FastAPI application entry point.

Registers CORS, routers, and creates DB tables on startup.
"""
import logging
from contextlib import asynccontextmanager

# Uvicorn only configures its own loggers, so the app's loggers fall back to Python's
# "handler of last resort", which emits WARNING and above and drops INFO entirely.
# That silently hid the useful lines — "Verification email sent to ... via brevo" —
# leaving only failures visible. Give the root logger a real handler at INFO.
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    analytics,
    auth,
    chat,
    courses,
    documents,
    public,
    quiz,
    settings as settings_routes,
)
from app.config import settings
from app.db import init_db


def _log_email_config() -> None:
    """Say plainly, at boot, whether verification emails can actually be sent.

    A half-configured mail setup otherwise fails silently: signups just quietly
    auto-activate and no email is ever attempted, which looks like the feature is
    broken rather than switched off.
    """
    if settings.brevo_enabled:
        logging.info(
            "Email: Brevo enabled (sender: %s)", settings.email_from_address
        )
    elif settings.smtp_enabled:
        logging.warning(
            "Email: using SMTP. Most PaaS hosts block outbound SMTP ports — if sends "
            "fail with 'Network is unreachable', switch to BREVO_API_KEY."
        )
    elif settings.brevo_api_key.strip() and not settings.email_from_address:
        logging.error(
            "Email DISABLED: BREVO_API_KEY is set but EMAIL_FROM is not. Set EMAIL_FROM "
            "to the sender address you verified in Brevo. Signups will auto-activate "
            "until you do."
        )
    else:
        logging.warning(
            "Email DISABLED: no BREVO_API_KEY or SMTP credentials. Signups will "
            "auto-activate without verification."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _log_email_config()
    yield


app = FastAPI(
    title="AI Teaching Assistant API",
    version="0.1.0",
    description="Phase 1 — Core RAG: document ingestion + grounded chat with citations.",
    lifespan=lifespan,
)

# Normalize the configured origin: tolerate a bare host (e.g. from Render's
# fromService, which has no scheme) by defaulting it to https://.
_frontend_origin = settings.frontend_origin.strip().rstrip("/")
if _frontend_origin and not _frontend_origin.startswith("http"):
    _frontend_origin = f"https://{_frontend_origin}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin] if _frontend_origin else [],
    # Also accept: any localhost port (Vite's dev-server port-hopping
    # 5173 -> 5174 -> ...), and any *.onrender.com origin so the Render-hosted
    # frontend works without hand-wiring its exact subdomain here.
    allow_origin_regex=(
        r"http://(localhost|127\.0\.0\.1):\d+"
        r"|https://[a-z0-9-]+\.onrender\.com"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(analytics.router)
app.include_router(public.router)
app.include_router(settings_routes.router)


class _SuppressHealthAccessLogs(logging.Filter):
    """Drop access-log lines for /health.

    Render probes the health endpoint every few seconds, and an uptime pinger hits it
    too. Left alone, those lines bury everything else — the logs become useless for
    finding the one message you actually need (an SMTP failure, a traceback).
    Only the access log is filtered; real errors still come through.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        return "GET /health" not in record.getMessage()


logging.getLogger("uvicorn.access").addFilter(_SuppressHealthAccessLogs())


@app.get("/health", tags=["health"])
def health() -> dict:
    """Report the *active* providers, so a deploy can be checked at a glance.

    This previously always reported the local embedding model, which hid the case
    where a misconfigured deploy silently fell back to a different provider.
    """
    openai_embeddings = (
        settings.embedding_provider == "openai" and bool(settings.openai_api_key.strip())
    )
    return {
        "status": "ok",
        "llm_provider": "openai" if settings.use_openai else "ollama",
        "embedding_provider": "openai" if openai_embeddings else "local",
        "embedding_model": (
            settings.openai_embedding_model
            if openai_embeddings
            else settings.local_embedding_model
        ),
        "vector_store": settings.vector_store,
    }
