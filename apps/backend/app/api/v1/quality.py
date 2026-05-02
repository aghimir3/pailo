from fastapi import APIRouter

from app.modules.factory.sample_data import quality_signals
from app.modules.factory.schemas import QualitySignal

router = APIRouter()


@router.get("/signals", response_model=list[QualitySignal])
async def list_quality_signals() -> list[QualitySignal]:
    return quality_signals()
