"""Sales module: Customers, Sales Orders, Dispatch."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Customer,
    DispatchItem,
    DispatchRecord,
    ProductStyle,
    SalesOrder,
    SalesOrderItem,
)
from app.modules.factory.service import FactoryServiceError, UserContext

SALES_ROLES = {"owner_admin", "factory_manager", "office_admin"}


def _require_sales_access(actor: UserContext) -> None:
    if actor.role not in SALES_ROLES:
        raise FactoryServiceError(403, "No access to sales management.")


# ── Customers ─────────────────────────────────────────────────────────

async def _next_customer_code(session: AsyncSession) -> str:
    result = await session.execute(select(func.count(Customer.id)))
    count = result.scalar() or 0
    return f"CUST-{count + 1:04d}"


async def list_customers(session: AsyncSession, active_only: bool = True) -> list[dict]:
    query = select(Customer).order_by(Customer.name)
    if active_only:
        query = query.where(Customer.is_active.is_(True))
    customers = list((await session.scalars(query)).all())
    return [_customer_to_dict(c) for c in customers]


async def get_customer(session: AsyncSession, customer_id: UUID) -> dict:
    customer = await session.get(Customer, customer_id)
    if customer is None:
        raise FactoryServiceError(404, "Customer not found.")
    return _customer_to_dict(customer)


async def create_customer(
    session: AsyncSession,
    name: str,
    actor: UserContext,
    **kwargs,
) -> dict:
    _require_sales_access(actor)
    code = await _next_customer_code(session)
    customer = Customer(
        customer_code=code,
        name=name,
        type=kwargs.get("type", "wholesale"),
        phone=kwargs.get("phone"),
        email=kwargs.get("email"),
        address=kwargs.get("address"),
        city=kwargs.get("city"),
        credit_limit_npr=kwargs.get("credit_limit_npr"),
        payment_terms_days=kwargs.get("payment_terms_days", 30),
        notes=kwargs.get("notes"),
    )
    session.add(customer)
    await session.flush()
    return _customer_to_dict(customer)


async def update_customer(
    session: AsyncSession, customer_id: UUID, actor: UserContext, **kwargs
) -> dict:
    _require_sales_access(actor)
    customer = await session.get(Customer, customer_id)
    if customer is None:
        raise FactoryServiceError(404, "Customer not found.")

    for field in ("name", "type", "phone", "email", "address", "city", "credit_limit_npr", "payment_terms_days", "notes", "is_active"):
        if field in kwargs and kwargs[field] is not None:
            setattr(customer, field, kwargs[field])

    await session.flush()
    return _customer_to_dict(customer)


def _customer_to_dict(c: Customer) -> dict:
    return {
        "id": c.id,
        "customer_code": c.customer_code,
        "name": c.name,
        "type": c.type,
        "phone": c.phone,
        "email": c.email,
        "address": c.address,
        "city": c.city,
        "credit_limit_npr": float(c.credit_limit_npr) if c.credit_limit_npr else None,
        "payment_terms_days": c.payment_terms_days,
        "notes": c.notes,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat(),
    }


# ── Sales Orders ──────────────────────────────────────────────────────

async def _next_order_number(session: AsyncSession) -> str:
    year = datetime.now(UTC).year
    prefix = f"SO-{year}-"
    result = await session.execute(
        select(func.count(SalesOrder.id)).where(SalesOrder.order_number.startswith(prefix))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:06d}"


async def list_sales_orders(
    session: AsyncSession,
    status: str | None = None,
    customer_id: UUID | None = None,
) -> list[dict]:
    query = (
        select(SalesOrder, Customer.name.label("customer_name"))
        .join(Customer, SalesOrder.customer_id == Customer.id)
        .order_by(SalesOrder.created_at.desc())
    )
    if status:
        query = query.where(SalesOrder.status == status)
    if customer_id:
        query = query.where(SalesOrder.customer_id == customer_id)

    rows = (await session.execute(query)).all()
    return [
        {
            "id": so.id,
            "order_number": so.order_number,
            "customer_id": so.customer_id,
            "customer_name": customer_name,
            "status": so.status,
            "order_date": so.order_date.isoformat() if so.order_date else None,
            "promised_delivery_date": so.promised_delivery_date.isoformat() if so.promised_delivery_date else None,
            "total_npr": float(so.total_npr),
            "version": so.version,
            "created_at": so.created_at.isoformat(),
        }
        for so, customer_name in rows
    ]


async def get_sales_order(session: AsyncSession, order_id: UUID) -> dict:
    so = await session.get(SalesOrder, order_id)
    if so is None:
        raise FactoryServiceError(404, "Sales order not found.")

    customer = await session.get(Customer, so.customer_id)
    items_query = (
        select(SalesOrderItem, ProductStyle.name.label("style_name"), ProductStyle.style_code)
        .join(ProductStyle, SalesOrderItem.style_id == ProductStyle.id)
        .where(SalesOrderItem.sales_order_id == order_id)
    )
    item_rows = (await session.execute(items_query)).all()

    items = []
    for item, style_name, style_code in item_rows:
        items.append({
            "id": item.id,
            "style_id": item.style_id,
            "style_name": style_name,
            "style_code": style_code,
            "color": item.color,
            "size": item.size,
            "quantity_ordered": item.quantity_ordered,
            "quantity_dispatched": item.quantity_dispatched,
            "unit_price_npr": float(item.unit_price_npr),
            "total_price_npr": float(item.total_price_npr),
        })

    return {
        "id": so.id,
        "order_number": so.order_number,
        "customer_id": so.customer_id,
        "customer_name": customer.name if customer else None,
        "status": so.status,
        "order_date": so.order_date.isoformat() if so.order_date else None,
        "requested_delivery_date": so.requested_delivery_date.isoformat() if so.requested_delivery_date else None,
        "promised_delivery_date": so.promised_delivery_date.isoformat() if so.promised_delivery_date else None,
        "actual_dispatch_date": so.actual_dispatch_date.isoformat() if so.actual_dispatch_date else None,
        "subtotal_npr": float(so.subtotal_npr),
        "discount_npr": float(so.discount_npr) if so.discount_npr else 0,
        "tax_npr": float(so.tax_npr) if so.tax_npr else 0,
        "total_npr": float(so.total_npr),
        "notes": so.notes,
        "version": so.version,
        "items": items,
        "created_at": so.created_at.isoformat(),
    }


async def create_sales_order(
    session: AsyncSession,
    customer_id: UUID,
    items: list[dict],
    actor: UserContext,
    requested_delivery_date: date | None = None,
    notes: str | None = None,
) -> dict:
    _require_sales_access(actor)

    customer = await session.get(Customer, customer_id)
    if customer is None:
        raise FactoryServiceError(404, "Customer not found.")

    order_number = await _next_order_number(session)
    subtotal = Decimal("0")

    so = SalesOrder(
        order_number=order_number,
        customer_id=customer_id,
        status="pending",
        order_date=date.today(),
        requested_delivery_date=requested_delivery_date,
        subtotal_npr=Decimal("0"),
        total_npr=Decimal("0"),
        notes=notes,
        created_by=actor.id,
        version=1,
    )
    session.add(so)
    await session.flush()

    for item_data in items:
        qty = item_data["quantity_ordered"]
        price = Decimal(str(item_data["unit_price_npr"]))
        total = qty * price
        subtotal += total

        so_item = SalesOrderItem(
            sales_order_id=so.id,
            style_id=item_data["style_id"],
            color=item_data.get("color"),
            size=item_data.get("size"),
            quantity_ordered=qty,
            unit_price_npr=price,
            total_price_npr=total,
        )
        session.add(so_item)

    so.subtotal_npr = subtotal
    so.total_npr = subtotal
    await session.flush()

    return await get_sales_order(session, so.id)


async def dispatch_order(
    session: AsyncSession,
    sales_order_id: UUID,
    items: list[dict],
    actor: UserContext,
    transport_method: str | None = None,
    tracking_number: str | None = None,
    notes: str | None = None,
) -> dict:
    _require_sales_access(actor)

    so = await session.get(SalesOrder, sales_order_id)
    if so is None:
        raise FactoryServiceError(404, "Sales order not found.")
    if so.status in ("dispatched", "delivered", "cancelled"):
        raise FactoryServiceError(409, f"Cannot dispatch a {so.status} order.")

    # Generate dispatch number
    year = datetime.now(UTC).year
    prefix = f"DSP-{year}-"
    result = await session.execute(
        select(func.count(DispatchRecord.id)).where(DispatchRecord.dispatch_number.startswith(prefix))
    )
    count = result.scalar() or 0
    dispatch_number = f"{prefix}{count + 1:06d}"

    dispatch = DispatchRecord(
        dispatch_number=dispatch_number,
        sales_order_id=sales_order_id,
        dispatched_by=actor.id,
        transport_method=transport_method,
        tracking_number=tracking_number,
        notes=notes,
    )
    session.add(dispatch)
    await session.flush()

    all_dispatched = True
    for item_data in items:
        so_item = await session.get(SalesOrderItem, item_data["sales_order_item_id"])
        if so_item is None or so_item.sales_order_id != sales_order_id:
            raise FactoryServiceError(422, "Sales order item not found.")

        qty = item_data["quantity"]
        so_item.quantity_dispatched += qty

        if so_item.quantity_dispatched < so_item.quantity_ordered:
            all_dispatched = False

        dispatch_item = DispatchItem(
            dispatch_id=dispatch.id,
            sales_order_item_id=so_item.id,
            style_id=so_item.style_id,
            color=so_item.color,
            size=so_item.size,
            quantity=qty,
        )
        session.add(dispatch_item)

    so.status = "dispatched" if all_dispatched else "partially_dispatched"
    so.actual_dispatch_date = date.today()
    so.version += 1
    await session.flush()

    return {
        "dispatch_id": dispatch.id,
        "dispatch_number": dispatch_number,
        "sales_order_id": sales_order_id,
        "status": so.status,
    }


async def get_pending_orders_summary(session: AsyncSession) -> dict:
    pending_q = select(SalesOrder).where(SalesOrder.status.in_(["pending", "confirmed"]))
    orders = list((await session.scalars(pending_q)).all())

    today = date.today()
    overdue = [o for o in orders if o.promised_delivery_date and o.promised_delivery_date < today]
    due_this_week = [
        o for o in orders
        if o.promised_delivery_date and today <= o.promised_delivery_date <= today + datetime.resolution * 7
    ]

    return {
        "total_pending": len(orders),
        "total_value_npr": sum(float(o.total_npr) for o in orders),
        "overdue_count": len(overdue),
        "overdue_value_npr": sum(float(o.total_npr) for o in overdue),
        "due_this_week": len(due_this_week),
    }
