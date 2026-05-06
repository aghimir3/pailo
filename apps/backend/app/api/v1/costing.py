"""Costing API routes."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.costing import (
    add_material_price,
    approve_bom_version,
    create_bom_version,
    create_cost_snapshot,
    get_bom_version_detail,
    get_cost_variance_report,
    list_bom_versions,
)
from app.modules.costing.schemas import BOMVersionCreate, MaterialPriceCreate

router = APIRouter()


@router.get("/bom/{style_id}")
async def list_bom(style_id: UUID, session: DbSession) -> list[dict]:
    return await list_bom_versions(session, style_id)


@router.get("/bom/detail/{bom_version_id}")
async def get_bom_detail(bom_version_id: UUID, session: DbSession) -> dict:
    return await get_bom_version_detail(session, bom_version_id)


@router.post("/bom", status_code=status.HTTP_201_CREATED)
async def create_bom(
    payload: BOMVersionCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_bom_version(
        session,
        style_id=payload.style_id,
        items=[item.model_dump() for item in payload.items],
        actor=current_user,
        notes=payload.notes,
    )
    await session.commit()
    return result


@router.post("/bom/{bom_version_id}/approve")
async def approve_bom(
    bom_version_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await approve_bom_version(session, bom_version_id, current_user)
    await session.commit()
    return result


@router.post("/snapshot/{work_order_id}", status_code=status.HTTP_201_CREATED)
async def create_snapshot(
    work_order_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await create_cost_snapshot(session, work_order_id, current_user)
    await session.commit()
    return result


@router.get("/variance")
async def cost_variance(
    session: DbSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    return await get_cost_variance_report(session, date_from, date_to)


@router.post("/prices", status_code=status.HTTP_201_CREATED)
async def add_price(
    payload: MaterialPriceCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> dict:
    result = await add_material_price(
        session,
        material_id=payload.material_id,
        price_per_unit=payload.price_per_unit,
        supplier_id=payload.supplier_id,
        actor=current_user,
        source=payload.source,
    )
    await session.commit()
    return result
