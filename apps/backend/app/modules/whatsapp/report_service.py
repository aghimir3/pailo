"""WhatsApp daily/weekly report generation for factory managers.

Generates formatted text summaries of factory KPIs suitable for sending
via WhatsApp text messages (not templates, since these are dynamic).
"""

from datetime import date, timedelta

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import (
    DailyProductionPlan,
    DispatchRecord,
    PurchaseOrder,
    SalesOrder,
    StageTimeLog,
    WorkerProductionLog,
    WorkOrder,
)

logger = structlog.get_logger()


async def generate_daily_summary(session: AsyncSession, report_date: date | None = None) -> str:
    """Generate a concise daily factory summary for WhatsApp delivery."""
    today = report_date or date.today()
    lines: list[str] = []
    lines.append(f"📊 *Pailo Daily Report — {today.strftime('%d %b %Y')}*")
    lines.append("")

    # Production output
    prod_result = await session.execute(
        select(
            func.count(WorkerProductionLog.id).label("entries"),
            func.coalesce(func.sum(WorkerProductionLog.pairs_completed), 0).label(
                "total_pairs"
            ),
        ).where(func.date(WorkerProductionLog.date) == today)
    )
    prod_row = prod_result.one()
    lines.append(f"🏭 *Production*: {prod_row.total_pairs} pairs completed")

    # Daily plan progress
    plan_result = await session.execute(
        select(DailyProductionPlan).where(DailyProductionPlan.plan_date == today)
    )
    plan = plan_result.scalar_one_or_none()
    if plan and plan.target_pairs:
        pct = round((prod_row.total_pairs / plan.target_pairs) * 100)
        lines.append(f"   Target: {plan.target_pairs} pairs ({pct}% achieved)")

    # Stage activity
    stage_result = await session.execute(
        select(
            func.count(StageTimeLog.id).label("stages_completed"),
        ).where(
            func.date(StageTimeLog.started_at) == today,
            StageTimeLog.completed_at.is_not(None),
        )
    )
    stages_done = stage_result.scalar_one_or_none() or 0
    lines.append(f"   Stages completed: {stages_done}")
    lines.append("")

    # Work orders status
    wo_result = await session.execute(
        select(
            WorkOrder.status,
            func.count(WorkOrder.id),
        )
        .where(WorkOrder.status.in_(["in_progress", "ready", "cutting"]))
        .group_by(WorkOrder.status)
    )
    wo_counts = {row[0]: row[1] for row in wo_result.all()}
    active_total = sum(wo_counts.values())
    lines.append(f"📋 *Work Orders*: {active_total} active")
    for status, count in wo_counts.items():
        lines.append(f"   • {status.replace('_', ' ').title()}: {count}")
    lines.append("")

    # Purchase orders
    po_result = await session.execute(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.status == "sent",
            PurchaseOrder.expected_delivery_date < today,
        )
    )
    overdue_pos = po_result.scalar_one_or_none() or 0
    if overdue_pos > 0:
        lines.append(f"⚠️ *Purchasing*: {overdue_pos} overdue PO(s)")
    else:
        lines.append("✅ *Purchasing*: No overdue deliveries")

    pending_po_result = await session.execute(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.status.in_(["draft", "sent"])
        )
    )
    pending_pos = pending_po_result.scalar_one_or_none() or 0
    lines.append(f"   Pending POs: {pending_pos}")
    lines.append("")

    # Sales orders
    so_result = await session.execute(
        select(
            func.count(SalesOrder.id).label("pending"),
            func.coalesce(func.sum(SalesOrder.total_amount_npr), 0).label("value"),
        ).where(SalesOrder.status.in_(["confirmed", "in_production"]))
    )
    so_row = so_result.one()
    lines.append(f"💰 *Sales*: {so_row.pending} open orders (NPR {so_row.value:,.0f})")

    # Dispatches today
    dispatch_result = await session.execute(
        select(func.count(DispatchRecord.id)).where(
            func.date(DispatchRecord.dispatch_date) == today
        )
    )
    dispatched = dispatch_result.scalar_one_or_none() or 0
    lines.append(f"🚚 *Dispatched today*: {dispatched} shipment(s)")
    lines.append("")

    lines.append("—")
    lines.append("_Pailo Factory System_")

    return "\n".join(lines)


async def generate_weekly_summary(
    session: AsyncSession, week_ending: date | None = None
) -> str:
    """Generate a weekly summary covering Mon-Sun for WhatsApp delivery."""
    end = week_ending or date.today()
    start = end - timedelta(days=6)
    lines: list[str] = []
    lines.append(
        f"📈 *Pailo Weekly Summary*"
        f"\n_{start.strftime('%d %b')} — {end.strftime('%d %b %Y')}_"
    )
    lines.append("")

    # Total production
    prod_result = await session.execute(
        select(
            func.coalesce(func.sum(WorkerProductionLog.pairs_completed), 0).label(
                "total_pairs"
            ),
            func.count(func.distinct(WorkerProductionLog.employee_id)).label(
                "workers"
            ),
        ).where(
            func.date(WorkerProductionLog.date) >= start,
            func.date(WorkerProductionLog.date) <= end,
        )
    )
    prod_row = prod_result.one()
    lines.append(f"🏭 *Total Production*: {prod_row.total_pairs} pairs")
    lines.append(f"   Active workers: {prod_row.workers}")
    if prod_row.workers > 0:
        avg = prod_row.total_pairs / prod_row.workers
        lines.append(f"   Avg per worker: {avg:.0f} pairs")
    lines.append("")

    # Work orders completed this week
    wo_completed = await session.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status == "completed",
            func.date(WorkOrder.updated_at) >= start,
            func.date(WorkOrder.updated_at) <= end,
        )
    )
    completed_count = wo_completed.scalar_one_or_none() or 0
    lines.append(f"✅ *Work Orders Completed*: {completed_count}")

    # Dispatches this week
    dispatch_result = await session.execute(
        select(func.count(DispatchRecord.id)).where(
            func.date(DispatchRecord.dispatch_date) >= start,
            func.date(DispatchRecord.dispatch_date) <= end,
        )
    )
    dispatched = dispatch_result.scalar_one_or_none() or 0
    lines.append(f"🚚 *Dispatched*: {dispatched} shipment(s)")

    # Revenue from completed orders
    revenue_result = await session.execute(
        select(func.coalesce(func.sum(SalesOrder.total_amount_npr), 0)).where(
            SalesOrder.status == "dispatched",
            func.date(SalesOrder.updated_at) >= start,
            func.date(SalesOrder.updated_at) <= end,
        )
    )
    revenue = revenue_result.scalar_one_or_none() or 0
    lines.append(f"💰 *Revenue dispatched*: NPR {revenue:,.0f}")
    lines.append("")

    lines.append("—")
    lines.append("_Pailo Factory System_")

    return "\n".join(lines)


async def send_daily_report(session: AsyncSession, report_date: date | None = None) -> bool:
    """Generate and send daily report to configured manager phones."""
    settings = get_settings()
    if not settings.whatsapp_enabled:
        logger.info("whatsapp_disabled", action="daily_report_skipped")
        return False

    report_text = await generate_daily_summary(session, report_date)
    logger.info("daily_report_generated", length=len(report_text))

    # For now, log the report. WhatsApp text messages (not templates)
    # require a 24-hour conversation window. In production, this would
    # be sent via template or after user initiates conversation.
    logger.info("daily_report_content", report=report_text)
    return True
