from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TypeVar
from uuid import UUID, uuid4

import anyio
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Task, TaskComment, User
from app.db.session import AsyncSessionLocal, engine
from app.modules.factory import sample_data, service
from app.modules.factory.schemas import (
    InventoryAlert,
    LabelPrintJobCreateRequest,
    LabelPreviewRequest,
    QualitySignal,
    SavedLabelCreateRequest,
    SavedLabelDuplicateRequest,
    SavedLabelPatchRequest,
    SavedLabelPreviewRequest,
    TaskCommentCreateRequest,
    TaskCommentUpdateRequest,
    TaskCreateRequest,
    TaskPatchRequest,
    TaskRecord,
    TaskStatusUpdateRequest,
    WorkOrderRecord,
)


T = TypeVar("T")

ASHA_ID = UUID("20000000-0000-4000-8000-000000000001")
MILAN_ID = UUID("20000000-0000-4000-8000-000000000002")
RAM_ID = UUID("20000000-0000-4000-8000-000000000003")
SITA_ID = UUID("20000000-0000-4000-8000-000000000004")
TASK_41_ID = UUID("80000000-0000-4000-8000-000000000001")
TASK_42_ID = UUID("80000000-0000-4000-8000-000000000002")
TASK_43_ID = UUID("80000000-0000-4000-8000-000000000003")
TASK_44_ID = UUID("80000000-0000-4000-8000-000000000004")
TASK_45_ID = UUID("80000000-0000-4000-8000-000000000005")
TASK_46_ID = UUID("80000000-0000-4000-8000-000000000006")
WORK_ORDER_1_ID = UUID("60000000-0000-4000-8000-000000000001")
LABEL_TEMPLATE_ID = UUID("a0000000-0000-4000-8000-000000000001")
WORKER_ROLE_ID = UUID("00000000-0000-4000-8000-000000000008")

OWNER = service.UserContext(
    id=ASHA_ID,
    display_name="Asha",
    email="owner@pailoshoes.com",
    role="owner_admin",
)
MANAGER = service.UserContext(
    id=MILAN_ID,
    display_name="Milan",
    email="milan@pailoshoes.com",
    role="factory_manager",
)
RAM = service.UserContext(
    id=RAM_ID,
    display_name="Ram",
    email="ram.pailo@gmail.com",
    role="worker",
)
SITA = service.UserContext(
    id=SITA_ID,
    display_name="Sita",
    email="sita@pailoshoes.com",
    role="quality_inspector",
)


def run_in_db(scenario: Callable[[AsyncSession], Awaitable[T]]) -> T:
    engine.sync_engine.dispose(close=False)

    async def runner() -> T:
        try:
            async with AsyncSessionLocal() as session:
                try:
                    result = await scenario(session)
                finally:
                    await session.rollback()
            return result
        finally:
            await engine.dispose()

    return anyio.run(runner)


def test_catalog_lists_include_factory_reference_data() -> None:
    async def scenario(session: AsyncSession) -> None:
        users = await service.list_users(session)
        employees = await service.list_employees(session)
        styles = await service.list_product_styles(session)
        suppliers = await service.list_suppliers(session)
        materials = await service.list_material_stock(session)
        work_orders = await service.list_work_orders(session)
        labels = await service.list_label_templates(session)
        catalog = await service.get_operations_catalog(session)

        assert {user.role for user in users} >= {"owner_admin", "factory_manager", "worker"}
        assert any(employee.employee_code == "EMP-0003" for employee in employees)
        assert styles[0].style_code == "PAI-2026-SCH-001"
        assert any("thread" in supplier.material_categories for supplier in suppliers)
        assert any(material.risk == "Near minimum; watch next work order" for material in materials)
        assert work_orders[0].size_lines
        assert labels[0].template_code == "A4-24-LABEL"
        assert len(catalog.users) == len(users)
        assert len(catalog.work_orders) == len(work_orders)

    run_in_db(scenario)


def test_record_lookup_and_not_found_errors() -> None:
    async def scenario(session: AsyncSession) -> None:
        work_order = await service.get_work_order(session, WORK_ORDER_1_ID)
        task = await service.get_task_record(session, TASK_41_ID)
        preview = await service.preview_label_sheet(
            session,
            LABEL_TEMPLATE_ID,
            LabelPreviewRequest(quantity=1, colour="White", size="39", mrp_npr=Decimal("1899")),
        )

        assert work_order.work_order_code == "WO-2026-000001"
        assert task.comments[0].author_name == "Ram"
        assert preview.page_count == 1

        for lookup in (
            lambda: service.get_work_order(session, uuid4()),
            lambda: service.get_task_record(session, uuid4()),
            lambda: service.preview_label_sheet(
                session,
                uuid4(),
                LabelPreviewRequest(quantity=1, colour="White", size="39", mrp_npr=Decimal("1899")),
            ),
        ):
            with pytest.raises(service.FactoryServiceError) as exc_info:
                await lookup()
            assert exc_info.value.status_code == 404

    run_in_db(scenario)


def test_saved_label_lifecycle_and_print_job_snapshot() -> None:
    async def scenario(session: AsyncSession) -> None:
        created = await service.create_saved_label(
            session,
            SavedLabelCreateRequest(
                template_id=LABEL_TEMPLATE_ID,
                art_no=" AFL 02 ",
                colour=" White ",
                size="39",
                mrp_npr=Decimal("1899"),
                manufactured_by=" AB Fashion & Wears ",
                origin_text=" Made in Nepal ",
                default_quantity=24,
                notes="  Core white school label  ",
            ),
            MANAGER,
        )

        assert created.label_code.startswith("SLBL-2026-")
        assert created.name == "AFL 02 - White - 39"
        assert created.art_no == "AFL 02"
        assert created.created_by and created.created_by.display_name == "Milan"
        assert created.notes == "Core white school label"

        active_labels = await service.list_saved_labels(session)
        assert any(label.id == created.id for label in active_labels)

        preview = await service.preview_saved_label(
            session,
            created.id,
            SavedLabelPreviewRequest(quantity=25),
        )
        assert preview.page_count == 2
        assert preview.values.art_no == "AFL 02"

        patched = await service.patch_saved_label(
            session,
            created.id,
            SavedLabelPatchRequest(
                name="AFL 02 white size 40",
                size="40",
                notes=" ",
                version=created.version,
            ),
            OWNER,
        )
        assert patched.name == "AFL 02 white size 40"
        assert patched.size == "40"
        assert patched.notes is None
        assert patched.version == created.version + 1

        with pytest.raises(service.FactoryServiceError) as stale_error:
            await service.patch_saved_label(
                session,
                created.id,
                SavedLabelPatchRequest(size="41", version=created.version),
                OWNER,
            )
        assert stale_error.value.status_code == 409

        duplicate = await service.duplicate_saved_label(
            session,
            created.id,
            SavedLabelDuplicateRequest(name="AFL 02 white duplicate"),
            OWNER,
        )
        assert duplicate.id != created.id
        assert duplicate.name == "AFL 02 white duplicate"
        assert duplicate.size == "40"

        print_job = await service.create_label_print_job(
            session,
            created.id,
            LabelPrintJobCreateRequest(quantity=24),
            RAM,
        )
        assert print_job.saved_label_id == created.id
        assert print_job.template_version == patched.template_version
        assert print_job.requested_quantity == 24
        assert print_job.page_count == 1
        assert print_job.field_values.size == "40"
        assert print_job.printed_by and print_job.printed_by.display_name == "Ram"

        jobs = await service.list_label_print_jobs(session, saved_label_id=created.id)
        assert any(job.id == print_job.id for job in jobs)

        archived = await service.archive_saved_label(session, created.id, patched.version, MANAGER)
        assert archived.status == "archived"
        assert archived.version == patched.version + 1
        assert all(label.id != created.id for label in await service.list_saved_labels(session))
        assert any(label.id == created.id for label in await service.list_saved_labels(session, include_archived=True))

        with pytest.raises(service.FactoryServiceError) as archived_edit_error:
            await service.patch_saved_label(
                session,
                created.id,
                SavedLabelPatchRequest(size="42", version=archived.version),
                OWNER,
            )
        assert archived_edit_error.value.status_code == 409

    run_in_db(scenario)


def test_resolve_current_user_by_id_email_and_disabled_user() -> None:
    disabled_user_id = uuid4()

    async def scenario(session: AsyncSession) -> None:
        owner = await service.resolve_current_user(session, user_id=ASHA_ID)
        ram = await service.resolve_current_user(session, user_email="ram.pailo@gmail.com")
        default_user = await service.resolve_current_user(session)

        assert owner.role == "owner_admin"
        assert ram.id == RAM_ID
        assert default_user.id == RAM_ID

        session.add(
            User(
                id=disabled_user_id,
                email="disabled.worker@pailoshoes.com",
                display_name="Disabled Worker",
                role_id=WORKER_ROLE_ID,
                invite_status="accepted",
                status="disabled",
            )
        )
        await session.flush()

        with pytest.raises(service.FactoryServiceError) as missing_error:
            await service.resolve_current_user(session, user_email="nobody@pailoshoes.com")
        assert missing_error.value.status_code == 401

        with pytest.raises(service.FactoryServiceError) as disabled_error:
            await service.resolve_current_user(session, user_id=disabled_user_id)
        assert disabled_error.value.status_code == 403

    run_in_db(scenario)


def test_create_task_rules_and_normalization() -> None:
    async def scenario(session: AsyncSession) -> None:
        with pytest.raises(service.FactoryServiceError) as permission_error:
            await service.create_task(session, TaskCreateRequest(title="Worker task"), RAM)
        assert permission_error.value.status_code == 403

        with pytest.raises(service.FactoryServiceError) as blocked_error:
            await service.create_task(
                session,
                TaskCreateRequest(title="Blocked at creation", status="blocked"),
                MANAGER,
            )
        assert blocked_error.value.status_code == 422

        with pytest.raises(service.FactoryServiceError) as priority_error:
            await service.create_task(
                session,
                TaskCreateRequest(title="Bad priority", priority="someday"),
                MANAGER,
            )
        assert priority_error.value.status_code == 422

        created = await service.create_task(
            session,
            TaskCreateRequest(
                title="  Prepare labels for reprint  ",
                description="  stage printer and paper  ",
                priority=" Urgent ",
                assigned_to_user_id=RAM_ID,
                assigned_team=" Packing ",
                estimated_quantity=Decimal("12"),
                unit_of_measure=" labels ",
            ),
            OWNER,
        )

        assert created.task_code.startswith("TASK-2026-")
        assert created.title == "Prepare labels for reprint"
        assert created.description == "stage printer and paper"
        assert created.priority == "urgent"
        assert created.assigned_team == "Packing"
        assert created.unit_of_measure == "labels"

    run_in_db(scenario)


def test_patch_task_rules_and_field_updates() -> None:
    async def scenario(session: AsyncSession) -> None:
        task = await service.get_task_record(session, TASK_44_ID)

        with pytest.raises(service.FactoryServiceError) as version_error:
            await service.patch_task(
                session,
                TASK_44_ID,
                TaskPatchRequest(title="Stale", version=task.version + 1),
                MANAGER,
            )
        assert version_error.value.status_code == 409

        with pytest.raises(service.FactoryServiceError) as missing_error:
            await service.patch_task(
                session,
                uuid4(),
                TaskPatchRequest(title="Missing", version=1),
                MANAGER,
            )
        assert missing_error.value.status_code == 404

        with pytest.raises(service.FactoryServiceError) as priority_error:
            await service.patch_task(
                session,
                TASK_44_ID,
                TaskPatchRequest(priority="someday", version=task.version),
                MANAGER,
            )
        assert priority_error.value.status_code == 422

        updated = await service.patch_task(
            session,
            TASK_44_ID,
            TaskPatchRequest(
                title="  Print replacement labels  ",
                description="  ",
                priority="urgent",
                assigned_to_user_id=None,
                assigned_to_employee_id=None,
                assigned_team="  ",
                due_at=None,
                estimated_quantity=None,
                unit_of_measure="  ",
                requires_review=True,
                version=task.version,
            ),
            MANAGER,
        )

        assert updated.title == "Print replacement labels"
        assert updated.description is None
        assert updated.priority == "urgent"
        assert updated.assignee is None
        assert updated.assigned_employee is None
        assert updated.assigned_team is None
        assert updated.due_at is None
        assert updated.estimated_quantity is None
        assert updated.unit_of_measure is None
        assert updated.requires_review is True
        assert updated.version == task.version + 1

    run_in_db(scenario)


def test_update_task_status_rules_and_transitions() -> None:
    async def scenario(session: AsyncSession) -> None:
        with pytest.raises(service.FactoryServiceError) as access_error:
            await service.update_task_status(
                session,
                TASK_45_ID,
                TaskStatusUpdateRequest(new_status="in_progress", version=1),
                RAM,
            )
        assert access_error.value.status_code == 403

        with pytest.raises(service.FactoryServiceError) as status_error:
            await service.update_task_status(
                session,
                TASK_44_ID,
                TaskStatusUpdateRequest(new_status="paused", version=1),
                RAM,
            )
        assert status_error.value.status_code == 422

        with pytest.raises(service.FactoryServiceError) as quantity_error:
            await service.update_task_status(
                session,
                TASK_44_ID,
                TaskStatusUpdateRequest(
                    new_status="in_progress",
                    completed_quantity=Decimal("41"),
                    version=1,
                ),
                RAM,
            )
        assert quantity_error.value.status_code == 422

        with pytest.raises(service.FactoryServiceError) as blocked_error:
            await service.update_task_status(
                session,
                TASK_44_ID,
                TaskStatusUpdateRequest(new_status="blocked", version=1),
                RAM,
            )
        assert blocked_error.value.status_code == 422

        with pytest.raises(service.FactoryServiceError) as review_error:
            await service.update_task_status(
                session,
                TASK_46_ID,
                TaskStatusUpdateRequest(new_status="done", version=1),
                RAM,
            )
        assert review_error.value.status_code == 409

        started = await service.update_task_status(
            session,
            TASK_44_ID,
            TaskStatusUpdateRequest(
                new_status="in_progress",
                completed_quantity=Decimal("5"),
                update_note="  Started at packing station  ",
                version=1,
            ),
            RAM,
        )
        assert started.status == "in_progress"
        assert started.started_at is not None
        assert started.version == 2

        blocked = await service.update_task_status(
            session,
            TASK_44_ID,
            TaskStatusUpdateRequest(
                new_status="blocked",
                blocker_reason=" Printer ribbon empty ",
                version=started.version,
            ),
            RAM,
        )
        assert blocked.status == "blocked"
        assert blocked.blocked_reason == "Printer ribbon empty"

        cancelled = await service.update_task_status(
            session,
            TASK_44_ID,
            TaskStatusUpdateRequest(new_status="cancelled", version=blocked.version),
            MANAGER,
        )
        assert cancelled.status == "cancelled"
        assert cancelled.completed_at is None
        assert cancelled.blocked_reason is None

        review_waiting = await service.update_task_status(
            session,
            TASK_46_ID,
            TaskStatusUpdateRequest(
                new_status="waiting_for_review",
                completed_quantity=Decimal("7"),
                version=1,
            ),
            SITA,
        )
        assert review_waiting.reviewed_at is not None

        done = await service.update_task_status(
            session,
            TASK_46_ID,
            TaskStatusUpdateRequest(new_status="done", completed_quantity=Decimal("7"), version=2),
            SITA,
        )
        assert done.status == "done"
        assert done.completed_at is not None

    run_in_db(scenario)


def test_comment_rules_idempotency_and_updates() -> None:
    other_worker = service.UserContext(
        id=uuid4(),
        display_name="Other Worker",
        email="other.worker@pailoshoes.com",
        role="worker",
    )

    async def scenario(session: AsyncSession) -> None:
        with pytest.raises(service.FactoryServiceError) as access_error:
            await service.create_task_comment(
                session,
                TASK_41_ID,
                TaskCommentCreateRequest(comment_text="Not assigned"),
                other_worker,
            )
        assert access_error.value.status_code == 403

        with pytest.raises(service.FactoryServiceError) as blank_error:
            await service.create_task_comment(
                session,
                TASK_41_ID,
                TaskCommentCreateRequest(comment_text="   "),
                RAM,
            )
        assert blank_error.value.status_code == 422

        first = await service.create_task_comment(
            session,
            TASK_41_ID,
            TaskCommentCreateRequest(
                comment_text="  Please stage another roll.  ",
                client_message_id="service-test-comment",
            ),
            RAM,
        )
        duplicate = await service.create_task_comment(
            session,
            TASK_41_ID,
            TaskCommentCreateRequest(
                comment_text="This should not create a second comment.",
                client_message_id="service-test-comment",
            ),
            RAM,
        )
        assert duplicate.id == first.id

        with pytest.raises(service.FactoryServiceError) as wrong_task_error:
            await service.update_task_comment(
                session,
                TASK_43_ID,
                first.id,
                TaskCommentUpdateRequest(comment_text="Wrong task", version=first.version),
                RAM,
            )
        assert wrong_task_error.value.status_code == 404

        with pytest.raises(service.FactoryServiceError) as author_error:
            await service.update_task_comment(
                session,
                TASK_41_ID,
                first.id,
                TaskCommentUpdateRequest(comment_text="Manager rewrite", version=first.version),
                MANAGER,
            )
        assert author_error.value.status_code == 403

        with pytest.raises(service.FactoryServiceError) as version_error:
            await service.update_task_comment(
                session,
                TASK_41_ID,
                first.id,
                TaskCommentUpdateRequest(comment_text="Stale", version=first.version + 1),
                RAM,
            )
        assert version_error.value.status_code == 409

        with pytest.raises(service.FactoryServiceError) as blank_update_error:
            await service.update_task_comment(
                session,
                TASK_41_ID,
                first.id,
                TaskCommentUpdateRequest(comment_text="   ", version=first.version),
                RAM,
            )
        assert blank_update_error.value.status_code == 422

        edited = await service.update_task_comment(
            session,
            TASK_41_ID,
            first.id,
            TaskCommentUpdateRequest(comment_text="  Please stage two rolls.  ", version=first.version),
            RAM,
        )
        assert edited.comment_text == "Please stage two rolls."
        assert edited.edited_at is not None
        assert edited.version == first.version + 1

    run_in_db(scenario)


def test_reports_and_dashboard_rows() -> None:
    async def scenario(session: AsyncSession) -> None:
        dashboard = await service.get_dashboard(session)
        task_rows = await service.task_csv_rows(session)
        stock_rows = await service.low_stock_csv_rows(session)
        quality_signals = await service.list_quality_signals(session)
        inspections = await service.list_quality_inspections(session)
        empty_comments = await service._comments_by_task_id(session, [])

        assert dashboard.target_cost_npr == 900
        assert len(dashboard.owner_insights) == 3
        assert task_rows[0] == ["task_code", "title", "status", "priority", "assignee", "work_order", "due_at"]
        assert any(row[0] == "TASK-2026-000041" for row in task_rows[1:])
        assert stock_rows[0] == ["material", "code", "current", "minimum", "risk", "supplier"]
        assert quality_signals[0].value == "17.5%"
        assert inspections[0].inspected_by == "Sita"
        assert empty_comments == {}

    run_in_db(scenario)


def test_private_record_helpers_handle_missing_relations() -> None:
    async def scenario(session: AsyncSession) -> None:
        now = datetime.now(UTC)
        comment = TaskComment(
            id=uuid4(),
            task_id=TASK_41_ID,
            author_user_id=uuid4(),
            comment_text="Unowned comment",
            client_message_id=None,
            edited_at=None,
            version=1,
            created_at=now,
            updated_at=now,
        )
        records = await service._comment_records(session, [comment])

        assert records[0].author_name == "Unknown user"

    run_in_db(scenario)


def test_pure_service_helpers_cover_alternate_labels_and_branches() -> None:
    today = date.today()
    tomorrow = today + timedelta(days=1)
    now = datetime.now(UTC)

    assert service._stock_risk(Decimal("100"), Decimal("50")) == "Healthy"
    assert service._decimal_label(Decimal("12.340")) == "12.34"
    assert service._decimal_label(Decimal("12.000")) == "12"
    assert service._percent(0, 0) == 0
    assert service._due_date_label(None) == "No due date"
    assert service._due_date_label(today) == "Today"
    assert service._due_date_label(tomorrow) == "Tomorrow"
    assert service._due_date_label(date(2030, 1, 1)) == "2030-01-01"
    assert service._due_time_label(None) == "No due time"
    assert service._due_time_label(now.replace(hour=9, minute=15)) == "09:15"
    assert service._due_time_label(now + timedelta(days=1)) == "Tomorrow"
    assert service._due_time_label(datetime(2030, 1, 1, tzinfo=UTC)) == "Jan 01"

    no_size_order = WorkOrderRecord(
        id=uuid4(),
        work_order_code="WO-TEST",
        style_code="STYLE",
        style_name="Test Style",
        status="draft",
        priority="normal",
        planned_pairs=10,
        completed_pairs=0,
        current_stage=None,
        due_date=None,
        cost_snapshot_npr=None,
        version=1,
        blocker=None,
        size_lines=[],
    )
    assert service._work_order_summary(no_size_order).color == "Mixed"

    unassigned_task = TaskRecord(
        id=uuid4(),
        task_code="TASK-TEST",
        title="Unassigned task",
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
        estimated_quantity=None,
        completed_quantity=Decimal("0"),
        unit_of_measure=None,
        blocked_reason=None,
        requires_review=False,
        started_at=None,
        completed_at=None,
        reviewed_at=None,
        version=1,
        comments=[],
    )
    task_summary = service._task_summary(unassigned_task)
    assert task_summary.assignee == "Unassigned"
    assert task_summary.quantity is None

    insights = service._owner_insights(
        [unassigned_task],
        [
            InventoryAlert(
                material="Thread",
                code="MAT-TEST",
                current="1 rolls",
                minimum="8 rolls",
                risk="Below minimum",
                supplier="Kathmandu Threads",
            )
        ],
        [QualitySignal(label="Defect rate", value="0%", detail="No defects", tone="green")],
        934,
    )
    assert [insight.title for insight in insights] == [
        "Protect tomorrow's output",
        "Cost target needs attention",
        "Blocked work needs a decision",
    ]

    assert service._owner_insights([], [], [], 850) == []

    task = Task(
        task_code="TASK-SYNTHETIC",
        title="Synthetic",
        status="ready",
        priority="normal",
        assigned_to_user_id=RAM_ID,
        completed_quantity=Decimal("0"),
        requires_review=False,
        version=1,
    )
    service._require_task_update_access(MANAGER, task)
    service._require_task_update_access(RAM, task)
    service._require_task_comment_access(MANAGER, task)


def test_sample_data_helpers_return_dashboard_shapes() -> None:
    assert sample_data.kpis()[0].label == "Planned pairs"
    assert sample_data.throughput()[-1].day == "Fri"
    assert sample_data.work_orders()[0].code == "WO-2026-000001"
    assert sample_data.tasks()[0].assignee == "Ram"
    assert sample_data.inventory_alerts()[0].supplier == "Kathmandu Threads"
    assert sample_data.quality_signals()[0].tone == "amber"
    assert sample_data.owner_insights()[0].tone == "red"

    dashboard = sample_data.dashboard_response()
    assert dashboard.target_cost_npr == 900
    assert {task.assignee for task in dashboard.my_tasks} == {"Ram"}