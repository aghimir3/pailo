from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import OperationsCatalogResponse

router = APIRouter()


@router.get("/catalog", response_model=OperationsCatalogResponse)
async def get_operations_catalog(session: DbSession) -> OperationsCatalogResponse:
    return await service.get_operations_catalog(session)