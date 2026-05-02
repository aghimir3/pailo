from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import InventoryAlert, MaterialStockRecord

router = APIRouter()


@router.get("/low-stock", response_model=list[InventoryAlert])
async def list_low_stock(session: DbSession) -> list[InventoryAlert]:
    return await service.list_low_stock_alerts(session)


@router.get("/materials", response_model=list[MaterialStockRecord])
async def list_materials(session: DbSession) -> list[MaterialStockRecord]:
    return await service.list_material_stock(session)
