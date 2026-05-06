"""Purchasing module: Purchase Orders and Supplier Performance."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Material,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
    MaterialPriceHistory,
)
from app.modules.factory.service import FactoryServiceError, UserContext

MANAGER_ROLES = {"owner_admin", "factory_manager", "inventory_clerk"}


def _require_purchasing_access(actor: UserContext) -> None:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers and inventory clerks can manage purchase orders.")


async def _next_po_number(session: AsyncSession) -> str:
    year = datetime.now(UTC).year
    prefix = f"PO-{year}-"
    result = await session.execute(
        select(func.count(PurchaseOrder.id)).where(PurchaseOrder.po_number.startswith(prefix))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:06d}"


async def list_purchase_orders(
    session: AsyncSession,
    status: str | None = None,
    supplier_id: UUID | None = None,
) -> list[dict]:
    query = (
        select(PurchaseOrder, Supplier.name.label("supplier_name"))
        .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    if status:
        query = query.where(PurchaseOrder.status == status)
    if supplier_id:
        query = query.where(PurchaseOrder.supplier_id == supplier_id)

    rows = (await session.execute(query)).all()
    results = []
    for po, supplier_name in rows:
        results.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": supplier_name,
            "status": po.status,
            "order_date": po.order_date.isoformat() if po.order_date else None,
            "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
            "actual_delivery_date": po.actual_delivery_date.isoformat() if po.actual_delivery_date else None,
            "total_npr": float(po.total_npr) if po.total_npr else None,
            "version": po.version,
            "created_at": po.created_at.isoformat(),
        })
    return results


async def get_purchase_order(session: AsyncSession, po_id: UUID) -> dict:
    po = await session.get(PurchaseOrder, po_id)
    if po is None:
        raise FactoryServiceError(404, "Purchase order not found.")

    supplier = await session.get(Supplier, po.supplier_id)
    items_query = select(PurchaseOrderItem, Material.name.label("material_name")).join(
        Material, PurchaseOrderItem.material_id == Material.id
    ).where(PurchaseOrderItem.purchase_order_id == po_id)
    item_rows = (await session.execute(items_query)).all()

    items = []
    for item, material_name in item_rows:
        items.append({
            "id": item.id,
            "material_id": item.material_id,
            "material_name": material_name,
            "quantity_ordered": float(item.quantity_ordered),
            "quantity_received": float(item.quantity_received),
            "unit": item.unit,
            "unit_price_npr": float(item.unit_price_npr),
            "total_price_npr": float(item.total_price_npr),
            "notes": item.notes,
        })

    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier_name": supplier.name if supplier else None,
        "status": po.status,
        "order_date": po.order_date.isoformat() if po.order_date else None,
        "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        "actual_delivery_date": po.actual_delivery_date.isoformat() if po.actual_delivery_date else None,
        "subtotal_npr": float(po.subtotal_npr) if po.subtotal_npr else None,
        "tax_npr": float(po.tax_npr) if po.tax_npr else None,
        "total_npr": float(po.total_npr) if po.total_npr else None,
        "notes": po.notes,
        "version": po.version,
        "items": items,
        "created_at": po.created_at.isoformat(),
    }


async def create_purchase_order(
    session: AsyncSession,
    supplier_id: UUID,
    items: list[dict],
    actor: UserContext,
    order_date: date | None = None,
    expected_delivery_date: date | None = None,
    notes: str | None = None,
) -> dict:
    _require_purchasing_access(actor)

    supplier = await session.get(Supplier, supplier_id)
    if supplier is None:
        raise FactoryServiceError(404, "Supplier not found.")

    if not expected_delivery_date and supplier.usual_lead_time_days:
        from datetime import timedelta
        expected_delivery_date = date.today() + timedelta(days=supplier.usual_lead_time_days)

    po_number = await _next_po_number(session)
    subtotal = Decimal("0")

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier_id,
        status="draft",
        order_date=order_date or date.today(),
        expected_delivery_date=expected_delivery_date,
        notes=notes,
        created_by=actor.id,
        version=1,
    )
    session.add(po)
    await session.flush()

    for item_data in items:
        material = await session.get(Material, item_data["material_id"])
        if material is None:
            raise FactoryServiceError(422, f"Material {item_data['material_id']} not found.")

        qty = Decimal(str(item_data["quantity_ordered"]))
        price = Decimal(str(item_data["unit_price_npr"]))
        total = qty * price
        subtotal += total

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            material_id=item_data["material_id"],
            quantity_ordered=qty,
            unit=item_data.get("unit", material.unit_of_measure or "pcs"),
            unit_price_npr=price,
            total_price_npr=total,
            notes=item_data.get("notes"),
        )
        session.add(po_item)

    po.subtotal_npr = subtotal
    po.total_npr = subtotal + (po.tax_npr or Decimal("0"))
    await session.flush()
    await session.refresh(po)

    return await get_purchase_order(session, po.id)


async def receive_purchase_order(
    session: AsyncSession,
    po_id: UUID,
    items_received: list[dict],
    actor: UserContext,
) -> dict:
    """Record receipt of materials against a PO."""
    _require_purchasing_access(actor)

    po = await session.get(PurchaseOrder, po_id)
    if po is None:
        raise FactoryServiceError(404, "Purchase order not found.")
    if po.status in ("received", "cancelled"):
        raise FactoryServiceError(409, f"Cannot receive against a {po.status} PO.")

    all_fully_received = True

    for received in items_received:
        item = await session.get(PurchaseOrderItem, received["item_id"])
        if item is None or item.purchase_order_id != po_id:
            raise FactoryServiceError(422, f"PO item {received['item_id']} not found on this PO.")

        qty_received = Decimal(str(received["quantity_received"]))
        item.quantity_received = item.quantity_received + qty_received

        if item.quantity_received < item.quantity_ordered:
            all_fully_received = False

        # Record price history
        price_entry = MaterialPriceHistory(
            material_id=item.material_id,
            supplier_id=po.supplier_id,
            price_per_unit=item.unit_price_npr,
            effective_from=date.today(),
            source="purchase_order",
            created_by=actor.id,
        )
        session.add(price_entry)

    po.actual_delivery_date = date.today()
    po.status = "received" if all_fully_received else "partially_received"
    po.version += 1
    await session.flush()

    return await get_purchase_order(session, po.id)


async def get_overdue_deliveries(session: AsyncSession) -> list[dict]:
    today = date.today()
    query = (
        select(PurchaseOrder, Supplier.name.label("supplier_name"))
        .join(Supplier, PurchaseOrder.supplier_id == Supplier.id)
        .where(PurchaseOrder.expected_delivery_date < today)
        .where(PurchaseOrder.status.in_(["draft", "sent", "confirmed", "partially_received"]))
        .order_by(PurchaseOrder.expected_delivery_date)
    )
    rows = (await session.execute(query)).all()
    results = []
    for po, supplier_name in rows:
        days_overdue = (today - po.expected_delivery_date).days
        results.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_name": supplier_name,
            "expected_delivery_date": po.expected_delivery_date.isoformat(),
            "days_overdue": days_overdue,
            "total_npr": float(po.total_npr) if po.total_npr else None,
            "status": po.status,
        })
    return results


async def get_supplier_scorecard(session: AsyncSession, supplier_id: UUID) -> dict:
    supplier = await session.get(Supplier, supplier_id)
    if supplier is None:
        raise FactoryServiceError(404, "Supplier not found.")

    # Calculate from POs
    po_query = select(PurchaseOrder).where(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.status.in_(["received", "partially_received"]),
    )
    pos = list((await session.scalars(po_query)).all())

    total_orders = len(pos)
    on_time = sum(
        1 for po in pos
        if po.actual_delivery_date and po.expected_delivery_date
        and po.actual_delivery_date <= po.expected_delivery_date
    )
    total_spend = sum(float(po.total_npr or 0) for po in pos)

    on_time_rate = (on_time / total_orders * 100) if total_orders > 0 else None

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "total_orders": total_orders,
        "on_time_deliveries": on_time,
        "on_time_rate": on_time_rate,
        "total_spend_npr": total_spend,
        "overall_score": on_time_rate,  # simplified for now
    }
