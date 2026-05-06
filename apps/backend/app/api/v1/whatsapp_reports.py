"""WhatsApp reports API — trigger daily/weekly summaries."""

from datetime import date

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.modules.whatsapp.report_service import (
    generate_daily_summary,
    generate_weekly_summary,
    send_daily_report,
)

router = APIRouter(prefix="/reports/whatsapp", tags=["Reports - WhatsApp"])


@router.get("/daily-summary")
async def get_daily_summary(
    session: DbSession,
    user: CurrentUser,
    report_date: date | None = Query(None, description="Date for report (default: today)"),
) -> dict:
    """Preview daily WhatsApp report text."""
    text = await generate_daily_summary(session, report_date)
    return {"report_date": str(report_date or date.today()), "text": text}


@router.get("/weekly-summary")
async def get_weekly_summary(
    session: DbSession,
    user: CurrentUser,
    week_ending: date | None = Query(None, description="End date of the week (default: today)"),
) -> dict:
    """Preview weekly WhatsApp report text."""
    text = await generate_weekly_summary(session, week_ending)
    return {"week_ending": str(week_ending or date.today()), "text": text}


@router.post("/send-daily")
async def trigger_daily_report(
    session: DbSession,
    user: CurrentUser,
    report_date: date | None = Query(None),
) -> dict:
    """Trigger sending the daily report via WhatsApp."""
    sent = await send_daily_report(session, report_date)
    return {"sent": sent, "report_date": str(report_date or date.today())}
