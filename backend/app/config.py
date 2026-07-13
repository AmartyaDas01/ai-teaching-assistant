"""Application settings loaded from environment / .env file.

Uses pydantic-settings so every value in .env.example is typed and documented here.
The .env is read from the repo root (one level above backend/).
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# repo root = two levels up from this file (backend/app/config.py -> repo root)
ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    llm_provider: str = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    # Force CPU inference by setting to 0 (workaround for Ollama's Metal backend
    # crashing on older macOS). Leave unset to let Ollama use the GPU.
    ollama_num_gpu: int | None = None

    # Embeddings — "local" (sentence-transformers, needs ~1GB RAM) or "openai"
    # (API-based, tiny/no local footprint so the backend fits a free tier).
    embedding_provider: str = "local"
    local_embedding_model: str = "all-MiniLM-L6-v2"
    openai_embedding_model: str = "text-embedding-3-small"

    # Database
    database_url: str = "sqlite:///./app.db"

    # Vector store — "chroma" (local, on-disk) or "qdrant" (remote, survives
    # restarts on hosts without a persistent disk).
    vector_store: str = "chroma"
    chroma_persist_dir: str = "./chroma_data"
    # Qdrant (only used when vector_store="qdrant"). Empty URL => in-memory.
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    # Auth
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Storage
    storage_provider: str = "local"
    upload_dir: str = "./uploads"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Email (signup verification). Gmail: use an App Password, not your login
    # password (requires 2-Step Verification to be on).
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""  # e.g. you@gmail.com
    smtp_password: str = ""  # 16-char Gmail App Password
    smtp_from_name: str = "AI Teaching Assistant"
    verification_token_expire_hours: int = 24
    # Reject addresses whose domain has no MX record (catches @gmial.con etc.).
    check_email_deliverability: bool = True

    @property
    def email_enabled(self) -> bool:
        """Verification is only enforced when SMTP is actually configured.

        Without credentials the app stays zero-config: signups are auto-verified so
        local development and demos keep working instead of dead-ending on an email
        that can never arrive.
        """
        return bool(self.smtp_user.strip() and self.smtp_password.strip())

    @property
    def use_openai(self) -> bool:
        """OpenAI is used only when explicitly selected AND a key is present.

        With the default llm_provider='openai', a missing key transparently falls back
        to Ollama so the app runs with zero configuration.
        """
        if self.llm_provider == "ollama":
            return False
        return bool(self.openai_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
