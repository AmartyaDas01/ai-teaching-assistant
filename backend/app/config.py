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

    # Embeddings (local, fixed)
    embedding_provider: str = "local"
    local_embedding_model: str = "all-MiniLM-L6-v2"

    # Database
    database_url: str = "sqlite:///./app.db"

    # Vector store
    chroma_persist_dir: str = "./chroma_data"

    # Storage
    storage_provider: str = "local"
    upload_dir: str = "./uploads"

    # CORS
    frontend_origin: str = "http://localhost:5173"

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
