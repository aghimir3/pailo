"""Production module: Stage time tracking, bottleneck analysis, daily plans."""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    DailyPlanItem,
    DailyProductionPlan,
    StageTimeLog,
    WorkOrder,
)
from app.modules.factory.service import FactoryServiceError, UserContext

MANAGER_ROLES = {"owner_admin", "factory_manager"}
PRODUCTION_STAGES = ["cutting", "stitching", "lasting", "sole_attachment", "finishing", "qc", "packing"]


def _require_production_access(actor: UserContext) -> None:
    if actor.role not in MANAGER_ROLES | {"worker", "quality_inspector"}:
        raise FactoryServiceError(403, "No access to production tracking.")


# ── Stage Time Tracking ──────────────────────────────────────────────

async def start_stage(
    session: AsyncSession,
    work_order_id: UUID,
    stage: str,
    actor: UserContext,
    worker_count: int | None = None,
    pairs_input: int | None = None,
) -> dict:
    if stage not in PRODUCTION_STAGES:
        raise FactoryServiceError(422, f"Invalid stage: {stage}")

    log = StageTimeLog(
        work_order_id=work_order_id,
        stage=stage,
        started_at=datetime.now(UTC),
        worker_count=worker_count,
        pairs_input=pairs_input,
        created_by=actor.id,
    )
    session.add(log)
    await session.flush()
    return _stage_log_to_dict(log)


async def complete_stage(
    session: AsyncSession,
    stage_log_id: UUID,
    actor: UserContext,
    pairs_output: int | None = None,
    pairs_defect: int = 0,
    notes: str | None = None,
) -> dict:
    log = await session.get(StageTimeLog, stage_log_id)
    if log is None:
        raise FactoryServiceError(404, "Stage time log not found.")
    if log.completed_at:
        raise FactoryServiceError(409, "Stage already completed.")

    log.completed_at = datetime.now(UTC)
    log.pairs_output = pairs_output
    log.pairs_defect = pairs_defect
    log.notes = notes
    await session.flush()
    return _stage_log_to_dict(log)


async def pause_stage(session: AsyncSession, stage_log_id: UUID, actor: UserContext) -> dict:
    log = await session.get(StageTimeLog, stage_log_id)
    if log is None:
        raise FactoryServiceError(404, "Stage time log not found.")
    if log.paused_at:
        raise FactoryServiceError(409, "Stage already paused.")

    log.paused_at = datetime.now(UTC)
    await session.flush()
    return _stage_log_to_dict(log)


async def resume_stage(session: AsyncSession, stage_log_id: UUID, actor: UserContext) -> dict:
    log = await session.get(StageTimeLog, stage_log_id)
    if log is None:
        raise FactoryServiceError(404, "Stage time log not found.")
    if not log.paused_at:
        raise FactoryServiceError(409, "Stage is not paused.")

    pause_duration = (datetime.now(UTC) - log.paused_at).total_seconds() / 60
    log.total_pause_duration_minutes += int(pause_duration)
    log.paused_at = None
    await session.flush()
    return _stage_log_to_dict(log)


async def get_bottleneck_analysis(
    session: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    if not date_from:
        date_from = date.today() - timedelta(days=7)
    if not date_to:
        date_to = date.today()

    query = (
        select(
            StageTimeLog.stage,
            func.count(StageTimeLog.id).label("batches"),
            func.sum(StageTimeLog.pairs_output).label("total_pairs"),
            func.avg(
                func.extract("epoch", StageTimeLog.completed_at - StageTimeLog.started_at) / 60
                - StageTimeLog.total_pause_duration_minutes
            ).label("avg_minutes"),
        )
        .where(
            StageTimeLog.completed_at.is_not(None),
            StageTimeLog.started_at >= datetime.combine(date_from, datetime.min.time()),
            StageTimeLog.started_at <= datetime.combine(date_to, datetime.max.time()),
        )
        .group_by(StageTimeLog.stage)
    )
    rows = (await session.execute(query)).all()

    stages = []
    min_throughput = float("inf")
    bottleneck = None

    for stage, batches, total_pairs, avg_minutes in rows:
        throughput = float(total_pairs or 0) / max(float(avg_minutes or 1) / 60, 0.01)  # pairs/hour
        stages.append({
            "stage": stage,
            "batches_processed": batches,
            "total_pairs_out": int(total_pairs or 0),
            "avg_minutes_per_batch": round(float(avg_minutes or 0), 1),
            "throughput_per_hour": round(throughput, 1),
        })
        if throughput < min_throughput and total_pairs:
            min_throughput = throughput
            bottleneck = stage

    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "stages": stages,
        "bottleneck_stage": bottleneck,
        "recommendation": f"Consider adding workers to {bottleneck} stage to increase throughput." if bottleneck else None,
    }


async def get_stage_logs_for_work_order(session: AsyncSession, work_order_id: UUID) -> list[dict]:
    query = (
        select(StageTimeLog)
        .where(StageTimeLog.work_order_id == work_order_id)
        .order_by(StageTimeLog.started_at)
    )
    logs = list((await session.scalars(query)).all())
    return [_stage_log_to_dict(log) for log in logs]


def _stage_log_to_dict(log: StageTimeLog) -> dict:
    elapsed = None
    if log.completed_at:
        elapsed = (log.completed_at - log.started_at).total_seconds() / 60 - log.total_pause_duration_minutes
    elif not log.paused_at:
        elapsed = (datetime.now(UTC) - log.started_at).total_seconds() / 60 - log.total_pause_duration_minutes

    return {
        "id": log.id,
        "work_order_id": log.work_order_id,
        "stage": log.stage,
        "started_at": log.started_at.isoformat(),
        "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        "is_paused": log.paused_at is not None,
        "elapsed_minutes": round(elapsed, 1) if elapsed else None,
        "worker_count": log.worker_count,
        "pairs_input": log.pairs_input,
        "pairs_output": log.pairs_output,
        "pairs_defect": log.pairs_defect,
        "notes": log.notes,
    }


# ── Daily Production Plan ────────────────────────────────────────────

async def get_daily_plan(session: AsyncSession, plan_date: date | None = None) -> dict | None:
    if not plan_date:
        plan_date = date.today()

    plan_query = select(DailyProductionPlan).where(DailyProductionPlan.plan_date == plan_date)
    plan = (await session.scalars(plan_query)).first()
    if plan is None:
        return None

    items_query = (
        select(DailyPlanItem, WorkOrder.work_order_code, WorkOrder.status.label("wo_status"), WorkOrder.completed_pairs)
        .join(WorkOrder, DailyPlanItem.work_order_id == WorkOrder.id)
        .where(DailyPlanItem.plan_id == plan.id)
        .order_by(DailyPlanItem.sort_order)
    )
    item_rows = (await session.execute(items_query)).all()

    items = []
    for item, wo_code, wo_status, wo_completed in item_rows:
        items.append({
            "id": item.id,
            "work_order_id": item.work_order_id,
            "work_order_code": wo_code,
            "work_order_status": wo_status,
            "priority": item.priority,
            "target_pairs": item.target_pairs,
            "actual_pairs": item.actual_pairs or wo_completed or 0,
            "materials_ready": item.materials_ready,
            "notes": item.notes,
            "sort_order": item.sort_order,
        })

    return {
        "id": plan.id,
        "plan_date": plan.plan_date.isoformat(),
        "status": plan.status,
        "target_pairs": plan.target_pairs,
        "actual_pairs": plan.actual_pairs,
        "notes": plan.notes,
        "items": items,
        "progress_pct": round(plan.actual_pairs / max(plan.target_pairs, 1) * 100, 1),
    }


async def create_daily_plan(
    session: AsyncSession,
    plan_date: date,
    work_order_items: list[dict],
    actor: UserContext,
    notes: str | None = None,
) -> dict:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers can create production plans.")

    # Check no existing plan
    existing = await session.execute(
        select(DailyProductionPlan).where(DailyProductionPlan.plan_date == plan_date)
    )
    if existing.scalars().first():
        raise FactoryServiceError(409, f"Plan already exists for {plan_date.isoformat()}.")

    total_target = sum(item.get("target_pairs", 0) for item in work_order_items)

    plan = DailyProductionPlan(
        plan_date=plan_date,
        status="draft",
        target_pairs=total_target,
        notes=notes,
        created_by=actor.id,
    )
    session.add(plan)
    await session.flush()

    for idx, item_data in enumerate(work_order_items):
        plan_item = DailyPlanItem(
            plan_id=plan.id,
            work_order_id=item_data["work_order_id"],
            priority=item_data.get("priority", idx + 1),
            target_pairs=item_data.get("target_pairs", 0),
            materials_ready=item_data.get("materials_ready", False),
            notes=item_data.get("notes"),
            sort_order=idx,
        )
        session.add(plan_item)

    await session.flush()
    return await get_daily_plan(session, plan_date)  # type: ignore


async def confirm_daily_plan(session: AsyncSession, plan_id: UUID, actor: UserContext) -> dict:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers can confirm plans.")

    plan = await session.get(DailyProductionPlan, plan_id)
    if plan is None:
        raise FactoryServiceError(404, "Plan not found.")

    plan.status = "confirmed"
    plan.confirmed_by = actor.id
    plan.confirmed_at = datetime.now(UTC)
    await session.flush()
    return await get_daily_plan(session, plan.plan_date)  # type: ignore


async def update_plan_progress(
    session: AsyncSession,
    plan_item_id: UUID,
    actual_pairs: int,
) -> None:
    item = await session.get(DailyPlanItem, plan_item_id)
    if item is None:
        raise FactoryServiceError(404, "Plan item not found.")

    item.actual_pairs = actual_pairs

    # Update plan total
    plan = await session.get(DailyProductionPlan, item.plan_id)
    if plan:
        items_q = select(func.sum(DailyPlanItem.actual_pairs)).where(DailyPlanItem.plan_id == plan.id)
        total = (await session.execute(items_q)).scalar() or 0
        plan.actual_pairs = total
        if plan.status == "confirmed":
            plan.status = "in_progress"

    await session.flush()
