from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import SiteSetting

router = APIRouter()


class SiteSettingResponse(BaseModel):
    key: str
    value: str


class SiteSettingUpdateRequest(BaseModel):
    value: str


@router.get("/public", response_model=list[SiteSettingResponse])
async def get_public_settings(session: DbSession) -> list[SiteSettingResponse]:
    """Public endpoint — returns all site settings (no auth required)."""
    result = await session.execute(select(SiteSetting))
    settings = result.scalars().all()
    return [SiteSettingResponse(key=s.key, value=s.value) for s in settings]


@router.put("/{key}", response_model=SiteSettingResponse)
async def update_setting(
    key: str,
    body: SiteSettingUpdateRequest,
    session: DbSession,
    user: CurrentUser,
) -> SiteSettingResponse:
    """Update a site setting. Requires authenticated user."""
    result = await session.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()

    if setting is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    setting.value = body.value
    await session.commit()
    await session.refresh(setting)
    return SiteSettingResponse(key=setting.key, value=setting.value)
