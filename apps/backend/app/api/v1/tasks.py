from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory.schemas import (
    TaskCommentCreateRequest,
    TaskCommentRecord,
    TaskCommentUpdateRequest,
    TaskCreateRequest,
    TaskPatchRequest,
    TaskRecord,
    TaskStatusUpdateRequest,
)

router = APIRouter()


@router.get("", response_model=list[TaskRecord])
async def list_tasks(session: DbSession) -> list[TaskRecord]:
    return await service.list_task_records(session)


@router.get("/my-tasks", response_model=list[TaskRecord])
async def list_my_tasks(session: DbSession, current_user: CurrentUser) -> list[TaskRecord]:
    return await service.list_task_records(session, assigned_to_user_id=current_user.id)


@router.get("/{task_id}", response_model=TaskRecord)
async def get_task(task_id: UUID, session: DbSession) -> TaskRecord:
    return await service.get_task_record(session, task_id)


@router.post("", response_model=TaskRecord, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> TaskRecord:
    task = await service.create_task(session, payload, current_user)
    await session.commit()
    return task


@router.patch("/{task_id}", response_model=TaskRecord)
async def patch_task(
    task_id: UUID,
    payload: TaskPatchRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> TaskRecord:
    task = await service.patch_task(session, task_id, payload, current_user)
    await session.commit()
    return task


@router.post("/{task_id}/updates", response_model=TaskRecord)
async def update_task_status(
    task_id: UUID,
    payload: TaskStatusUpdateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> TaskRecord:
    task = await service.update_task_status(session, task_id, payload, current_user)
    await session.commit()
    return task


@router.post("/{task_id}/comments", response_model=TaskCommentRecord, status_code=status.HTTP_201_CREATED)
async def create_task_comment(
    task_id: UUID,
    payload: TaskCommentCreateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> TaskCommentRecord:
    comment = await service.create_task_comment(session, task_id, payload, current_user)
    await session.commit()
    return comment


@router.patch("/{task_id}/comments/{comment_id}", response_model=TaskCommentRecord)
async def update_task_comment(
    task_id: UUID,
    comment_id: UUID,
    payload: TaskCommentUpdateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> TaskCommentRecord:
    comment = await service.update_task_comment(session, task_id, comment_id, payload, current_user)
    await session.commit()
    return comment
