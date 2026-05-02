from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import MvpCatalogResponse

router = APIRouter()


@router.get("/mvp", response_model=MvpCatalogResponse)
async def get_mvp_catalog(session: DbSession) -> MvpCatalogResponse:
    return await service.get_mvp_catalog(session)