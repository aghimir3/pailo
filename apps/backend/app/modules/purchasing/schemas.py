"""Purchasing schemas."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class POItemCreate(BaseModel):
    material_id: UUID
    quantity_ordered: Decimal = Field(gt=0)
    unit_price_npr: Decimal = Field(ge=0)
    unit: str | None = None
    notes: str | None = None


class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    items: list[POItemCreate] = Field(min_length=1)
    order_date: date | None = None
    expected_delivery_date: date | None = None
    notes: str | None = None


class POItemReceive(BaseModel):
    item_id: UUID
    quantity_received: Decimal = Field(gt=0)


class PurchaseOrderReceive(BaseModel):
    items: list[POItemReceive] = Field(min_length=1)
