from datetime import UTC, datetime
from decimal import Decimal
from typing import cast
from uuid import UUID

import anyio
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import reports, tasks
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


TASK_ID = UUID("80000000-0000-4000-8000-000000000001")
COMMENT_ID = UUID("82000000-0000-4000-8000-000000000001")
RAM_ID = UUID("20000000-0000-4000-8000-000000000003")
MANAGER = service.UserContext(
    id=UUID("20000000-0000-4000-8000-000000000002"),
    display_name="Milan",
    email="milan@pailoshoes.com",
    role="factory_manager",
)


class CommitSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


def test_task_mutation_route_handlers_commit(monkeypatch: pytest.MonkeyPatch) -> None:
    task_record = _task_record()
    comment_record = _comment_record()

    async def fake_create_task(
        session: AsyncSession,
        payload: TaskCreateRequest,
        current_user: service.UserContext,
    ) -> TaskRecord:
        assert payload.title == "Prepare labels"
        assert current_user == MANAGER
        return task_record

    async def fake_patch_task(
        session: AsyncSession,
        task_id: UUID,
        payload: TaskPatchRequest,
        current_user: service.UserContext,
    ) -> TaskRecord:
        assert task_id == TASK_ID
        assert payload.version == 1
        assert current_user == MANAGER
        return task_record

    async def fake_update_task_status(
        session: AsyncSession,
        task_id: UUID,
        payload: TaskStatusUpdateRequest,
        current_user: service.UserContext,
    ) -> TaskRecord:
        assert task_id == TASK_ID
        assert payload.new_status == "in_progress"
        assert current_user == MANAGER
        return task_record

    async def fake_create_task_comment(
        session: AsyncSession,
        task_id: UUID,
        payload: TaskCommentCreateRequest,
        current_user: service.UserContext,
    ) -> TaskCommentRecord:
        assert task_id == TASK_ID
        assert payload.comment_text == "Thread staged"
        assert current_user == MANAGER
        return comment_record

    async def fake_update_task_comment(
        session: AsyncSession,
        task_id: UUID,
        comment_id: UUID,
        payload: TaskCommentUpdateRequest,
        current_user: service.UserContext,
    ) -> TaskCommentRecord:
        assert task_id == TASK_ID
        assert comment_id == COMMENT_ID
        assert payload.version == 1
        assert current_user == MANAGER
        return comment_record

    monkeypatch.setattr(service, "create_task", fake_create_task)
    monkeypatch.setattr(service, "patch_task", fake_patch_task)
    monkeypatch.setattr(service, "update_task_status", fake_update_task_status)
    monkeypatch.setattr(service, "create_task_comment", fake_create_task_comment)
    monkeypatch.setattr(service, "update_task_comment", fake_update_task_comment)

    create_session = CommitSession()
    create_result = anyio.run(
        tasks.create_task,
        TaskCreateRequest(title="Prepare labels"),
        cast(AsyncSession, create_session),
        MANAGER,
    )
    assert create_result == task_record
    assert create_session.committed

    patch_session = CommitSession()
    patch_result = anyio.run(
        tasks.patch_task,
        TASK_ID,
        TaskPatchRequest(title="Prepare labels", version=1),
        cast(AsyncSession, patch_session),
        MANAGER,
    )
    assert patch_result == task_record
    assert patch_session.committed

    update_session = CommitSession()
    update_result = anyio.run(
        tasks.update_task_status,
        TASK_ID,
        TaskStatusUpdateRequest(new_status="in_progress", version=1),
        cast(AsyncSession, update_session),
        MANAGER,
    )
    assert update_result == task_record
    assert update_session.committed

    create_comment_session = CommitSession()
    create_comment_result = anyio.run(
        tasks.create_task_comment,
        TASK_ID,
        TaskCommentCreateRequest(comment_text="Thread staged"),
        cast(AsyncSession, create_comment_session),
        MANAGER,
    )
    assert create_comment_result == comment_record
    assert create_comment_session.committed

    update_comment_session = CommitSession()
    update_comment_result = anyio.run(
        tasks.update_task_comment,
        TASK_ID,
        COMMENT_ID,
        TaskCommentUpdateRequest(comment_text="Thread restaged", version=1),
        cast(AsyncSession, update_comment_session),
        MANAGER,
    )
    assert update_comment_result == comment_record
    assert update_comment_session.committed


def test_csv_response_sets_download_headers() -> None:
    response = reports._csv_response([["a", "b"], ["1", "2"]], "demo.csv")

    assert response.media_type == "text/csv; charset=utf-8"
    assert response.headers["content-disposition"] == 'attachment; filename="demo.csv"'
    assert bytes(response.body).decode() == "a,b\r\n1,2\r\n"


def _task_record() -> TaskRecord:
    return TaskRecord(
        id=TASK_ID,
        task_code="TASK-TEST-000001",
        title="Prepare labels",
        description=None,
        status="ready",
        priority="normal",
        assignee=None,
        assigned_employee=None,
        assigned_team=None,
        work_order_id=None,
        work_order_code=None,
        product_style_code=None,
        due_at=None,
        estimated_quantity=Decimal("1"),
        completed_quantity=Decimal("0"),
        unit_of_measure="labels",
        blocked_reason=None,
        requires_review=False,
        started_at=None,
        completed_at=None,
        reviewed_at=None,
        version=1,
        comments=[],
    )


def _comment_record() -> TaskCommentRecord:
    now = datetime.now(UTC)
    return TaskCommentRecord(
        id=COMMENT_ID,
        task_id=TASK_ID,
        author_user_id=RAM_ID,
        author_name="Ram",
        comment_text="Thread staged",
        client_message_id=None,
        created_at=now,
        updated_at=now,
        edited_at=None,
        version=1,
    )