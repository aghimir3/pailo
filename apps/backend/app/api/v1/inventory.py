from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas import InventoryAlert, MaterialStockRecord
from app.modules.factory.schemas_extended import (
    AdjustStockInput,
    IssueStockInput,
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    MovementResponse,
    ReceiveStockInput,
    WastageInput,
)

router = APIRouter()


@router.get("/low-stock", response_model=list[InventoryAlert])
async def list_low_stock(session: DbSession) -> list[InventoryAlert]:
    return await service.list_low_stock_alerts(session)


@router.get("/materials", response_model=list[MaterialStockRecord])
async def list_materials_legacy(session: DbSession) -> list[MaterialStockRecord]:
    return await service.list_material_stock(session)


@router.get("/materials/full", response_model=list[MaterialResponse])
async def list_materials_full(
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = None,
) -> list[MaterialResponse]:
    return await svc.list_materials(session, page, page_size, search)


@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    payload: MaterialCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> MaterialResponse:
    result = await svc.create_material(session, payload, current_user)
    await session.commit()
    return result


@router.patch("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: UUID,
    payload: MaterialUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> MaterialResponse:
    result = await svc.update_material(session, material_id, payload, current_user)
    await session.commit()
    return result


@router.get("/movements", response_model=list[MovementResponse])
async def list_movements(
    session: DbSession,
    material_id: UUID | None = None,
    movement_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[MovementResponse]:
    return await svc.list_movements(session, material_id, movement_type, page, page_size)


@router.post("/receive", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def receive_stock(
    payload: ReceiveStockInput,
    session: DbSession,
    current_user: CurrentUser,
) -> MovementResponse:
    result = await svc.receive_stock(session, payload, current_user)
    await session.commit()
    return result


@router.post("/issue", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def issue_stock(
    payload: IssueStockInput,
    session: DbSession,
    current_user: CurrentUser,
) -> MovementResponse:
    result = await svc.issue_stock(session, payload, current_user)
    await session.commit()
    return result


@router.post("/adjust", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def adjust_stock(
    payload: AdjustStockInput,
    session: DbSession,
    current_user: CurrentUser,
) -> MovementResponse:
    result = await svc.adjust_stock(session, payload, current_user)
    await session.commit()
    return result


@router.post("/wastage", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def record_wastage(
    payload: WastageInput,
    session: DbSession,
    current_user: CurrentUser,
) -> MovementResponse:
    result = await svc.record_wastage(session, payload, current_user)
    await session.commit()
    return result
