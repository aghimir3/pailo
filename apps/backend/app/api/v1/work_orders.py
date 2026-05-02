from fastapi import APIRouter

from app.modules.factory.sample_data import work_orders
from app.modules.factory.schemas import WorkOrderSummary

router = APIRouter()


@router.get("", response_model=list[WorkOrderSummary])
async def list_work_orders() -> list[WorkOrderSummary]:
    return work_orders()
