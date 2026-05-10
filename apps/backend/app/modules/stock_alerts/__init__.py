"""Stock alerts service: depletion warnings, purchase suggestions, inventory health."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    InventoryMovement,
    InventoryStock,
    Material,
    MaterialReservation,
    StockAlert,
    Supplier,
    User,
)
from app.modules.factory.schemas_extended import (
    AcknowledgeAlertInput,
    InventoryHealthResponse,
    PurchaseSuggestionResponse,
    StockAlertResponse,
)
from app.modules.factory.service import FactoryServiceError, UserContext

ALERT_ROLES = {"owner_admin", "factory_manager", "inventory_clerk", "purchasing"}


def _require_alert_access(actor: UserContext) -> None:
    if actor.role not in ALERT_ROLES:
        raise FactoryServiceError(403, "No access to stock alerts.")


# ── Consumption Rates ─────────────────────────────────────────────────


async def _get_consumption_rates(
    session: AsyncSession,
    material_ids: list[UUID] | None = None,
) -> dict[UUID, Decimal]:
    """Calculate avg daily consumption over last 30 days from issue + wastage."""
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

    query = (
        select(
            InventoryMovement.material_id,
            func.abs(func.sum(InventoryMovement.quantity_delta)),
        )
        .where(
            InventoryMovement.movement_type.in_(["issue", "wastage"]),
            InventoryMovement.created_at >= thirty_days_ago,
            InventoryMovement.material_id.is_not(None),
        )
        .group_by(InventoryMovement.material_id)
    )

    if material_ids:
        query = query.where(InventoryMovement.material_id.in_(material_ids))

    rows = (await session.execute(query)).all()
    return {
        mat_id: (Decimal(str(total_used)) / Decimal("30")).quantize(Decimal("0.001"))
        for mat_id, total_used in rows
    }


async def _get_on_hand_quantities(
    session: AsyncSession,
    material_ids: list[UUID] | None = None,
) -> dict[UUID, Decimal]:
    """Get on-hand stock for materials."""
    query = select(
        InventoryStock.material_id,
        func.coalesce(func.sum(InventoryStock.quantity), Decimal("0")),
    ).where(
        InventoryStock.material_id.is_not(None),
    ).group_by(InventoryStock.material_id)

    if material_ids:
        query = query.where(InventoryStock.material_id.in_(material_ids))

    rows = (await session.execute(query)).all()
    return {mat_id: qty for mat_id, qty in rows}


async def _get_reserved_quantities(
    session: AsyncSession,
    material_ids: list[UUID] | None = None,
) -> dict[UUID, Decimal]:
    """Get total reserved (not yet issued) per material."""
    query = select(
        MaterialReservation.material_id,
        func.coalesce(
            func.sum(MaterialReservation.quantity_reserved - MaterialReservation.quantity_issued),
            Decimal("0"),
        ),
    ).where(
        MaterialReservation.status.in_(["reserved", "partially_issued"]),
    ).group_by(MaterialReservation.material_id)

    if material_ids:
        query = query.where(MaterialReservation.material_id.in_(material_ids))

    rows = (await session.execute(query)).all()
    return {mat_id: qty for mat_id, qty in rows}


# ── Purchase Suggestions ──────────────────────────────────────────────


async def get_purchase_suggestions(
    session: AsyncSession,
) -> list[PurchaseSuggestionResponse]:
    """Materials below reorder point, enriched with consumption data."""
    materials = list(
        (await session.scalars(
            select(Material).where(Material.active == True, Material.reorder_point.is_not(None))  # noqa: E712
        )).all()
    )

    if not materials:
        return []

    mat_ids = [m.id for m in materials]
    on_hand = await _get_on_hand_quantities(session, mat_ids)
    reserved = await _get_reserved_quantities(session, mat_ids)
    consumption = await _get_consumption_rates(session, mat_ids)

    # Load suppliers
    supplier_ids = {m.supplier_id for m in materials if m.supplier_id}
    suppliers: dict[UUID, Supplier] = {}
    if supplier_ids:
        rows = (await session.scalars(select(Supplier).where(Supplier.id.in_(supplier_ids)))).all()
        suppliers = {s.id: s for s in rows}

    suggestions: list[PurchaseSuggestionResponse] = []
    for m in materials:
        stock = on_hand.get(m.id, Decimal("0"))
        res = reserved.get(m.id, Decimal("0"))
        available = stock - res
        daily_rate = consumption.get(m.id)

        if available >= (m.reorder_point or Decimal("0")):
            continue

        days_stockout: Decimal | None = None
        if daily_rate and daily_rate > 0:
            days_stockout = (stock / daily_rate).quantize(Decimal("0.1"))

        # Urgency
        if available <= 0:
            urgency = "critical"
        elif daily_rate and days_stockout and days_stockout <= Decimal("3"):
            urgency = "critical"
        elif available < (m.reorder_point or Decimal("0")) * Decimal("0.5"):
            urgency = "warning"
        else:
            urgency = "info"

        suggested_qty = m.reorder_quantity or (m.reorder_point or Decimal("0")) * Decimal("2")
        est_cost = (m.last_purchase_cost_npr or m.average_cost_npr or Decimal("0")) * suggested_qty

        supplier = suppliers.get(m.supplier_id) if m.supplier_id else None

        suggestions.append(PurchaseSuggestionResponse(
            material_id=m.id,
            material_name=m.name,
            material_code=m.material_code,
            category=m.category,
            unit=m.unit_of_measure,
            current_stock=stock,
            current_available=available,
            reorder_point=m.reorder_point or Decimal("0"),
            suggested_quantity=suggested_qty,
            estimated_cost_npr=est_cost if est_cost > 0 else None,
            supplier_name=supplier.name if supplier else None,
            supplier_phone=supplier.phone if supplier else None,
            lead_time_days=m.lead_time_days,
            daily_consumption_rate=daily_rate,
            days_until_stockout=days_stockout,
            urgency=urgency,
        ))

    suggestions.sort(key=lambda s: {"critical": 0, "warning": 1, "info": 2}[s.urgency])
    return suggestions


# ── Stock Alert Generation ────────────────────────────────────────────


async def generate_stock_alerts(session: AsyncSession) -> list[StockAlert]:
    """Check all materials and generate alerts for those needing attention.

    Idempotent: will not create duplicate unacknowledged alerts for
    the same material + alert_type combination.
    """
    materials = list(
        (await session.scalars(select(Material).where(Material.active == True))).all()  # noqa: E712
    )
    if not materials:
        return []

    mat_ids = [m.id for m in materials]
    on_hand = await _get_on_hand_quantities(session, mat_ids)
    consumption = await _get_consumption_rates(session, mat_ids)

    # Existing unacknowledged alerts
    existing = (await session.execute(
        select(StockAlert.material_id, StockAlert.alert_type).where(
            StockAlert.acknowledged == False,  # noqa: E712
        )
    )).all()
    existing_set = {(r[0], r[1]) for r in existing}

    new_alerts: list[StockAlert] = []

    for m in materials:
        stock = on_hand.get(m.id, Decimal("0"))
        daily_rate = consumption.get(m.id)
        days_remaining: Decimal | None = None
        if daily_rate and daily_rate > 0:
            days_remaining = (stock / daily_rate).quantize(Decimal("0.1"))

        alerts_to_create: list[tuple[str, Decimal]] = []

        if stock <= 0:
            alerts_to_create.append(("stockout", Decimal("0")))
        elif days_remaining is not None and days_remaining <= Decimal("3"):
            alerts_to_create.append(("stockout_imminent", m.minimum_stock))
        elif stock < m.minimum_stock:
            alerts_to_create.append(("below_minimum", m.minimum_stock))
        elif m.reorder_point and stock < m.reorder_point:
            alerts_to_create.append(("below_reorder", m.reorder_point))

        for alert_type, threshold in alerts_to_create:
            if (m.id, alert_type) in existing_set:
                continue
            alert = StockAlert(
                material_id=m.id,
                alert_type=alert_type,
                current_stock=stock,
                threshold=threshold,
                unit=m.unit_of_measure,
                days_remaining=days_remaining,
                daily_consumption_rate=daily_rate,
            )
            session.add(alert)
            new_alerts.append(alert)

    if new_alerts:
        await session.flush()

    return new_alerts


# ── Alert Management ──────────────────────────────────────────────────


async def list_stock_alerts(
    session: AsyncSession,
    acknowledged: bool | None = None,
) -> list[StockAlertResponse]:
    """List stock alerts, optionally filtered by acknowledgment status."""
    query = (
        select(StockAlert, Material.name, Material.material_code, User.display_name)
        .join(Material, StockAlert.material_id == Material.id)
        .outerjoin(User, StockAlert.acknowledged_by_user_id == User.id)
        .order_by(StockAlert.created_at.desc())
    )

    if acknowledged is not None:
        query = query.where(StockAlert.acknowledged == acknowledged)

    rows = (await session.execute(query)).all()

    return [
        StockAlertResponse(
            id=alert.id,
            material_id=alert.material_id,
            material_name=mat_name,
            material_code=mat_code,
            alert_type=alert.alert_type,
            current_stock=alert.current_stock,
            threshold=alert.threshold,
            unit=alert.unit,
            days_remaining=alert.days_remaining,
            supplier_name=None,
            acknowledged=alert.acknowledged,
            acknowledged_at=alert.acknowledged_at,
            acknowledged_by=ack_user,
            po_reference=alert.po_reference,
            created_at=alert.created_at,
        )
        for alert, mat_name, mat_code, ack_user in rows
    ]


async def acknowledge_alert(
    session: AsyncSession,
    alert_id: UUID,
    data: AcknowledgeAlertInput,
    actor: UserContext,
) -> StockAlertResponse:
    """Mark an alert as acknowledged (material ordered/handled)."""
    _require_alert_access(actor)
    alert = await session.get(StockAlert, alert_id)
    if alert is None:
        raise FactoryServiceError(404, "Alert not found.")
    if alert.acknowledged:
        raise FactoryServiceError(422, "Alert already acknowledged.")

    alert.acknowledged = True
    alert.acknowledged_at = datetime.now(UTC)
    alert.acknowledged_by_user_id = actor.id
    alert.po_reference = data.po_reference
    alert.notes = data.notes
    await session.flush()

    mat = await session.get(Material, alert.material_id)
    user = await session.get(User, actor.id)

    return StockAlertResponse(
        id=alert.id,
        material_id=alert.material_id,
        material_name=mat.name if mat else "Unknown",
        material_code=mat.material_code if mat else "",
        alert_type=alert.alert_type,
        current_stock=alert.current_stock,
        threshold=alert.threshold,
        unit=alert.unit,
        days_remaining=alert.days_remaining,
        supplier_name=None,
        acknowledged=True,
        acknowledged_at=alert.acknowledged_at,
        acknowledged_by=user.display_name if user else None,
        po_reference=alert.po_reference,
        created_at=alert.created_at,
    )


async def get_unacknowledged_count(session: AsyncSession) -> int:
    """Get count of unacknowledged alerts for nav badge."""
    result = await session.scalar(
        select(func.count(StockAlert.id)).where(StockAlert.acknowledged == False)  # noqa: E712
    )
    return result or 0


# ── Inventory Health ──────────────────────────────────────────────────


async def get_inventory_health(session: AsyncSession) -> InventoryHealthResponse:
    """Comprehensive inventory health overview."""
    materials = list(
        (await session.scalars(select(Material).where(Material.active == True))).all()  # noqa: E712
    )

    mat_ids = [m.id for m in materials]
    on_hand = await _get_on_hand_quantities(session, mat_ids)
    consumption = await _get_consumption_rates(session, mat_ids)

    # Classify materials
    healthy = 0
    low = 0
    critical = 0

    total_value = Decimal("0")
    fastest_depleting: list[dict] = []
    dead_stock: list[dict] = []
    risk_breakdown: list[dict] = []

    for m in materials:
        stock = on_hand.get(m.id, Decimal("0"))
        daily_rate = consumption.get(m.id, Decimal("0"))
        days_left: Decimal | None = None
        if daily_rate > 0:
            days_left = (stock / daily_rate).quantize(Decimal("0.1"))

        mat_value = stock * (m.average_cost_npr or Decimal("0"))
        total_value += mat_value

        if stock <= 0:
            critical += 1
            risk = "critical"
        elif stock < m.minimum_stock or (days_left is not None and days_left <= Decimal("3")):
            critical += 1
            risk = "critical"
        elif stock < (m.reorder_point or m.minimum_stock * Decimal("1.5")) or (
            days_left is not None and days_left <= Decimal("7")
        ):
            low += 1
            risk = "low"
        else:
            healthy += 1
            risk = "ok"

        if daily_rate > 0 and days_left is not None:
            fastest_depleting.append({
                "material_code": m.material_code,
                "name": m.name,
                "current_stock": float(stock),
                "unit": m.unit_of_measure,
                "daily_rate": float(daily_rate),
                "days_left": float(days_left),
                "risk": risk,
            })

        if daily_rate == 0 and stock > 0:
            dead_stock.append({
                "material_code": m.material_code,
                "name": m.name,
                "current_stock": float(stock),
                "unit": m.unit_of_measure,
                "value_npr": float(mat_value),
            })

    fastest_depleting.sort(key=lambda x: x["days_left"])
    dead_stock.sort(key=lambda x: x["value_npr"], reverse=True)

    risk_breakdown = [
        {"status": "Healthy", "count": healthy, "color": "#22c55e"},
        {"status": "Low", "count": low, "color": "#f59e0b"},
        {"status": "Critical", "count": critical, "color": "#ef4444"},
    ]

    # Consumption trend: daily totals for last 14 days
    fourteen_days_ago = datetime.now(UTC) - timedelta(days=14)
    trend_rows = (await session.execute(
        select(
            cast(InventoryMovement.created_at, Date).label("day"),
            func.abs(func.sum(
                case(
                    (InventoryMovement.movement_type.in_(["issue", "wastage"]), InventoryMovement.quantity_delta),
                    else_=0,
                )
            )).label("consumed"),
            func.sum(
                case(
                    (InventoryMovement.movement_type == "receive", InventoryMovement.quantity_delta),
                    else_=0,
                )
            ).label("received"),
        )
        .where(InventoryMovement.created_at >= fourteen_days_ago)
        .group_by(cast(InventoryMovement.created_at, Date))
        .order_by(cast(InventoryMovement.created_at, Date))
    )).all()

    consumption_trend = [
        {"date": str(row[0]), "consumed": float(row[1]), "received": float(row[2])}
        for row in trend_rows
    ]

    # No-movement materials
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    materials_with_movements = (await session.scalars(
        select(InventoryMovement.material_id).where(
            InventoryMovement.created_at >= thirty_days_ago,
            InventoryMovement.material_id.is_not(None),
        ).distinct()
    )).all()
    no_movement_ids = set(mat_ids) - set(materials_with_movements)

    return InventoryHealthResponse(
        total_materials=len(materials),
        healthy_count=healthy,
        low_count=low,
        critical_count=critical,
        no_movement_30d_count=len(no_movement_ids),
        total_inventory_value_npr=total_value.quantize(Decimal("0.01")),
        risk_breakdown=risk_breakdown,
        fastest_depleting=fastest_depleting[:10],
        dead_stock=dead_stock[:10],
        consumption_trend=consumption_trend,
    )
