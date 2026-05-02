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
