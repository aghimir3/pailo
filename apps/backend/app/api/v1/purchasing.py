"""Purchasing API routes."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.purchasing import (
    create_purchase_order,
    get_overdue_deliveries,
    get_purchase_order,
    get_supplier_scorecard,
    list_purchase_orders,
    receive_purchase_order,
)
from app.modules.purchasing.schemas import PurchaseOrderCreate, PurchaseOrderReceive

router = APIRouter()


@router.get("")
async def list_pos(
    session: DbSession,
    status_filter: str | None = Query(None, alias="status"),
    supplier_id: UUID | None = None,
) -> list[dict]:
    return await list_purchase_orders(session, status=status_filter, supplier_id=supplier_id)


@router.get("/overdue")
async def list_overdue(session: DbSession) -> list[dict]:
    return await get_overdue_deliveries(session)


@router.get("/{po_id}")
async def get_po(po_id: UUID, session: DbSession) -> dict:
    return await get_purchase_order(session, po_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_po(
    payload: PurchaseOrderCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_purchase_order(
        session,
        supplier_id=payload.supplier_id,
        items=[item.model_dump() for item in payload.items],
        actor=current_user,
        order_date=payload.order_date,
        expected_delivery_date=payload.expected_delivery_date,
        notes=payload.notes,
    )
    await session.commit()
    return result


@router.post("/{po_id}/receive", status_code=status.HTTP_200_OK)
async def receive_po(
    po_id: UUID,
    payload: PurchaseOrderReceive,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await receive_purchase_order(
        session,
        po_id=po_id,
        items_received=[item.model_dump() for item in payload.items],
        actor=current_user,
    )
    await session.commit()
    return result


@router.get("/suppliers/{supplier_id}/scorecard")
async def supplier_scorecard(supplier_id: UUID, session: DbSession) -> dict:
    return await get_supplier_scorecard(session, supplier_id)
