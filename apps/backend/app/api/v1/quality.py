from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import QualityInspectionRecord, QualitySignal

router = APIRouter()


@router.get("/signals", response_model=list[QualitySignal])
async def list_quality_signals(session: DbSession) -> list[QualitySignal]:
    return await service.list_quality_signals(session)


@router.get("/inspections", response_model=list[QualityInspectionRecord])
async def list_quality_inspections(session: DbSession) -> list[QualityInspectionRecord]:
    return await service.list_quality_inspections(session)
