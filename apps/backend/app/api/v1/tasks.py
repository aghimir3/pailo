from fastapi import APIRouter

from app.modules.factory.sample_data import tasks
from app.modules.factory.schemas import TaskSummary

router = APIRouter()


@router.get("", response_model=list[TaskSummary])
async def list_tasks() -> list[TaskSummary]:
    return tasks()


@router.get("/my-tasks", response_model=list[TaskSummary])
async def list_my_tasks() -> list[TaskSummary]:
    return [task for task in tasks() if task.assignee == "Ram"]
