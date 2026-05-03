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


class LandingPageConfig(BaseModel):
    """Full landing page configuration stored as JSON."""

    contact_phone: str = "9852030953"
    hero_badge: str = "Made in Nepal"
    hero_title: str = "Shoes that last as long as"
    hero_title_highlight: str = "your day does."
    hero_subtitle: str = (
        "Durable, comfortable footwear built for real life — from school runs "
        "to shop floors. Nepal-made quality at prices that make sense."
    )
    hero_cta_primary: str = "Why Pailo"
    hero_cta_secondary: str = "Stock our shoes"
    why_eyebrow: str = "Why Pailo"
    why_heading: str = "Footwear that earns its place in your day."
    value_props: list[dict[str, str]] = [
        {
            "title": "Built to last",
            "desc": "Durable construction that handles Nepal's streets, monsoons, and daily grind without falling apart.",
            "icon": "Shield",
        },
        {
            "title": "Comfortable fit",
            "desc": "Practical materials and proven patterns designed for all-day wear — school, work, everywhere.",
            "icon": "Heart",
        },
        {
            "title": "Made in Nepal",
            "desc": "Local production means faster restocking, competitive pricing, and shoes built for local conditions.",
            "icon": "MapPin",
        },
    ]
    buyers_eyebrow: str = "For buyers & partners"
    buyers_heading: str = "Whether you stock shelves or buy direct — we make it easy."
    buyer_cards: list[dict[str, str]] = [
        {
            "title": "Retail shops",
            "desc": "Consistent size runs, clean labels, and reliable batch supply that keeps your shelves stocked.",
            "icon": "Handshake",
            "highlight": "Restocking made simple",
        },
        {
            "title": "Supermarkets",
            "desc": "Display-ready packaging, organized pricing, and production records for easy aisle management.",
            "icon": "PackageCheck",
            "highlight": "Shelf-ready from the box",
        },
        {
            "title": "Direct buyers",
            "desc": "Quality daily footwear at factory prices — for schools, offices, and families who value durability.",
            "icon": "Footprints",
            "highlight": "Factory price, retail quality",
        },
    ]
    proof_heading: str = "Quality you can see. Supply you can count on."
    proof_points: list[str] = [
        "Quality-inspected before every dispatch",
        "Consistent batches you can reorder with confidence",
        "Organized dispatch with full production records",
        "Growing capacity — 1,000+ pairs per day",
    ]
    proof_cta: str = "Start a partnership"
    dispatch_card_title: str = "Ready when you are"
    dispatch_card_text: str = "Every pair leaves with labels, records, and quality checks complete."
    footer_tagline: str = "Nepal-made footwear that lasts."


@router.get("/public", response_model=list[SiteSettingResponse])
async def get_public_settings(session: DbSession) -> list[SiteSettingResponse]:
    """Public endpoint — returns all site settings (no auth required)."""
    result = await session.execute(select(SiteSetting))
    settings = result.scalars().all()
    return [SiteSettingResponse(key=s.key, value=s.value) for s in settings]


@router.get("/landing-page", response_model=LandingPageConfig)
async def get_landing_page_config(session: DbSession) -> LandingPageConfig:
    """Public endpoint — returns the full landing page configuration."""
    result = await session.execute(
        select(SiteSetting).where(SiteSetting.key == "landing_page_config")
    )
    setting = result.scalar_one_or_none()
    if setting is None:
        return LandingPageConfig()

    import json

    try:
        data = json.loads(setting.value)
        return LandingPageConfig(**data)
    except (json.JSONDecodeError, TypeError):
        return LandingPageConfig()


@router.put("/landing-page", response_model=LandingPageConfig)
async def update_landing_page_config(
    body: LandingPageConfig,
    session: DbSession,
    user: CurrentUser,
) -> LandingPageConfig:
    """Update the full landing page config. Requires authenticated user."""
    import json

    result = await session.execute(
        select(SiteSetting).where(SiteSetting.key == "landing_page_config")
    )
    setting = result.scalar_one_or_none()

    json_value = json.dumps(body.model_dump(), ensure_ascii=False)

    if setting is None:
        setting = SiteSetting(
            key="landing_page_config",
            value=json_value,
            description="Full landing page content configuration",
        )
        session.add(setting)
    else:
        setting.value = json_value

    await session.commit()
    return body


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
