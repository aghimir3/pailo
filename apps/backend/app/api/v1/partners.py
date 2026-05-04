"""Partner inquiry API — public endpoint for partnership form submissions."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text as sa_text

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import PartnerInquiry

router = APIRouter()


class PartnerInquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    business_name: str | None = Field(None, max_length=200)
    phone: str = Field(..., min_length=7, max_length=40)
    email: str | None = Field(None, max_length=256)
    location: str | None = Field(None, max_length=200)
    partner_type: str = Field("retail", pattern=r"^(retail|supermarket|direct|wholesale|other)$")
    message: str | None = Field(None, max_length=2000)


class PartnerInquiryResponse(BaseModel):
    id: UUID
    name: str
    business_name: str | None
    phone: str
    email: str | None
    location: str | None
    partner_type: str
    message: str | None
    status: str

    model_config = {"from_attributes": True}


@router.post("", response_model=PartnerInquiryResponse, status_code=201)
async def create_partner_inquiry(
    payload: PartnerInquiryCreate,
    session: DbSession,
) -> PartnerInquiry:
    """Public endpoint — no auth required. Creates a new partner inquiry."""
    # Rate-limit: max 10 inquiries from same phone in last 24 hours
    recent_count_result = await session.execute(
        sa_text(
            "SELECT count(*) FROM partner_inquiries "
            "WHERE phone = :phone AND created_at >= now() - interval '24 hours'"
        ),
        {"phone": payload.phone},
    )
    recent_count = recent_count_result.scalar() or 0
    if recent_count >= 10:
        raise HTTPException(
            status_code=429,
            detail="Too many inquiries from this phone number. Please try again later.",
        )

    inquiry = PartnerInquiry(
        name=payload.name,
        business_name=payload.business_name,
        phone=payload.phone,
        email=payload.email,
        location=payload.location,
        partner_type=payload.partner_type,
        message=payload.message,
    )
    session.add(inquiry)
    await session.commit()
    await session.refresh(inquiry)
    return inquiry


@router.get("", response_model=list[PartnerInquiryResponse])
async def list_partner_inquiries(
    session: DbSession,
    current_user: CurrentUser,
) -> list[PartnerInquiry]:
    """Auth-protected — lists all partner inquiries for staff."""
    result = await session.execute(
        select(PartnerInquiry).order_by(PartnerInquiry.created_at.desc())
    )
    return list(result.scalars().all())
