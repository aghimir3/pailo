import csv
from io import StringIO

from fastapi import APIRouter
from fastapi.responses import Response

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import DashboardResponse

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(session: DbSession) -> DashboardResponse:
    return await service.get_dashboard(session)


@router.get("/tasks.csv", response_class=Response)
async def export_tasks_csv(session: DbSession) -> Response:
    return _csv_response(await service.task_csv_rows(session), "pailo-tasks.csv")


@router.get("/low-stock.csv", response_class=Response)
async def export_low_stock_csv(session: DbSession) -> Response:
    return _csv_response(await service.low_stock_csv_rows(session), "pailo-low-stock.csv")


def _csv_response(rows: list[list[str]], filename: str) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
