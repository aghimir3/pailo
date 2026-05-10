from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas import InventoryAlert, MaterialStockRecord
from app.modules.factory.schemas_extended import (
    AcknowledgeAlertInput,
    AdjustStockInput,
    InventoryHealthResponse,
    IssueStockInput,
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    MovementResponse,
    PurchaseSuggestionResponse,
    ReceiveStockInput,
    StockAlertResponse,
    WastageInput,
)
from app.modules.stock_alerts import (
    acknowledge_alert,
    generate_stock_alerts,
    get_inventory_health,
    get_purchase_suggestions,
    get_unacknowledged_count,
    list_stock_alerts,
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
    search: str | None = Query(None, max_length=100),
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


# ── Purchase Suggestions ──────────────────────────────────────────────


@router.get("/purchase-suggestions", response_model=list[PurchaseSuggestionResponse])
async def list_purchase_suggestions(
    session: DbSession,
) -> list[PurchaseSuggestionResponse]:
    return await get_purchase_suggestions(session)


# ── Stock Alerts ──────────────────────────────────────────────────────


@router.get("/alerts", response_model=list[StockAlertResponse])
async def list_alerts(
    session: DbSession,
    acknowledged: bool | None = Query(None),
) -> list[StockAlertResponse]:
    return await list_stock_alerts(session, acknowledged)


@router.get("/alerts/count")
async def alert_count(session: DbSession) -> dict[str, int]:
    count = await get_unacknowledged_count(session)
    return {"unacknowledged": count}


@router.post("/alerts/generate", response_model=list[StockAlertResponse])
async def run_alert_generation(
    session: DbSession,
    current_user: CurrentUser,
) -> list[StockAlertResponse]:
    await generate_stock_alerts(session)
    await session.commit()
    # Return the full list of unacknowledged alerts
    return await list_stock_alerts(session, acknowledged=False)


@router.post("/alerts/{alert_id}/acknowledge", response_model=StockAlertResponse)
async def acknowledge(
    alert_id: UUID,
    payload: AcknowledgeAlertInput,
    session: DbSession,
    current_user: CurrentUser,
) -> StockAlertResponse:
    result = await acknowledge_alert(session, alert_id, payload, current_user)
    await session.commit()
    return result


# ── Inventory Health ──────────────────────────────────────────────────


@router.get("/health", response_model=InventoryHealthResponse)
async def inventory_health(session: DbSession) -> InventoryHealthResponse:
    return await get_inventory_health(session)
