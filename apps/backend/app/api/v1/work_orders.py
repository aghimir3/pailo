from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import WorkOrderRecord

router = APIRouter()


@router.get("", response_model=list[WorkOrderRecord])
async def list_work_orders(session: DbSession) -> list[WorkOrderRecord]:
    return await service.list_work_orders(session)


@router.get("/{work_order_id}", response_model=WorkOrderRecord)
async def get_work_order(work_order_id: UUID, session: DbSession) -> WorkOrderRecord:
    return await service.get_work_order(session, work_order_id)
