"""Sales schemas."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    type: str = "wholesale"
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    credit_limit_npr: Decimal | None = None
    payment_terms_days: int = 30
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    credit_limit_npr: Decimal | None = None
    payment_terms_days: int | None = None
    notes: str | None = None
    is_active: bool | None = None


class SOItemCreate(BaseModel):
    style_id: UUID
    color: str | None = None
    size: str | None = None
    quantity_ordered: int = Field(gt=0)
    unit_price_npr: Decimal = Field(ge=0)


class SalesOrderCreate(BaseModel):
    customer_id: UUID
    items: list[SOItemCreate] = Field(min_length=1)
    requested_delivery_date: date | None = None
    notes: str | None = None


class DispatchItemCreate(BaseModel):
    sales_order_item_id: UUID
    quantity: int = Field(gt=0)


class DispatchCreate(BaseModel):
    items: list[DispatchItemCreate] = Field(min_length=1)
    transport_method: str | None = None
    tracking_number: str | None = None
    notes: str | None = None
