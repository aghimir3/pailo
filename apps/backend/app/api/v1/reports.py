from fastapi import APIRouter

from app.modules.factory.sample_data import dashboard_response
from app.modules.factory.schemas import DashboardResponse

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard() -> DashboardResponse:
    return dashboard_response()
