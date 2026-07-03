"""Settings endpoints — view/switch the active LLM provider at runtime."""
from fastapi import APIRouter, Depends

from app.config import settings
from app.deps import get_current_user
from app.models.user import User
from app.schemas import LLMSettings, LLMSettingsUpdate
from app.services import rag_service

router = APIRouter(prefix="/settings", tags=["settings"])


def _current() -> LLMSettings:
    return LLMSettings(
        provider=rag_service.active_provider(),
        override=rag_service._provider_override or "auto",
        openai_available=bool(settings.openai_api_key.strip()),
        ollama_model=settings.ollama_model,
        openai_model=settings.openai_model,
    )


@router.get("/llm", response_model=LLMSettings)
def get_llm_settings(current_user: User = Depends(get_current_user)):
    return _current()


@router.put("/llm", response_model=LLMSettings)
def set_llm_settings(
    payload: LLMSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    rag_service.set_provider_override(
        None if payload.override == "auto" else payload.override
    )
    return _current()
