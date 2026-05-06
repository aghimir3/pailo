"""Cycle Count & Inventory Extensions API routes."""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.api.dependencies import CurrentUser, DbSession
from app.modules.inventory_ext import (
    approve_cycle_count,
    get_available_stock,
    get_cycle_count,
    get_purchase_suggestions,
    list_cycle_counts,
    record_count_item,
    reserve_materials_for_work_order,
    start_cycle_count,
)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────


class StartCycleCountRequest(BaseModel):
    count_type: str = "full"
    category_filter: str | None = None


class RecordCountItemRequest(BaseModel):
    counted_quantity: Decimal = Field(ge=0)
    notes: str | None = None


class ApproveCycleCountRequest(BaseModel):
    approved_item_ids: list[UUID] = Field(min_length=1)


# ── Material Reservations ─────────────────────────────────────────


@router.get("/materials/{material_id}/available-stock")
async def check_available(material_id: UUID, session: DbSession) -> dict:
    qty = await get_available_stock(session, material_id)
    return {"material_id": str(material_id), "available_quantity": float(qty)}


@router.post("/work-orders/{work_order_id}/reserve-materials", status_code=status.HTTP_201_CREATED)
async def reserve_for_wo(
    work_order_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await reserve_materials_for_work_order(session, work_order_id, current_user)
    await session.commit()
    return result


@router.get("/purchase-suggestions")
async def purchase_suggestions(session: DbSession) -> list[dict]:
    return await get_purchase_suggestions(session)


# ── Cycle Counts ──────────────────────────────────────────────────


@router.get("/cycle-counts")
async def list_counts(session: DbSession) -> list[dict]:
    return await list_cycle_counts(session)


@router.get("/cycle-counts/{count_id}")
async def get_count(count_id: UUID, session: DbSession) -> dict:
    return await get_cycle_count(session, count_id)


@router.post("/cycle-counts", status_code=status.HTTP_201_CREATED)
async def start_count(
    payload: StartCycleCountRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await start_cycle_count(
        session,
        count_type=payload.count_type,
        actor=current_user,
        category_filter=payload.category_filter,
    )
    await session.commit()
    return result


@router.post("/cycle-counts/items/{item_id}/record")
async def record_item(
    item_id: UUID,
    payload: RecordCountItemRequest,
    session: DbSession,
) -> dict:
    result = await record_count_item(session, item_id, payload.counted_quantity, payload.notes)
    await session.commit()
    return result


@router.post("/cycle-counts/{count_id}/approve")
async def approve_count(
    count_id: UUID,
    payload: ApproveCycleCountRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await approve_cycle_count(session, count_id, payload.approved_item_ids, current_user)
    await session.commit()
    return result
