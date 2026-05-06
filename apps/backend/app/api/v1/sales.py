"""Sales & Dispatch API routes."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.sales import (
    create_customer,
    create_sales_order,
    dispatch_order,
    get_customer,
    get_pending_orders_summary,
    get_sales_order,
    list_customers,
    list_sales_orders,
    update_customer,
)
from app.modules.sales.schemas import (
    CustomerCreate,
    CustomerUpdate,
    DispatchCreate,
    SalesOrderCreate,
)

router = APIRouter()


# ── Customers ─────────────────────────────────────────────────────


@router.get("/customers")
async def list_custs(
    session: DbSession,
    active_only: bool = True,
) -> list[dict]:
    return await list_customers(session, active_only=active_only)


@router.get("/customers/{customer_id}")
async def get_cust(customer_id: UUID, session: DbSession) -> dict:
    return await get_customer(session, customer_id)


@router.post("/customers", status_code=status.HTTP_201_CREATED)
async def create_cust(
    payload: CustomerCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_customer(session, payload.model_dump(), current_user)
    await session.commit()
    return result


@router.patch("/customers/{customer_id}")
async def update_cust(
    customer_id: UUID,
    payload: CustomerUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await update_customer(session, customer_id, payload.model_dump(exclude_unset=True), current_user)
    await session.commit()
    return result


# ── Sales Orders ──────────────────────────────────────────────────


@router.get("/orders")
async def list_orders(
    session: DbSession,
    status_filter: str | None = Query(None, alias="status"),
    customer_id: UUID | None = None,
) -> list[dict]:
    return await list_sales_orders(session, status=status_filter, customer_id=customer_id)


@router.get("/orders/pending-summary")
async def pending_summary(session: DbSession) -> dict:
    return await get_pending_orders_summary(session)


@router.get("/orders/{order_id}")
async def get_order(order_id: UUID, session: DbSession) -> dict:
    return await get_sales_order(session, order_id)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: SalesOrderCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_sales_order(
        session,
        customer_id=payload.customer_id,
        items=[item.model_dump() for item in payload.items],
        actor=current_user,
        requested_delivery_date=payload.requested_delivery_date,
        notes=payload.notes,
    )
    await session.commit()
    return result


# ── Dispatch ──────────────────────────────────────────────────────


@router.post("/orders/{order_id}/dispatch", status_code=status.HTTP_201_CREATED)
async def dispatch(
    order_id: UUID,
    payload: DispatchCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await dispatch_order(
        session,
        order_id=order_id,
        items=[item.model_dump() for item in payload.items],
        actor=current_user,
        transport_method=payload.transport_method,
        tracking_number=payload.tracking_number,
        notes=payload.notes,
    )
    await session.commit()
    return result
