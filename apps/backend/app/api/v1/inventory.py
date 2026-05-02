from fastapi import APIRouter

from app.modules.factory.sample_data import inventory_alerts
from app.modules.factory.schemas import InventoryAlert

router = APIRouter()


@router.get("/low-stock", response_model=list[InventoryAlert])
async def list_low_stock() -> list[InventoryAlert]:
    return inventory_alerts()
