"""Pydantic schemas for extended factory APIs (Styles, BOM, Suppliers, WO mutations, Inventory, QC)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# =============================================================================
# Product Styles
# =============================================================================

class ProductStyleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = None
    size_range: str | None = None
    sample_status: str | None = None
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None


class ProductStyleUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    size_range: str | None = None
    sample_status: str | None = None
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None
    version: int = Field(ge=1)


class ProductStyleResponse(BaseModel):
    id: UUID
    style_code: str
    name: str
    category: str
    description: str | None = None
    size_range: str | None = None
    sample_status: str
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None
    created_at: datetime
    version: int


class ProductStyleDetail(ProductStyleResponse):
    active_bom: "BomVersionResponse | None" = None


# =============================================================================
# BOM
# =============================================================================

class BomItemInput(BaseModel):
    material_id: UUID
    quantity_per_pair: Decimal = Field(gt=0, max_digits=10, decimal_places=4)
    wastage_percent: Decimal = Field(ge=0, le=100, default=Decimal("5"), max_digits=5, decimal_places=2)


class BomVersionCreate(BaseModel):
    notes: str | None = None
    items: list[BomItemInput] = Field(min_length=1)


class BomItemResponse(BaseModel):
    id: UUID
    material_id: UUID
    material_code: str
    material_name: str
    quantity_per_pair: Decimal
    wastage_percent: Decimal
    cost_snapshot_npr: Decimal
    line_cost_npr: Decimal


class BomVersionResponse(BaseModel):
    id: UUID
    version: int
    status: str
    notes: str | None = None
    total_cost_per_pair_npr: Decimal
    items: list[BomItemResponse]
    approved_at: datetime | None = None
    created_at: datetime


# =============================================================================
# Suppliers
# =============================================================================

class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    material_categories: list[str] = Field(default_factory=list)
    payment_terms: str | None = None
    usual_lead_time_days: int | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    material_categories: list[str] | None = None
    payment_terms: str | None = None
    usual_lead_time_days: int | None = None
    rating: Decimal | None = Field(None, ge=0, le=5)
    notes: str | None = None
    version: int = Field(ge=1)


class SupplierResponse(BaseModel):
    id: UUID
    supplier_code: str
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    material_categories: list[str]
    payment_terms: str | None = None
    usual_lead_time_days: int | None = None
    rating: Decimal | None = None
    notes: str | None = None
    created_at: datetime
    version: int


# =============================================================================
# Work Orders (Mutations)
# =============================================================================

class WorkOrderSizeLineInput(BaseModel):
    color: str = Field(min_length=1, max_length=50)
    size: str = Field(min_length=1, max_length=20)
    planned_pairs: int = Field(gt=0)


class WorkOrderCreate(BaseModel):
    product_style_id: UUID
    size_lines: list[WorkOrderSizeLineInput] = Field(min_length=1)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    planned_start_date: date | None = None
    due_date: date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def check_dates(self) -> Self:
        if self.planned_start_date and self.due_date and self.planned_start_date > self.due_date:
            raise ValueError("planned_start_date must be before due_date")
        return self


class WorkOrderUpdate(BaseModel):
    priority: str | None = None
    status: str | None = None
    due_date: date | None = None
    notes: str | None = None
    version: int = Field(ge=1)


class WorkOrderCreateResponse(BaseModel):
    id: UUID
    work_order_code: str
    style_name: str
    planned_pairs: int
    cost_snapshot_npr: Decimal | None = None


# =============================================================================
# Materials & Inventory
# =============================================================================

class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    unit_of_measure: str = Field(min_length=1, max_length=30)
    supplier_id: UUID | None = None
    minimum_stock: Decimal = Field(ge=0, default=Decimal("0"))
    average_cost_npr: Decimal | None = None
    location: str | None = None
    reorder_point: Decimal | None = Field(None, ge=0)
    reorder_quantity: Decimal | None = Field(None, ge=0)
    lead_time_days: int | None = Field(None, ge=1, le=365)


class MaterialUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit_of_measure: str | None = None
    supplier_id: UUID | None = None
    minimum_stock: Decimal | None = None
    location: str | None = None
    reorder_point: Decimal | None = None
    reorder_quantity: Decimal | None = None
    lead_time_days: int | None = None
    version: int = Field(ge=1)


class MaterialResponse(BaseModel):
    id: UUID
    material_code: str
    name: str
    category: str
    unit_of_measure: str
    supplier_id: UUID | None = None
    supplier_name: str | None = None
    minimum_stock: Decimal
    current_stock: Decimal
    average_cost_npr: Decimal | None = None
    last_purchase_cost_npr: Decimal | None = None
    location: str | None = None
    reorder_point: Decimal | None = None
    reorder_quantity: Decimal | None = None
    lead_time_days: int | None = None
    daily_consumption_rate: Decimal | None = None
    days_until_stockout: Decimal | None = None
    days_until_reorder: Decimal | None = None
    risk: str
    version: int


class ReceiveStockInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=4)
    unit_cost_npr: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    supplier_id: UUID | None = None
    lot_number: str | None = Field(None, max_length=50)
    notes: str | None = Field(None, max_length=500)


class IssueStockInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=4)
    work_order_id: UUID
    notes: str | None = Field(None, max_length=500)


class AdjustStockInput(BaseModel):
    material_id: UUID
    quantity_delta: Decimal
    reason: str = Field(min_length=5, max_length=500)
    notes: str | None = None


class WastageInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0)
    work_order_id: UUID | None = None
    reason: str = Field(min_length=5, max_length=500)


class MovementResponse(BaseModel):
    id: UUID
    movement_code: str
    material_name: str
    movement_type: str
    quantity: Decimal
    unit: str
    reason: str | None = None
    created_at: datetime


# =============================================================================
# Purchase Suggestions & Stock Alerts
# =============================================================================

class PurchaseSuggestionResponse(BaseModel):
    material_id: UUID
    material_name: str
    material_code: str
    category: str
    unit: str
    current_stock: Decimal
    current_available: Decimal
    reorder_point: Decimal
    suggested_quantity: Decimal
    estimated_cost_npr: Decimal | None = None
    supplier_name: str | None = None
    supplier_phone: str | None = None
    lead_time_days: int | None = None
    daily_consumption_rate: Decimal | None = None
    days_until_stockout: Decimal | None = None
    urgency: str  # critical | warning | info


class StockAlertResponse(BaseModel):
    id: UUID
    material_id: UUID
    material_name: str
    material_code: str
    alert_type: str
    current_stock: Decimal
    threshold: Decimal
    unit: str
    days_remaining: Decimal | None = None
    supplier_name: str | None = None
    acknowledged: bool
    acknowledged_at: datetime | None = None
    acknowledged_by: str | None = None
    po_reference: str | None = None
    created_at: datetime


class AcknowledgeAlertInput(BaseModel):
    po_reference: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=500)


class InventoryHealthResponse(BaseModel):
    total_materials: int
    healthy_count: int
    low_count: int
    critical_count: int
    no_movement_30d_count: int
    total_inventory_value_npr: Decimal
    risk_breakdown: list[dict]
    fastest_depleting: list[dict]
    dead_stock: list[dict]
    consumption_trend: list[dict]


# =============================================================================
# QC Inspections
# =============================================================================

class InspectionCreate(BaseModel):
    work_order_id: UUID
    inspected_quantity: int = Field(gt=0)
    notes: str | None = None


class DefectInput(BaseModel):
    defect_type: str = Field(min_length=1, max_length=50)
    quantity: int = Field(gt=0)
    severity: Literal["minor", "major", "critical"] = "minor"
    notes: str | None = Field(None, max_length=500)


class DefectResponse(BaseModel):
    id: UUID
    defect_type: str
    quantity: int
    severity: str | None = None
    notes: str | None = None


class InspectionApprove(BaseModel):
    passed_quantity: int = Field(gt=0)
    notes: str | None = None


class InspectionFail(BaseModel):
    failed_quantity: int = Field(gt=0)
    rework_quantity: int = Field(ge=0, default=0)
    create_rework_task: bool = True
    rework_notes: str | None = None


class InspectionResponse(BaseModel):
    id: UUID
    inspection_code: str
    work_order_code: str | None = None
    inspected_by: str | None = None
    inspected_at: datetime
    inspected_quantity: int
    defect_quantity: int
    status: str
    notes: str | None = None
    defects: list[DefectResponse] = Field(default_factory=list)
