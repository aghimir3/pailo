"""Inventory extensions: Material Reservation, Cycle Counts, Purchase Suggestions."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    BomItem,
    BomVersion,
    CycleCount,
    CycleCountItem,
    InventoryStock,
    Material,
    MaterialReservation,
    WorkOrder,
)
from app.modules.factory.service import FactoryServiceError, UserContext

INVENTORY_ROLES = {"owner_admin", "factory_manager", "inventory_clerk"}


def _require_inventory_access(actor: UserContext) -> None:
    if actor.role not in INVENTORY_ROLES:
        raise FactoryServiceError(403, "No access to inventory management.")


# ── Material Reservation ──────────────────────────────────────────────


async def _get_on_hand_quantity(session: AsyncSession, material_id: UUID) -> Decimal:
    """Get on-hand stock from inventory_stock table."""
    qty_q = select(func.coalesce(func.sum(InventoryStock.quantity), 0)).where(
        InventoryStock.material_id == material_id
    )
    return (await session.execute(qty_q)).scalar() or Decimal("0")


async def get_available_stock(session: AsyncSession, material_id: UUID) -> Decimal:
    """Returns on-hand stock minus all active reservations."""
    material = await session.get(Material, material_id)
    if material is None:
        return Decimal("0")

    reserved_q = select(func.coalesce(func.sum(MaterialReservation.quantity_reserved - MaterialReservation.quantity_issued), 0)).where(
        MaterialReservation.material_id == material_id,
        MaterialReservation.status.in_(["reserved", "partially_issued"]),
    )
    reserved = (await session.execute(reserved_q)).scalar() or Decimal("0")
    on_hand = await _get_on_hand_quantity(session, material_id)
    return on_hand - reserved


async def reserve_materials_for_work_order(
    session: AsyncSession,
    work_order_id: UUID,
    actor: UserContext,
) -> dict:
    """Reserve materials based on BOM for a work order."""
    _require_inventory_access(actor)

    wo = await session.get(WorkOrder, work_order_id)
    if wo is None:
        raise FactoryServiceError(404, "Work order not found.")

    # Find approved BOM
    bom_q = (
        select(BomVersion)
        .where(BomVersion.product_style_id == wo.product_style_id, BomVersion.status == "approved")
        .order_by(BomVersion.version.desc())
        .limit(1)
    )
    bom = (await session.scalars(bom_q)).first()
    if bom is None:
        raise FactoryServiceError(422, "No approved BOM for this style. Cannot reserve materials.")

    items_q = select(BomItem).where(BomItem.bom_version_id == bom.id)
    bom_items = list((await session.scalars(items_q)).all())

    reserved = []
    shortfalls = []
    purchase_alerts = []

    for bom_item in bom_items:
        required = bom_item.quantity_per_pair * wo.planned_pairs * (1 + bom_item.wastage_percent / 100)
        available = await get_available_stock(session, bom_item.material_id)

        material = await session.get(Material, bom_item.material_id)
        material_name = material.name if material else "Unknown"

        can_reserve = min(required, available)

        if can_reserve > 0:
            reservation = MaterialReservation(
                work_order_id=work_order_id,
                material_id=bom_item.material_id,
                quantity_reserved=can_reserve,
                unit=material.unit_of_measure if material else "pcs",
                status="reserved",
                reserved_by=actor.id,
            )
            session.add(reservation)
            reserved.append({
                "material_id": bom_item.material_id,
                "material_name": material_name,
                "quantity_reserved": float(can_reserve),
                "quantity_required": float(required),
            })

        if can_reserve < required:
            shortfalls.append({
                "material_id": bom_item.material_id,
                "material_name": material_name,
                "quantity_required": float(required),
                "quantity_available": float(available),
                "shortfall": float(required - available),
            })

        # Check reorder point
        remaining = available - can_reserve
        if material and material.reorder_point and remaining < material.reorder_point:
            purchase_alerts.append({
                "material_id": bom_item.material_id,
                "material_name": material_name,
                "current_available": float(remaining),
                "reorder_point": float(material.reorder_point),
                "suggested_quantity": float(material.reorder_quantity or required * 2),
            })

    await session.flush()

    return {
        "work_order_id": work_order_id,
        "reserved": reserved,
        "shortfalls": shortfalls,
        "purchase_alerts": purchase_alerts,
        "fully_reserved": len(shortfalls) == 0,
    }


async def get_purchase_suggestions(session: AsyncSession) -> list[dict]:
    """Materials below reorder point."""
    query = select(Material).where(
        Material.reorder_point.is_not(None),
    )
    materials = list((await session.scalars(query)).all())

    suggestions = []
    for m in materials:
        available = await get_available_stock(session, m.id)
        on_hand = await _get_on_hand_quantity(session, m.id)
        if available < (m.reorder_point or 0):
            suggestions.append({
                "material_id": m.id,
                "material_name": m.name,
                "material_code": m.material_code,
                "current_available": float(available),
                "current_stock": float(on_hand),
                "reorder_point": float(m.reorder_point),
                "suggested_quantity": float(m.reorder_quantity or m.reorder_point * 2),
                "unit": m.unit_of_measure,
                "urgency": "critical" if available <= 0 else "warning" if available < m.reorder_point * Decimal("0.5") else "info",
            })

    suggestions.sort(key=lambda x: {"critical": 0, "warning": 1, "info": 2}[x["urgency"]])
    return suggestions


# ── Cycle Counts ──────────────────────────────────────────────────────

async def _next_count_number(session: AsyncSession) -> str:
    year = datetime.now(UTC).year
    prefix = f"CC-{year}-"
    result = await session.execute(
        select(func.count(CycleCount.id)).where(CycleCount.count_number.startswith(prefix))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:06d}"


async def start_cycle_count(
    session: AsyncSession,
    count_type: str,
    actor: UserContext,
    category_filter: str | None = None,
) -> dict:
    _require_inventory_access(actor)

    count_number = await _next_count_number(session)
    cycle_count = CycleCount(
        count_number=count_number,
        count_date=date.today(),
        count_type=count_type,
        category_filter=category_filter,
        counted_by=actor.id,
    )
    session.add(cycle_count)
    await session.flush()

    # Populate items based on count type
    materials_q = select(Material)
    if count_type == "category" and category_filter:
        materials_q = materials_q.where(Material.category == category_filter)
    elif count_type == "abc_class_a":
        # Top 20% by value (approximation: highest average_cost)
        materials_q = materials_q.order_by(Material.average_cost_npr.desc().nullslast()).limit(
            (await session.execute(select(func.count(Material.id)))).scalar() // 5 or 10
        )

    materials = list((await session.scalars(materials_q)).all())

    for m in materials:
        on_hand = await _get_on_hand_quantity(session, m.id)
        item = CycleCountItem(
            cycle_count_id=cycle_count.id,
            material_id=m.id,
            system_quantity=on_hand,
            unit_cost_npr=m.average_cost_npr,
        )
        session.add(item)

    cycle_count.total_items_counted = len(materials)
    await session.flush()

    return await get_cycle_count(session, cycle_count.id)


async def get_cycle_count(session: AsyncSession, count_id: UUID) -> dict:
    cc = await session.get(CycleCount, count_id)
    if cc is None:
        raise FactoryServiceError(404, "Cycle count not found.")

    items_q = (
        select(CycleCountItem, Material.name.label("material_name"), Material.material_code)
        .join(Material, CycleCountItem.material_id == Material.id)
        .where(CycleCountItem.cycle_count_id == count_id)
    )
    item_rows = (await session.execute(items_q)).all()

    items = []
    for item, material_name, material_code in item_rows:
        variance = float(item.counted_quantity - item.system_quantity) if item.counted_quantity is not None else None
        variance_pct = (variance / float(item.system_quantity) * 100) if variance is not None and float(item.system_quantity) > 0 else None
        items.append({
            "id": item.id,
            "material_id": item.material_id,
            "material_name": material_name,
            "material_code": material_code,
            "system_quantity": float(item.system_quantity),
            "counted_quantity": float(item.counted_quantity) if item.counted_quantity is not None else None,
            "variance": variance,
            "variance_pct": round(variance_pct, 1) if variance_pct is not None else None,
            "unit_cost_npr": float(item.unit_cost_npr) if item.unit_cost_npr else None,
            "variance_value_npr": round(variance * float(item.unit_cost_npr), 2) if variance is not None and item.unit_cost_npr else None,
            "adjustment_approved": item.adjustment_approved,
            "notes": item.notes,
        })

    return {
        "id": cc.id,
        "count_number": cc.count_number,
        "count_date": cc.count_date.isoformat(),
        "status": cc.status,
        "count_type": cc.count_type,
        "category_filter": cc.category_filter,
        "total_items_counted": cc.total_items_counted,
        "discrepancies_found": cc.discrepancies_found,
        "total_variance_npr": float(cc.total_variance_npr),
        "items": items,
    }


async def record_count_item(
    session: AsyncSession,
    item_id: UUID,
    counted_quantity: Decimal,
    notes: str | None = None,
) -> dict:
    item = await session.get(CycleCountItem, item_id)
    if item is None:
        raise FactoryServiceError(404, "Count item not found.")

    item.counted_quantity = counted_quantity
    item.notes = notes
    await session.flush()

    # Update cycle count discrepancy totals
    cc = await session.get(CycleCount, item.cycle_count_id)
    if cc:
        disc_q = select(func.count(CycleCountItem.id)).where(
            CycleCountItem.cycle_count_id == cc.id,
            CycleCountItem.counted_quantity.is_not(None),
            CycleCountItem.counted_quantity != CycleCountItem.system_quantity,
        )
        cc.discrepancies_found = (await session.execute(disc_q)).scalar() or 0
        await session.flush()

    return {"id": item.id, "counted_quantity": float(counted_quantity)}


async def list_cycle_counts(session: AsyncSession) -> list[dict]:
    query = select(CycleCount).order_by(CycleCount.created_at.desc())
    counts = list((await session.scalars(query)).all())
    return [
        {
            "id": cc.id,
            "count_number": cc.count_number,
            "count_date": cc.count_date.isoformat(),
            "status": cc.status,
            "count_type": cc.count_type,
            "total_items_counted": cc.total_items_counted,
            "discrepancies_found": cc.discrepancies_found,
            "total_variance_npr": float(cc.total_variance_npr),
        }
        for cc in counts
    ]


async def approve_cycle_count(
    session: AsyncSession,
    count_id: UUID,
    approved_item_ids: list[UUID],
    actor: UserContext,
) -> dict:
    _require_inventory_access(actor)

    cc = await session.get(CycleCount, count_id)
    if cc is None:
        raise FactoryServiceError(404, "Cycle count not found.")

    total_variance = Decimal("0")
    for item_id in approved_item_ids:
        item = await session.get(CycleCountItem, item_id)
        if item and item.cycle_count_id == count_id and item.counted_quantity is not None:
            item.adjustment_approved = True
            variance = item.counted_quantity - item.system_quantity
            if item.unit_cost_npr:
                total_variance += variance * item.unit_cost_npr

    cc.status = "approved"
    cc.approved_by = actor.id
    cc.approved_at = datetime.now(UTC)
    cc.total_variance_npr = total_variance
    await session.flush()

    return await get_cycle_count(session, count_id)
