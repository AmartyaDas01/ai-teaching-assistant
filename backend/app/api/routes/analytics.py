"""Analytics endpoints - aggregated performance metrics for the dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas import AnalyticsOverview
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.compute_overview(db, current_user.id)
