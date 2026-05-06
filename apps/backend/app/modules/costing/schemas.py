"""Costing schemas."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BOMItemCreate(BaseModel):
    material_id: UUID
    quantity_per_pair: Decimal = Field(gt=0)
    wastage_pct: Decimal = Field(ge=0, le=50, default=Decimal("5.0"))
    unit: str = "pcs"
    notes: str | None = None


class BOMVersionCreate(BaseModel):
    style_id: UUID
    items: list[BOMItemCreate] = Field(min_length=1)
    notes: str | None = None


class MaterialPriceCreate(BaseModel):
    material_id: UUID
    price_per_unit: Decimal = Field(gt=0)
    supplier_id: UUID | None = None
    source: str = "manual_entry"
