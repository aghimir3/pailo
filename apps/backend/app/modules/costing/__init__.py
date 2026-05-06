"""Costing module: BOM versions, cost snapshots, variance analysis."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    BomItem,
    BomVersion,
    Material,
    MaterialPriceHistory,
    WorkOrder,
    WorkOrderCostSnapshot,
)
from app.modules.factory.service import FactoryServiceError, UserContext

MANAGER_ROLES = {"owner_admin", "factory_manager"}


def _require_costing_access(actor: UserContext) -> None:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers can manage BOM and costing.")


async def list_bom_versions(session: AsyncSession, style_id: UUID) -> list[dict]:
    query = (
        select(BomVersion)
        .where(BomVersion.product_style_id == style_id)
        .order_by(BomVersion.version.desc())
    )
    versions = list((await session.scalars(query)).all())
    return [
        {
            "id": v.id,
            "style_id": v.product_style_id,
            "version_number": v.version,
            "status": v.status,
            "approved_at": v.approved_at.isoformat() if v.approved_at else None,
            "notes": v.notes,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]


async def get_bom_version_detail(session: AsyncSession, bom_version_id: UUID) -> dict:
    bom = await session.get(BomVersion, bom_version_id)
    if bom is None:
        raise FactoryServiceError(404, "BOM version not found.")

    items_query = (
        select(BomItem, Material.name.label("material_name"), Material.unit_of_measure)
        .join(Material, BomItem.material_id == Material.id)
        .where(BomItem.bom_version_id == bom_version_id)
    )
    item_rows = (await session.execute(items_query)).all()

    items = []
    total_cost = Decimal("0")
    for item, material_name, unit_of_measure in item_rows:
        # Get latest price
        price_query = (
            select(MaterialPriceHistory.price_per_unit)
            .where(MaterialPriceHistory.material_id == item.material_id)
            .order_by(MaterialPriceHistory.effective_from.desc())
            .limit(1)
        )
        price_row = (await session.execute(price_query)).scalar()
        latest_price = price_row if price_row else Decimal("0")

        effective_qty = item.quantity_per_pair * (1 + item.wastage_percent / 100)
        line_cost = effective_qty * latest_price
        total_cost += line_cost

        items.append({
            "id": item.id,
            "material_id": item.material_id,
            "material_name": material_name,
            "quantity_per_pair": float(item.quantity_per_pair),
            "wastage_pct": float(item.wastage_percent),
            "unit": unit_of_measure,
            "latest_price": float(latest_price),
            "line_cost_per_pair": float(line_cost),
        })

    return {
        "id": bom.id,
        "style_id": bom.product_style_id,
        "version_number": bom.version,
        "status": bom.status,
        "approved_at": bom.approved_at.isoformat() if bom.approved_at else None,
        "notes": bom.notes,
        "items": items,
        "total_material_cost_per_pair": float(total_cost),
        "created_at": bom.created_at.isoformat(),
    }


async def create_bom_version(
    session: AsyncSession,
    style_id: UUID,
    items: list[dict],
    actor: UserContext,
    notes: str | None = None,
) -> dict:
    _require_costing_access(actor)

    # Get next version number
    max_ver_q = select(func.max(BomVersion.version)).where(BomVersion.product_style_id == style_id)
    max_ver = (await session.execute(max_ver_q)).scalar() or 0

    bom = BomVersion(
        product_style_id=style_id,
        version=max_ver + 1,
        status="draft",
        notes=notes,
    )
    session.add(bom)
    await session.flush()

    for item_data in items:
        bom_item = BomItem(
            bom_version_id=bom.id,
            material_id=item_data["material_id"],
            quantity_per_pair=Decimal(str(item_data["quantity_per_pair"])),
            wastage_percent=Decimal(str(item_data.get("wastage_pct", 5.0))),
        )
        session.add(bom_item)

    await session.flush()
    return await get_bom_version_detail(session, bom.id)


async def approve_bom_version(
    session: AsyncSession,
    bom_version_id: UUID,
    actor: UserContext,
) -> dict:
    _require_costing_access(actor)

    bom = await session.get(BomVersion, bom_version_id)
    if bom is None:
        raise FactoryServiceError(404, "BOM version not found.")
    if bom.status != "draft":
        raise FactoryServiceError(409, "Only draft BOMs can be approved.")

    # Supersede previous approved version
    prev_query = (
        select(BomVersion)
        .where(BomVersion.product_style_id == bom.product_style_id, BomVersion.status == "approved")
    )
    prev_versions = list((await session.scalars(prev_query)).all())
    for prev in prev_versions:
        prev.status = "superseded"

    bom.status = "approved"
    bom.approved_by_user_id = actor.id
    bom.approved_at = datetime.now(UTC)
    await session.flush()

    return await get_bom_version_detail(session, bom.id)


async def create_cost_snapshot(
    session: AsyncSession,
    work_order_id: UUID,
    actor: UserContext,
) -> dict:
    """Capture cost snapshot at WO start."""
    wo = await session.get(WorkOrder, work_order_id)
    if wo is None:
        raise FactoryServiceError(404, "Work order not found.")

    # Find approved BOM for this style
    bom_query = (
        select(BomVersion)
        .where(BomVersion.product_style_id == wo.product_style_id, BomVersion.status == "approved")
        .order_by(BomVersion.version.desc())
        .limit(1)
    )
    bom = (await session.scalars(bom_query)).first()
    if bom is None:
        raise FactoryServiceError(422, "No approved BOM found for this style.")

    # Calculate costs
    bom_detail = await get_bom_version_detail(session, bom.id)
    material_cost = Decimal(str(bom_detail["total_material_cost_per_pair"]))

    snapshot_prices = {}
    for item in bom_detail["items"]:
        snapshot_prices[str(item["material_id"])] = {
            "price": item["latest_price"],
            "qty_needed": item["quantity_per_pair"],
            "wastage_pct": item["wastage_pct"],
        }

    snapshot = WorkOrderCostSnapshot(
        work_order_id=work_order_id,
        bom_version_id=bom.id,
        estimated_material_cost_per_pair=material_cost,
        estimated_total_per_pair=material_cost,  # Can add labor/overhead later
        snapshot_prices=snapshot_prices,
    )
    session.add(snapshot)
    await session.flush()

    return {
        "id": snapshot.id,
        "work_order_id": work_order_id,
        "bom_version_id": bom.id,
        "estimated_material_cost_per_pair": float(material_cost),
        "estimated_total_per_pair": float(material_cost),
    }


async def get_cost_variance_report(
    session: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    query = (
        select(WorkOrderCostSnapshot, WorkOrder.work_order_code, WorkOrder.planned_pairs, WorkOrder.completed_pairs)
        .join(WorkOrder, WorkOrderCostSnapshot.work_order_id == WorkOrder.id)
        .where(WorkOrderCostSnapshot.actual_total_per_pair.is_not(None))
        .order_by(WorkOrderCostSnapshot.created_at.desc())
    )
    if date_from:
        query = query.where(WorkOrderCostSnapshot.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(WorkOrderCostSnapshot.created_at <= datetime.combine(date_to, datetime.max.time()))

    rows = (await session.execute(query)).all()
    results = []
    for snapshot, wo_code, planned, completed in rows:
        variance = None
        if snapshot.estimated_total_per_pair and snapshot.actual_total_per_pair:
            variance = float(
                (snapshot.actual_total_per_pair - snapshot.estimated_total_per_pair)
                / snapshot.estimated_total_per_pair * 100
            )
        results.append({
            "work_order_code": wo_code,
            "planned_pairs": planned,
            "completed_pairs": completed,
            "estimated_cost_per_pair": float(snapshot.estimated_total_per_pair),
            "actual_cost_per_pair": float(snapshot.actual_total_per_pair) if snapshot.actual_total_per_pair else None,
            "variance_pct": variance,
            "total_impact_npr": float(
                (snapshot.actual_total_per_pair - snapshot.estimated_total_per_pair) * completed
            ) if snapshot.actual_total_per_pair and completed else None,
        })
    return results


async def add_material_price(
    session: AsyncSession,
    material_id: UUID,
    price_per_unit: Decimal,
    supplier_id: UUID | None,
    actor: UserContext,
    source: str = "manual_entry",
) -> dict:
    price = MaterialPriceHistory(
        material_id=material_id,
        supplier_id=supplier_id,
        price_per_unit=price_per_unit,
        effective_from=date.today(),
        source=source,
        created_by=actor.id,
    )
    session.add(price)
    await session.flush()
    return {
        "id": price.id,
        "material_id": material_id,
        "price_per_unit": float(price_per_unit),
        "effective_from": date.today().isoformat(),
    }
