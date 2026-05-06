"""Production API routes: stage tracking, bottleneck analysis, daily plans."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.production import (
    complete_stage,
    confirm_daily_plan,
    create_daily_plan,
    get_bottleneck_analysis,
    get_daily_plan,
    get_stage_logs_for_work_order,
    pause_stage,
    resume_stage,
    start_stage,
    update_plan_progress,
)
from app.modules.production.schemas import (
    DailyPlanCreate,
    PlanProgressUpdate,
    StageCompleteRequest,
    StageStartRequest,
)

router = APIRouter()


# ── Stage Time Tracking ───────────────────────────────────────────


@router.post("/stages/start", status_code=status.HTTP_201_CREATED)
async def start_stage_route(
    payload: StageStartRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await start_stage(
        session,
        work_order_id=payload.work_order_id,
        stage=payload.stage,
        actor=current_user,
        worker_count=payload.worker_count,
        pairs_input=payload.pairs_input,
    )
    await session.commit()
    return result


@router.post("/stages/{stage_log_id}/complete")
async def complete_stage_route(
    stage_log_id: UUID,
    payload: StageCompleteRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await complete_stage(
        session,
        stage_log_id=stage_log_id,
        actor=current_user,
        pairs_output=payload.pairs_output,
        pairs_defect=payload.pairs_defect,
        notes=payload.notes,
    )
    await session.commit()
    return result


@router.post("/stages/{stage_log_id}/pause")
async def pause_stage_route(
    stage_log_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await pause_stage(session, stage_log_id, current_user)
    await session.commit()
    return result


@router.post("/stages/{stage_log_id}/resume")
async def resume_stage_route(
    stage_log_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await resume_stage(session, stage_log_id, current_user)
    await session.commit()
    return result


@router.get("/stages/work-order/{work_order_id}")
async def get_work_order_stages(work_order_id: UUID, session: DbSession) -> list[dict]:
    return await get_stage_logs_for_work_order(session, work_order_id)


# ── Bottleneck Analysis ───────────────────────────────────────────


@router.get("/bottleneck")
async def bottleneck_analysis(
    session: DbSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    return await get_bottleneck_analysis(session, date_from, date_to)


# ── Daily Production Plans ────────────────────────────────────────


@router.get("/plans/today")
async def get_today_plan(session: DbSession) -> dict | None:
    return await get_daily_plan(session)


@router.get("/plans/{plan_date}")
async def get_plan_by_date(plan_date: date, session: DbSession) -> dict | None:
    return await get_daily_plan(session, plan_date)


@router.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: DailyPlanCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_daily_plan(
        session,
        plan_date=payload.plan_date,
        work_order_items=[item.model_dump() for item in payload.items],
        actor=current_user,
        notes=payload.notes,
    )
    await session.commit()
    return result


@router.post("/plans/{plan_id}/confirm")
async def confirm_plan(
    plan_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await confirm_daily_plan(session, plan_id, current_user)
    await session.commit()
    return result


@router.patch("/plans/items/{plan_item_id}/progress")
async def update_progress(
    plan_item_id: UUID,
    payload: PlanProgressUpdate,
    session: DbSession,
) -> dict:
    await update_plan_progress(session, plan_item_id, payload.actual_pairs)
    await session.commit()
    return {"status": "updated"}
