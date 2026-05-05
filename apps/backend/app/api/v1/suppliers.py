from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service_extended as svc
from app.modules.factory.schemas_extended import (
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter()


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = None,
) -> list[SupplierResponse]:
    return await svc.list_suppliers(session, page, page_size, search)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: UUID, session: DbSession) -> SupplierResponse:
    return await svc.get_supplier(session, supplier_id)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> SupplierResponse:
    result = await svc.create_supplier(session, payload, current_user)
    await session.commit()
    return result


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> SupplierResponse:
    result = await svc.update_supplier(session, supplier_id, payload, current_user)
    await session.commit()
    return result
