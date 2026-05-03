from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class Kpi(BaseModel):
    label: str
    value: str
    detail: str
    tone: str = Field(pattern="^(neutral|green|amber|red|cyan)$")
    trend: str


class ThroughputPoint(BaseModel):
    day: str
    planned: int
    completed: int


class WorkOrderSummary(BaseModel):
    code: str
    style: str
    color: str
    planned_pairs: int
    completed_pairs: int
    stage: str
    blocker: str | None = None
    due: str


class TaskSummary(BaseModel):
    code: str
    title: str
    status: str
    priority: str
    assignee: str
    due_time: str
    work_order: str | None = None
    quantity: str | None = None
    blocker_reason: str | None = None


class InventoryAlert(BaseModel):
    material: str
    code: str
    current: str
    minimum: str
    risk: str
    supplier: str


class QualitySignal(BaseModel):
    label: str
    value: str
    detail: str
    tone: str


class OwnerInsight(BaseModel):
    title: str
    detail: str
    action: str
    tone: str


class DashboardResponse(BaseModel):
    production_date: str
    target_cost_npr: int
    kpis: list[Kpi]
    throughput: list[ThroughputPoint]
    work_orders: list[WorkOrderSummary]
    my_tasks: list[TaskSummary]
    inventory_alerts: list[InventoryAlert]
    quality_signals: list[QualitySignal]
    owner_insights: list[OwnerInsight]


class UserRef(BaseModel):
    id: UUID
    display_name: str
    email: str | None = None
    role: str


class EmployeeRef(BaseModel):
    id: UUID
    employee_code: str
    full_name: str
    department: str | None = None
    job_title: str | None = None


class ProductStyleRecord(BaseModel):
    id: UUID
    style_code: str
    name: str
    category: str
    sample_status: str
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None


class SupplierRecord(BaseModel):
    id: UUID
    supplier_code: str
    name: str
    contact_person: str | None = None
    phone: str | None = None
    material_categories: list[str]
    usual_lead_time_days: int | None = None
    notes: str | None = None


class MaterialStockRecord(BaseModel):
    id: UUID
    material_code: str
    name: str
    category: str
    unit_of_measure: str
    supplier: str | None = None
    current_quantity: Decimal
    minimum_stock: Decimal
    average_cost_npr: Decimal | None = None
    location: str | None = None
    risk: str


class WorkOrderSizeLineRecord(BaseModel):
    id: UUID
    color: str
    size: str
    planned_pairs: int
    completed_pairs: int


class WorkOrderRecord(BaseModel):
    id: UUID
    work_order_code: str
    style_code: str
    style_name: str
    status: str
    priority: str
    planned_pairs: int
    completed_pairs: int
    current_stage: str | None = None
    due_date: date | None = None
    cost_snapshot_npr: Decimal | None = None
    version: int
    blocker: str | None = None
    size_lines: list[WorkOrderSizeLineRecord] = Field(default_factory=list)


class TaskCommentRecord(BaseModel):
    id: UUID
    task_id: UUID
    author_user_id: UUID
    author_name: str
    comment_text: str
    client_message_id: str | None = None
    created_at: datetime
    updated_at: datetime
    edited_at: datetime | None = None
    version: int


class TaskRecord(BaseModel):
    id: UUID
    task_code: str
    title: str
    description: str | None = None
    status: str
    priority: str
    assignee: UserRef | None = None
    assigned_employee: EmployeeRef | None = None
    assigned_team: str | None = None
    work_order_id: UUID | None = None
    work_order_code: str | None = None
    product_style_code: str | None = None
    due_at: datetime | None = None
    estimated_quantity: Decimal | None = None
    completed_quantity: Decimal
    unit_of_measure: str | None = None
    blocked_reason: str | None = None
    requires_review: bool
    started_at: datetime | None = None
    completed_at: datetime | None = None
    reviewed_at: datetime | None = None
    version: int
    comments: list[TaskCommentRecord] = Field(default_factory=list)


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    description: str | None = None
    status: str = Field(default="ready")
    priority: str = Field(default="normal")
    assigned_to_user_id: UUID | None = None
    assigned_to_employee_id: UUID | None = None
    assigned_team: str | None = None
    work_order_id: UUID | None = None
    product_style_id: UUID | None = None
    due_at: datetime | None = None
    estimated_quantity: Decimal | None = None
    unit_of_measure: str | None = None
    requires_review: bool = False


class TaskPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    description: str | None = None
    priority: str | None = None
    assigned_to_user_id: UUID | None = None
    assigned_to_employee_id: UUID | None = None
    assigned_team: str | None = None
    due_at: datetime | None = None
    estimated_quantity: Decimal | None = None
    unit_of_measure: str | None = None
    requires_review: bool | None = None
    version: int = Field(ge=1)


class TaskStatusUpdateRequest(BaseModel):
    new_status: str
    completed_quantity: Decimal | None = Field(default=None, ge=0)
    update_note: str | None = None
    blocker_reason: str | None = None
    version: int = Field(ge=1)


class TaskCommentCreateRequest(BaseModel):
    comment_text: str = Field(min_length=1, max_length=2000)
    client_message_id: str | None = Field(default=None, max_length=80)


class TaskCommentUpdateRequest(BaseModel):
    comment_text: str = Field(min_length=1, max_length=2000)
    version: int = Field(ge=1)


class QualityInspectionRecord(BaseModel):
    id: UUID
    inspection_code: str
    work_order_code: str | None = None
    style_code: str | None = None
    inspected_by: str | None = None
    inspected_at: datetime
    inspected_quantity: int
    defect_quantity: int
    status: str
    notes: str | None = None


class LabelTemplateRecord(BaseModel):
    id: UUID
    template_code: str
    name: str
    version: int
    status: str
    page_width_mm: Decimal
    page_height_mm: Decimal
    label_width_mm: Decimal
    label_height_mm: Decimal
    margin_top_mm: Decimal
    margin_left_mm: Decimal
    gap_x_mm: Decimal
    gap_y_mm: Decimal
    slots_per_page: int
    columns: int
    rows: int
    fill_order: str
    design_json: dict[str, object]


class LabelPreviewRequest(BaseModel):
    quantity: int = Field(default=25, ge=1, le=240)
    art_no: str = Field(min_length=1, max_length=80)
    colour: str = Field(min_length=1, max_length=80)
    size: str = Field(min_length=1, max_length=24)
    mrp_npr: Decimal = Field(ge=0)
    manufactured_by: str = Field(default="AB Fashion & Wears", max_length=160)
    origin_text: str = Field(default="Made in Nepal", max_length=80)


class LabelSlotRecord(BaseModel):
    page: int
    slot: int
    row: int
    column: int
    x_mm: Decimal
    y_mm: Decimal
    width_mm: Decimal
    height_mm: Decimal


class LabelPreviewResponse(BaseModel):
    template: LabelTemplateRecord
    page_count: int
    slots: list[LabelSlotRecord]
    values: LabelPreviewRequest


class OperationsCatalogResponse(BaseModel):
    users: list[UserRef]
    employees: list[EmployeeRef]
    styles: list[ProductStyleRecord]
    suppliers: list[SupplierRecord]
    materials: list[MaterialStockRecord]
    work_orders: list[WorkOrderRecord]
    label_templates: list[LabelTemplateRecord]
