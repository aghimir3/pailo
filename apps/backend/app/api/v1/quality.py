from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas import QualityInspectionRecord, QualitySignal
from app.modules.factory.schemas_extended import (
    DefectInput,
    DefectResponse,
    InspectionApprove,
    InspectionCreate,
    InspectionFail,
    InspectionResponse,
)

router = APIRouter()


@router.get("/signals", response_model=list[QualitySignal])
async def list_quality_signals(session: DbSession) -> list[QualitySignal]:
    return await service.list_quality_signals(session)


@router.get("/inspections", response_model=list[QualityInspectionRecord])
async def list_quality_inspections_legacy(session: DbSession) -> list[QualityInspectionRecord]:
    return await service.list_quality_inspections(session)


@router.get("/inspections/full", response_model=list[InspectionResponse])
async def list_inspections(
    session: DbSession,
    work_order_id: UUID | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[InspectionResponse]:
    return await svc.list_inspections(session, work_order_id, status_filter, page, page_size)


@router.post("/inspections", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> InspectionResponse:
    result = await svc.create_inspection(session, payload, current_user)
    await session.commit()
    return result


@router.post("/inspections/{inspection_id}/defects", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
async def add_defect(
    inspection_id: UUID,
    payload: DefectInput,
    session: DbSession,
    current_user: CurrentUser,
) -> DefectResponse:
    result = await svc.add_defect(session, inspection_id, payload, current_user)
    await session.commit()
    return result


@router.post("/inspections/{inspection_id}/approve", response_model=InspectionResponse)
async def approve_inspection(
    inspection_id: UUID,
    payload: InspectionApprove,
    session: DbSession,
    current_user: CurrentUser,
) -> InspectionResponse:
    result = await svc.approve_inspection(session, inspection_id, payload.passed_quantity, current_user)
    await session.commit()
    return result


@router.post("/inspections/{inspection_id}/fail", response_model=InspectionResponse)
async def fail_inspection(
    inspection_id: UUID,
    payload: InspectionFail,
    session: DbSession,
    current_user: CurrentUser,
) -> InspectionResponse:
    result = await svc.fail_inspection(
        session, inspection_id,
        payload.failed_quantity, payload.rework_quantity, payload.create_rework_task,
        current_user,
    )
    await session.commit()
    return result
