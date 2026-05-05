from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas import WorkOrderRecord
from app.modules.factory.schemas_extended import (
    WorkOrderCreate,
    WorkOrderCreateResponse,
    WorkOrderUpdate,
)

router = APIRouter()


@router.get("", response_model=list[WorkOrderRecord])
async def list_work_orders(session: DbSession) -> list[WorkOrderRecord]:
    return await service.list_work_orders(session)


@router.get("/{work_order_id}", response_model=WorkOrderRecord)
async def get_work_order(work_order_id: UUID, session: DbSession) -> WorkOrderRecord:
    return await service.get_work_order(session, work_order_id)


@router.post("", response_model=WorkOrderCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> WorkOrderCreateResponse:
    result = await svc.create_work_order(session, payload, current_user)
    await session.commit()
    return result


@router.patch("/{work_order_id}", response_model=WorkOrderCreateResponse)
async def update_work_order(
    work_order_id: UUID,
    payload: WorkOrderUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> WorkOrderCreateResponse:
    result = await svc.update_work_order(session, work_order_id, payload, current_user)
    await session.commit()
    return result


@router.post("/{work_order_id}/generate-tasks", status_code=status.HTTP_201_CREATED)
async def generate_tasks(
    work_order_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> list[dict[str, object]]:
    result = await svc.generate_work_order_tasks(session, work_order_id, current_user)
    await session.commit()
    return result


@router.get("/{work_order_id}/material-requirements")
async def material_requirements(
    work_order_id: UUID,
    session: DbSession,
) -> list[dict[str, object]]:
    return await svc.get_material_requirements(session, work_order_id)
