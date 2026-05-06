"""Production schemas."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class StageStartRequest(BaseModel):
    work_order_id: UUID
    stage: str
    worker_count: int | None = None
    pairs_input: int | None = None


class StageCompleteRequest(BaseModel):
    pairs_output: int | None = None
    pairs_defect: int = 0
    notes: str | None = None


class DailyPlanItemCreate(BaseModel):
    work_order_id: UUID
    priority: int = 0
    target_pairs: int = Field(ge=0)
    materials_ready: bool = False
    notes: str | None = None


class DailyPlanCreate(BaseModel):
    plan_date: date
    items: list[DailyPlanItemCreate] = Field(min_length=1)
    notes: str | None = None


class PlanProgressUpdate(BaseModel):
    actual_pairs: int = Field(ge=0)
