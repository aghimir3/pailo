"""Worker productivity module: Production logs, piece-rate pay, rankings."""

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Employee, PieceRateConfig, WorkerProductionLog
from app.modules.factory.service import FactoryServiceError, UserContext

MANAGER_ROLES = {"owner_admin", "factory_manager"}


async def log_worker_production(
    session: AsyncSession,
    employee_id: UUID,
    production_date: date,
    stage: str,
    pairs_completed: int,
    hours_worked: Decimal | None = None,
    work_order_id: UUID | None = None,
    quality_pass_rate: Decimal | None = None,
    notes: str | None = None,
) -> dict:
    log = WorkerProductionLog(
        employee_id=employee_id,
        production_date=production_date,
        stage=stage,
        work_order_id=work_order_id,
        pairs_completed=pairs_completed,
        hours_worked=hours_worked,
        quality_pass_rate=quality_pass_rate,
        notes=notes,
    )
    session.add(log)
    await session.flush()

    return {
        "id": log.id,
        "employee_id": employee_id,
        "production_date": production_date.isoformat(),
        "stage": stage,
        "pairs_completed": pairs_completed,
        "hours_worked": float(hours_worked) if hours_worked else None,
        "pairs_per_hour": round(pairs_completed / float(hours_worked), 1) if hours_worked and hours_worked > 0 else None,
    }


async def get_worker_daily_output(
    session: AsyncSession, employee_id: UUID, target_date: date | None = None
) -> dict:
    if not target_date:
        target_date = date.today()

    query = select(WorkerProductionLog).where(
        WorkerProductionLog.employee_id == employee_id,
        WorkerProductionLog.production_date == target_date,
    )
    logs = list((await session.scalars(query)).all())

    total_pairs = sum(log.pairs_completed for log in logs)
    total_hours = sum(float(log.hours_worked or 0) for log in logs)
    stages_worked = list(set(log.stage for log in logs))

    return {
        "employee_id": employee_id,
        "date": target_date.isoformat(),
        "total_pairs": total_pairs,
        "total_hours": round(total_hours, 2),
        "pairs_per_hour": round(total_pairs / max(total_hours, 0.01), 1),
        "stages_worked": stages_worked,
        "entries": len(logs),
    }


async def get_team_productivity_ranking(
    session: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
    stage: str | None = None,
) -> list[dict]:
    if not date_from:
        date_from = date.today() - timedelta(days=7)
    if not date_to:
        date_to = date.today()

    query = (
        select(
            WorkerProductionLog.employee_id,
            Employee.full_name,
            func.sum(WorkerProductionLog.pairs_completed).label("total_pairs"),
            func.sum(WorkerProductionLog.hours_worked).label("total_hours"),
            func.avg(WorkerProductionLog.quality_pass_rate).label("avg_quality"),
        )
        .join(Employee, WorkerProductionLog.employee_id == Employee.id)
        .where(
            WorkerProductionLog.production_date >= date_from,
            WorkerProductionLog.production_date <= date_to,
        )
        .group_by(WorkerProductionLog.employee_id, Employee.full_name)
        .order_by(func.sum(WorkerProductionLog.pairs_completed).desc())
    )
    if stage:
        query = query.where(WorkerProductionLog.stage == stage)

    rows = (await session.execute(query)).all()

    rankings = []
    for idx, (emp_id, name, total_pairs, total_hours, avg_quality) in enumerate(rows, 1):
        hours = float(total_hours or 0)
        pairs = int(total_pairs or 0)
        rankings.append({
            "rank": idx,
            "employee_id": emp_id,
            "employee_name": name,
            "total_pairs": pairs,
            "total_hours": round(hours, 1),
            "pairs_per_hour": round(pairs / max(hours, 0.01), 1),
            "avg_quality_pct": round(float(avg_quality or 0), 1),
        })

    return rankings


async def get_productivity_trend(
    session: AsyncSession, employee_id: UUID, days: int = 30
) -> list[dict]:
    start_date = date.today() - timedelta(days=days)
    query = (
        select(
            WorkerProductionLog.production_date,
            func.sum(WorkerProductionLog.pairs_completed).label("pairs"),
            func.sum(WorkerProductionLog.hours_worked).label("hours"),
        )
        .where(
            WorkerProductionLog.employee_id == employee_id,
            WorkerProductionLog.production_date >= start_date,
        )
        .group_by(WorkerProductionLog.production_date)
        .order_by(WorkerProductionLog.production_date)
    )
    rows = (await session.execute(query)).all()

    return [
        {
            "date": d.isoformat(),
            "pairs": int(pairs or 0),
            "hours": round(float(hours or 0), 1),
            "pairs_per_hour": round(int(pairs or 0) / max(float(hours or 0), 0.01), 1),
        }
        for d, pairs, hours in rows
    ]


async def calculate_piece_rate_pay(
    session: AsyncSession,
    employee_id: UUID,
    period_start: date,
    period_end: date,
) -> dict:
    # Get production logs for period
    logs_q = select(WorkerProductionLog).where(
        WorkerProductionLog.employee_id == employee_id,
        WorkerProductionLog.production_date >= period_start,
        WorkerProductionLog.production_date <= period_end,
    )
    logs = list((await session.scalars(logs_q)).all())

    # Get piece rate configs
    rates_q = select(PieceRateConfig).where(
        PieceRateConfig.effective_from <= period_end,
        (PieceRateConfig.effective_to.is_(None)) | (PieceRateConfig.effective_to >= period_start),
    )
    rates = list((await session.scalars(rates_q)).all())

    total_earned = Decimal("0")
    total_pairs = 0
    daily_breakdown = []

    rate_map = {r.stage: r.rate_per_pair for r in rates}

    for log in logs:
        rate = rate_map.get(log.stage, Decimal("0"))
        earned = rate * log.pairs_completed
        total_earned += earned
        total_pairs += log.pairs_completed
        daily_breakdown.append({
            "date": log.production_date.isoformat(),
            "stage": log.stage,
            "pairs": log.pairs_completed,
            "rate": float(rate),
            "earned_npr": float(earned),
        })

    employee = await session.get(Employee, employee_id)

    return {
        "employee_id": employee_id,
        "employee_name": employee.full_name if employee else "Unknown",
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "total_pairs": total_pairs,
        "total_earned_npr": float(total_earned),
        "working_days": len(set(log.production_date for log in logs)),
        "daily_breakdown": daily_breakdown,
    }


async def list_piece_rate_configs(session: AsyncSession) -> list[dict]:
    query = select(PieceRateConfig).order_by(PieceRateConfig.stage, PieceRateConfig.effective_from.desc())
    configs = list((await session.scalars(query)).all())
    return [
        {
            "id": c.id,
            "stage": c.stage,
            "style_category": c.style_category,
            "rate_per_pair": float(c.rate_per_pair),
            "effective_from": c.effective_from.isoformat(),
            "effective_to": c.effective_to.isoformat() if c.effective_to else None,
        }
        for c in configs
    ]


async def create_piece_rate_config(
    session: AsyncSession,
    stage: str,
    rate_per_pair: Decimal,
    effective_from: date,
    actor: UserContext,
    style_category: str | None = None,
    effective_to: date | None = None,
) -> dict:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers can set piece rates.")

    config = PieceRateConfig(
        stage=stage,
        style_category=style_category,
        rate_per_pair=rate_per_pair,
        effective_from=effective_from,
        effective_to=effective_to,
        created_by=actor.id,
    )
    session.add(config)
    await session.flush()
    return {
        "id": config.id,
        "stage": stage,
        "rate_per_pair": float(rate_per_pair),
        "effective_from": effective_from.isoformat(),
    }
