from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas_extended import (
    BomVersionCreate,
    BomVersionResponse,
    ProductStyleCreate,
    ProductStyleDetail,
    ProductStyleResponse,
    ProductStyleUpdate,
)

router = APIRouter()


@router.get("", response_model=list[ProductStyleResponse])
async def list_styles(
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = None,
) -> list[ProductStyleResponse]:
    return await svc.list_product_styles(session, page, page_size, search)


@router.get("/{style_id}", response_model=ProductStyleDetail)
async def get_style(style_id: UUID, session: DbSession) -> ProductStyleDetail:
    return await svc.get_product_style(session, style_id)


@router.post("", response_model=ProductStyleResponse, status_code=status.HTTP_201_CREATED)
async def create_style(
    payload: ProductStyleCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> ProductStyleResponse:
    result = await svc.create_product_style(session, payload, current_user)
    await session.commit()
    return result


@router.patch("/{style_id}", response_model=ProductStyleResponse)
async def update_style(
    style_id: UUID,
    payload: ProductStyleUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> ProductStyleResponse:
    result = await svc.update_product_style(session, style_id, payload, current_user)
    await session.commit()
    return result


# --- BOM ---

@router.get("/{style_id}/bom", response_model=list[BomVersionResponse])
async def list_bom_versions(style_id: UUID, session: DbSession) -> list[BomVersionResponse]:
    return await svc.list_bom_versions(session, style_id)


@router.post("/{style_id}/bom", response_model=BomVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_bom(
    style_id: UUID,
    payload: BomVersionCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> BomVersionResponse:
    result = await svc.create_bom_version(session, style_id, payload, current_user)
    await session.commit()
    return result


@router.post("/{style_id}/bom/{bom_id}/approve", response_model=BomVersionResponse)
async def approve_bom(
    style_id: UUID,
    bom_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> BomVersionResponse:
    result = await svc.approve_bom_version(session, style_id, bom_id, current_user)
    await session.commit()
    return result
