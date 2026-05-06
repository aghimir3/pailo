"""Worker Productivity API routes."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from app.api.dependencies import CurrentUser, DbSession
from app.modules.productivity import (
    calculate_piece_rate_pay,
    create_piece_rate_config,
    get_productivity_trend,
    get_team_productivity_ranking,
    get_worker_daily_output,
    list_piece_rate_configs,
    log_worker_production,
)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────


class LogProductionRequest(BaseModel):
    employee_id: UUID
    production_date: date
    stage: str
    pairs_completed: int = Field(gt=0)
    hours_worked: Decimal | None = None
    work_order_id: UUID | None = None
    quality_pass_rate: Decimal | None = None
    notes: str | None = None


class CreatePieceRateRequest(BaseModel):
    stage: str
    rate_per_pair: Decimal = Field(gt=0)
    effective_from: date
    style_category: str | None = None
    effective_to: date | None = None


# ── Production Logging ────────────────────────────────────────────


@router.post("/log", status_code=status.HTTP_201_CREATED)
async def log_production(
    payload: LogProductionRequest,
    session: DbSession,
) -> dict:
    result = await log_worker_production(
        session,
        employee_id=payload.employee_id,
        production_date=payload.production_date,
        stage=payload.stage,
        pairs_completed=payload.pairs_completed,
        hours_worked=payload.hours_worked,
        work_order_id=payload.work_order_id,
        quality_pass_rate=payload.quality_pass_rate,
        notes=payload.notes,
    )
    await session.commit()
    return result


@router.get("/workers/{employee_id}/daily")
async def worker_daily(
    employee_id: UUID,
    session: DbSession,
    target_date: date | None = None,
) -> dict:
    return await get_worker_daily_output(session, employee_id, target_date)


@router.get("/workers/{employee_id}/trend")
async def worker_trend(
    employee_id: UUID,
    session: DbSession,
    days: int = Query(30, ge=7, le=365),
) -> list[dict]:
    return await get_productivity_trend(session, employee_id, days)


# ── Team Rankings ─────────────────────────────────────────────────


@router.get("/rankings")
async def team_rankings(
    session: DbSession,
    date_from: date | None = None,
    date_to: date | None = None,
    stage: str | None = None,
) -> list[dict]:
    return await get_team_productivity_ranking(session, date_from, date_to, stage)


# ── Piece Rate ────────────────────────────────────────────────────


@router.get("/piece-rates")
async def list_rates(session: DbSession) -> list[dict]:
    return await list_piece_rate_configs(session)


@router.post("/piece-rates", status_code=status.HTTP_201_CREATED)
async def create_rate(
    payload: CreatePieceRateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_piece_rate_config(
        session,
        stage=payload.stage,
        rate_per_pair=payload.rate_per_pair,
        effective_from=payload.effective_from,
        actor=current_user,
        style_category=payload.style_category,
        effective_to=payload.effective_to,
    )
    await session.commit()
    return result


@router.get("/workers/{employee_id}/pay")
async def worker_pay(
    employee_id: UUID,
    session: DbSession,
    period_start: date = Query(...),
    period_end: date = Query(...),
) -> dict:
    return await calculate_piece_rate_pay(session, employee_id, period_start, period_end)
