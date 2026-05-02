from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from math import ceil
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Employee,
    InventoryStock,
    LabelTemplate,
    Material,
    ProductStyle,
    QualityInspection,
    Role,
    Supplier,
    Task,
    TaskComment,
    TaskStatusUpdate,
    User,
    WorkOrder,
    WorkOrderSizeLine,
)
from app.modules.factory.schemas import (
    DashboardResponse,
    EmployeeRef,
    InventoryAlert,
    Kpi,
    LabelPreviewRequest,
    LabelPreviewResponse,
    LabelSlotRecord,
    LabelTemplateRecord,
    MaterialStockRecord,
    MvpCatalogResponse,
    OwnerInsight,
    ProductStyleRecord,
    QualityInspectionRecord,
    QualitySignal,
    SupplierRecord,
    TaskCommentCreateRequest,
    TaskCommentRecord,
    TaskCommentUpdateRequest,
    TaskCreateRequest,
    TaskPatchRequest,
    TaskRecord,
    TaskStatusUpdateRequest,
    TaskSummary,
    ThroughputPoint,
    UserRef,
    WorkOrderRecord,
    WorkOrderSizeLineRecord,
    WorkOrderSummary,
)


MANAGER_ROLES = {"owner_admin", "factory_manager"}
TASK_REVIEW_ROLES = {"owner_admin", "factory_manager", "quality_inspector"}
TASK_VISIBLE_ROLES = {"owner_admin", "factory_manager", "inventory_clerk", "quality_inspector"}
VALID_TASK_STATUSES = {
    "backlog",
    "ready",
    "in_progress",
    "blocked",
    "waiting_for_review",
    "done",
    "cancelled",
}
VALID_PRIORITIES = {"low", "normal", "medium", "high", "urgent"}
DEFAULT_USER_EMAIL = "ram.pailo@gmail.com"


@dataclass(frozen=True)
class UserContext:
    id: UUID
    display_name: str
    email: str | None
    role: str


class FactoryServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def resolve_current_user(
    session: AsyncSession,
    user_id: UUID | None = None,
    user_email: str | None = None,
) -> UserContext:
    query = select(User, Role.name).join(Role, User.role_id == Role.id)
    if user_id is not None:
        query = query.where(User.id == user_id)
    else:
        query = query.where(User.email == (user_email or DEFAULT_USER_EMAIL))

    row = (await session.execute(query)).first()
    if row is None:
        raise FactoryServiceError(401, "No active Pailo app user matched the request.")

    user, role_name = row
    if user.status != "active":
        raise FactoryServiceError(403, "This Pailo app user is disabled.")
    return UserContext(id=user.id, display_name=user.display_name, email=user.email, role=role_name)


async def list_users(session: AsyncSession) -> list[UserRef]:
    users = list((await session.scalars(select(User).order_by(User.display_name))).all())
    roles = await _roles_by_id(session)
    return [_user_ref(user, roles) for user in users]


async def list_employees(session: AsyncSession) -> list[EmployeeRef]:
    employees = list((await session.scalars(select(Employee).order_by(Employee.full_name))).all())
    return [_employee_ref(employee) for employee in employees]


async def list_product_styles(session: AsyncSession) -> list[ProductStyleRecord]:
    styles = list((await session.scalars(select(ProductStyle).order_by(ProductStyle.style_code))).all())
    return [
        ProductStyleRecord(
            id=style.id,
            style_code=style.style_code,
            name=style.name,
            category=style.category,
            sample_status=style.sample_status,
            target_cost_npr=style.target_cost_npr,
            target_mrp_npr=style.target_mrp_npr,
            notes=style.notes,
        )
        for style in styles
    ]


async def list_suppliers(session: AsyncSession) -> list[SupplierRecord]:
    suppliers = list((await session.scalars(select(Supplier).order_by(Supplier.supplier_code))).all())
    return [
        SupplierRecord(
            id=supplier.id,
            supplier_code=supplier.supplier_code,
            name=supplier.name,
            contact_person=supplier.contact_person,
            phone=supplier.phone,
            material_categories=supplier.material_categories,
            usual_lead_time_days=supplier.usual_lead_time_days,
            notes=supplier.notes,
        )
        for supplier in suppliers
    ]


async def list_material_stock(session: AsyncSession) -> list[MaterialStockRecord]:
    materials = list((await session.scalars(select(Material).order_by(Material.material_code))).all())
    stocks = list(
        (
            await session.scalars(
                select(InventoryStock).where(InventoryStock.material_id.is_not(None))
            )
        ).all()
    )
    suppliers = {supplier.id: supplier for supplier in await _all_suppliers(session)}
    quantity_by_material_id: dict[UUID, Decimal] = {}
    for stock in stocks:
        if stock.material_id is not None:
            quantity_by_material_id[stock.material_id] = (
                quantity_by_material_id.get(stock.material_id, Decimal("0")) + stock.quantity
            )

    records: list[MaterialStockRecord] = []
    for material in materials:
        current_quantity = quantity_by_material_id.get(material.id, Decimal("0"))
        supplier = suppliers.get(material.supplier_id) if material.supplier_id else None
        records.append(
            MaterialStockRecord(
                id=material.id,
                material_code=material.material_code,
                name=material.name,
                category=material.category,
                unit_of_measure=material.unit_of_measure,
                supplier=supplier.name if supplier else None,
                current_quantity=current_quantity,
                minimum_stock=material.minimum_stock,
                average_cost_npr=material.average_cost_npr,
                location=material.location,
                risk=_stock_risk(current_quantity, material.minimum_stock),
            )
        )
    return records


async def list_low_stock_alerts(session: AsyncSession) -> list[InventoryAlert]:
    material_records = await list_material_stock(session)
    alerts: list[InventoryAlert] = []
    for material in material_records:
        if material.current_quantity <= material.minimum_stock:
            alerts.append(
                InventoryAlert(
                    material=material.name,
                    code=material.material_code,
                    current=f"{_decimal_label(material.current_quantity)} {material.unit_of_measure}",
                    minimum=f"{_decimal_label(material.minimum_stock)} {material.unit_of_measure}",
                    risk=material.risk,
                    supplier=material.supplier or "No supplier",
                )
            )
    return alerts


async def list_work_orders(session: AsyncSession) -> list[WorkOrderRecord]:
    work_orders = list((await session.scalars(select(WorkOrder).order_by(WorkOrder.due_date))).all())
    return await _work_order_records(session, work_orders)


async def get_work_order(session: AsyncSession, work_order_id: UUID) -> WorkOrderRecord:
    work_order = await session.get(WorkOrder, work_order_id)
    if work_order is None:
        raise FactoryServiceError(404, "Work order was not found.")
    return (await _work_order_records(session, [work_order]))[0]


async def list_task_records(
    session: AsyncSession,
    assigned_to_user_id: UUID | None = None,
) -> list[TaskRecord]:
    query = select(Task).order_by(Task.due_at.is_(None), Task.due_at, Task.priority.desc())
    if assigned_to_user_id is not None:
        query = query.where(Task.assigned_to_user_id == assigned_to_user_id)
    tasks = list((await session.scalars(query)).all())
    return await _task_records(session, tasks)


async def get_task_record(session: AsyncSession, task_id: UUID) -> TaskRecord:
    task = await session.get(Task, task_id)
    if task is None:
        raise FactoryServiceError(404, "Task was not found.")
    return (await _task_records(session, [task]))[0]


async def create_task(
    session: AsyncSession,
    payload: TaskCreateRequest,
    actor: UserContext,
) -> TaskRecord:
    _require_task_manager(actor)
    status = _validate_status(payload.status)
    priority = _validate_priority(payload.priority)
    if status == "blocked":
        raise FactoryServiceError(422, "Blocked tasks must be created as ready, then blocked with a reason.")

    task = Task(
        task_code=await _next_task_code(session),
        title=payload.title.strip(),
        description=_clean_text(payload.description),
        status=status,
        priority=priority,
        assigned_to_user_id=payload.assigned_to_user_id,
        assigned_to_employee_id=payload.assigned_to_employee_id,
        assigned_team=_clean_text(payload.assigned_team),
        work_order_id=payload.work_order_id,
        product_style_id=payload.product_style_id,
        due_at=payload.due_at,
        estimated_quantity=payload.estimated_quantity,
        completed_quantity=Decimal("0"),
        unit_of_measure=_clean_text(payload.unit_of_measure),
        requires_review=payload.requires_review,
        version=1,
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return await get_task_record(session, task.id)


async def patch_task(
    session: AsyncSession,
    task_id: UUID,
    payload: TaskPatchRequest,
    actor: UserContext,
) -> TaskRecord:
    _require_task_manager(actor)
    task = await _locked_task(session, task_id)
    _require_version(payload.version, task.version)

    if "title" in payload.model_fields_set and payload.title is not None:
        task.title = payload.title.strip()
    if "description" in payload.model_fields_set:
        task.description = _clean_text(payload.description)
    if "priority" in payload.model_fields_set and payload.priority is not None:
        task.priority = _validate_priority(payload.priority)
    if "assigned_to_user_id" in payload.model_fields_set:
        task.assigned_to_user_id = payload.assigned_to_user_id
    if "assigned_to_employee_id" in payload.model_fields_set:
        task.assigned_to_employee_id = payload.assigned_to_employee_id
    if "assigned_team" in payload.model_fields_set:
        task.assigned_team = _clean_text(payload.assigned_team)
    if "due_at" in payload.model_fields_set:
        task.due_at = payload.due_at
    if "estimated_quantity" in payload.model_fields_set:
        task.estimated_quantity = payload.estimated_quantity
    if "unit_of_measure" in payload.model_fields_set:
        task.unit_of_measure = _clean_text(payload.unit_of_measure)
    if "requires_review" in payload.model_fields_set and payload.requires_review is not None:
        task.requires_review = payload.requires_review
    task.version += 1
    await session.flush()
    return await get_task_record(session, task.id)


async def update_task_status(
    session: AsyncSession,
    task_id: UUID,
    payload: TaskStatusUpdateRequest,
    actor: UserContext,
) -> TaskRecord:
    task = await _locked_task(session, task_id)
    _require_task_update_access(actor, task)
    _require_version(payload.version, task.version)

    new_status = _validate_status(payload.new_status)
    blocker_reason = _clean_text(payload.blocker_reason)
    update_note = _clean_text(payload.update_note)
    completed_quantity = payload.completed_quantity

    if new_status == "blocked" and not blocker_reason:
        raise FactoryServiceError(422, "Blocked tasks require a blocker reason.")
    if new_status == "done" and task.requires_review and task.reviewed_at is None:
        raise FactoryServiceError(409, "Review-required tasks must be reviewed before completion.")
    if completed_quantity is not None and task.estimated_quantity is not None:
        if completed_quantity > task.estimated_quantity:
            raise FactoryServiceError(422, "Completed quantity cannot exceed the estimated quantity.")

    old_status = task.status
    now = datetime.now(UTC)
    task.status = new_status
    task.completed_quantity = completed_quantity if completed_quantity is not None else task.completed_quantity
    task.blocked_reason = blocker_reason if new_status == "blocked" else None
    if new_status == "in_progress" and task.started_at is None:
        task.started_at = now
    if new_status == "waiting_for_review" and task.requires_review:
        task.completed_at = None
    if new_status == "done":
        task.completed_at = now
    if new_status == "cancelled":
        task.completed_at = None
    if actor.role in TASK_REVIEW_ROLES and new_status == "waiting_for_review":
        task.reviewed_at = now
        task.reviewed_by_user_id = actor.id
    task.version += 1

    session.add(
        TaskStatusUpdate(
            task_id=task.id,
            old_status=old_status,
            new_status=new_status,
            update_note=update_note,
            blocker_reason=blocker_reason,
            completed_quantity=completed_quantity,
            actor_user_id=actor.id,
        )
    )
    await session.flush()
    return await get_task_record(session, task.id)


async def create_task_comment(
    session: AsyncSession,
    task_id: UUID,
    payload: TaskCommentCreateRequest,
    actor: UserContext,
) -> TaskCommentRecord:
    task = await _locked_task(session, task_id, lock=False)
    _require_task_comment_access(actor, task)
    comment_text = payload.comment_text.strip()
    if not comment_text:
        raise FactoryServiceError(422, "Task comments cannot be blank.")

    if payload.client_message_id:
        existing_comment = (
            await session.scalars(
                select(TaskComment).where(
                    TaskComment.author_user_id == actor.id,
                    TaskComment.client_message_id == payload.client_message_id,
                )
            )
        ).first()
        if existing_comment is not None:
            return (await _comment_records(session, [existing_comment]))[0]

    comment = TaskComment(
        task_id=task.id,
        author_user_id=actor.id,
        comment_text=comment_text,
        client_message_id=payload.client_message_id,
        version=1,
    )
    session.add(comment)
    await session.flush()
    await session.refresh(comment)
    return (await _comment_records(session, [comment]))[0]


async def update_task_comment(
    session: AsyncSession,
    task_id: UUID,
    comment_id: UUID,
    payload: TaskCommentUpdateRequest,
    actor: UserContext,
) -> TaskCommentRecord:
    await _locked_task(session, task_id, lock=False)
    comment = await session.get(TaskComment, comment_id, with_for_update=True)
    if comment is None or comment.task_id != task_id:
        raise FactoryServiceError(404, "Task comment was not found.")
    if comment.author_user_id != actor.id:
        raise FactoryServiceError(403, "Only the original author can edit this comment.")
    _require_version(payload.version, comment.version)
    comment_text = payload.comment_text.strip()
    if not comment_text:
        raise FactoryServiceError(422, "Task comments cannot be blank.")
    comment.comment_text = comment_text
    comment.edited_at = datetime.now(UTC)
    comment.version += 1
    await session.flush()
    await session.refresh(comment)
    return (await _comment_records(session, [comment]))[0]


async def list_quality_inspections(session: AsyncSession) -> list[QualityInspectionRecord]:
    inspections = list(
        (
            await session.scalars(
                select(QualityInspection).order_by(QualityInspection.inspected_at.desc())
            )
        ).all()
    )
    work_orders = await _work_orders_by_id(session)
    styles = await _styles_by_id(session)
    users = await _users_by_id(session)
    return [
        QualityInspectionRecord(
            id=inspection.id,
            inspection_code=inspection.inspection_code,
            work_order_code=work_orders[inspection.work_order_id].work_order_code
            if inspection.work_order_id in work_orders
            else None,
            style_code=styles[inspection.product_style_id].style_code
            if inspection.product_style_id in styles
            else None,
            inspected_by=users[inspection.inspected_by_user_id].display_name
            if inspection.inspected_by_user_id in users
            else None,
            inspected_at=inspection.inspected_at,
            inspected_quantity=inspection.inspected_quantity,
            defect_quantity=inspection.defect_quantity,
            status=inspection.status,
            notes=inspection.notes,
        )
        for inspection in inspections
    ]


async def list_quality_signals(session: AsyncSession) -> list[QualitySignal]:
    inspections = await list_quality_inspections(session)
    inspected_total = sum(inspection.inspected_quantity for inspection in inspections)
    defect_total = sum(inspection.defect_quantity for inspection in inspections)
    rework_count = sum(
        1 for inspection in inspections if inspection.status in {"rework_required", "failed"}
    )
    defect_rate = 0 if inspected_total == 0 else round((defect_total / inspected_total) * 100, 1)
    return [
        QualitySignal(
            label="Defect rate",
            value=f"{defect_rate}%",
            detail=f"{defect_total} defects from {inspected_total} inspected pairs",
            tone="amber" if defect_total else "green",
        ),
        QualitySignal(
            label="Rework tasks",
            value=str(rework_count),
            detail="Traceable to QC inspections and work orders",
            tone="amber" if rework_count else "green",
        ),
        QualitySignal(
            label="QC cleared",
            value=str(sum(inspection.inspected_quantity - inspection.defect_quantity for inspection in inspections)),
            detail="Pairs cleared or available for label workflow",
            tone="green",
        ),
    ]


async def list_label_templates(session: AsyncSession) -> list[LabelTemplateRecord]:
    templates = list(
        (await session.scalars(select(LabelTemplate).order_by(LabelTemplate.template_code))).all()
    )
    return [_label_template_record(template) for template in templates]


async def preview_label_sheet(
    session: AsyncSession,
    template_id: UUID,
    payload: LabelPreviewRequest,
) -> LabelPreviewResponse:
    template = await session.get(LabelTemplate, template_id)
    if template is None:
        raise FactoryServiceError(404, "Label template was not found.")
    page_count = ceil(payload.quantity / template.slots_per_page)
    slots: list[LabelSlotRecord] = []
    for label_index in range(payload.quantity):
        page_index = label_index // template.slots_per_page
        slot_index = label_index % template.slots_per_page
        row_index = slot_index // template.columns
        column_index = slot_index % template.columns
        x_position = template.margin_left_mm + (column_index * (template.label_width_mm + template.gap_x_mm))
        y_position = template.margin_top_mm + (row_index * (template.label_height_mm + template.gap_y_mm))
        slots.append(
            LabelSlotRecord(
                page=page_index + 1,
                slot=slot_index + 1,
                row=row_index + 1,
                column=column_index + 1,
                x_mm=x_position + template.offset_x_mm,
                y_mm=y_position + template.offset_y_mm,
                width_mm=template.label_width_mm,
                height_mm=template.label_height_mm,
            )
        )
    return LabelPreviewResponse(
        template=_label_template_record(template),
        page_count=page_count,
        slots=slots,
        values=payload,
    )


async def get_mvp_catalog(session: AsyncSession) -> MvpCatalogResponse:
    return MvpCatalogResponse(
        users=await list_users(session),
        employees=await list_employees(session),
        styles=await list_product_styles(session),
        suppliers=await list_suppliers(session),
        materials=await list_material_stock(session),
        work_orders=await list_work_orders(session),
        label_templates=await list_label_templates(session),
    )


async def get_dashboard(session: AsyncSession) -> DashboardResponse:
    work_order_records = await list_work_orders(session)
    task_records = await list_task_records(session)
    ram = await resolve_current_user(session)
    my_tasks = await list_task_records(session, assigned_to_user_id=ram.id)
    inventory_alerts = await list_low_stock_alerts(session)
    quality_signals = await list_quality_signals(session)

    planned_pairs = sum(order.planned_pairs for order in work_order_records)
    completed_pairs = sum(order.completed_pairs for order in work_order_records)
    blocked_tasks = [task for task in task_records if task.status == "blocked"]
    cost_values = [order.cost_snapshot_npr for order in work_order_records if order.cost_snapshot_npr]
    average_cost = int(sum(cost_values, Decimal("0")) / len(cost_values)) if cost_values else 0

    return DashboardResponse(
        production_date=date.today().isoformat(),
        target_cost_npr=900,
        kpis=[
            Kpi(
                label="Planned pairs",
                value=str(planned_pairs),
                detail=f"Across {len(work_order_records)} active work orders",
                tone="cyan",
                trend="Live from work orders",
            ),
            Kpi(
                label="Completed",
                value=str(completed_pairs),
                detail=f"{_percent(completed_pairs, planned_pairs)}% of current plan",
                tone="green",
                trend="Updates from task progress",
            ),
            Kpi(
                label="Blocked tasks",
                value=str(len(blocked_tasks)),
                detail="Require manager or owner follow-up",
                tone="amber" if blocked_tasks else "green",
                trend=f"{sum(1 for task in task_records if task.status == 'waiting_for_review')} awaiting review",
            ),
            Kpi(
                label="Cost pressure",
                value=f"NPR {average_cost}",
                detail="Average work-order cost snapshot",
                tone="red" if average_cost > 900 else "green",
                trend=f"{abs(average_cost - 900)} {'over' if average_cost > 900 else 'under'} target",
            ),
        ],
        throughput=[
            ThroughputPoint(day="Mon", planned=100, completed=92),
            ThroughputPoint(day="Tue", planned=110, completed=104),
            ThroughputPoint(day="Wed", planned=120, completed=98),
            ThroughputPoint(day="Thu", planned=115, completed=107),
            ThroughputPoint(day="Fri", planned=planned_pairs, completed=completed_pairs),
        ],
        work_orders=[_work_order_summary(order) for order in work_order_records],
        my_tasks=[_task_summary(task) for task in my_tasks],
        inventory_alerts=inventory_alerts,
        quality_signals=quality_signals,
        owner_insights=_owner_insights(blocked_tasks, inventory_alerts, quality_signals, average_cost),
    )


async def task_csv_rows(session: AsyncSession) -> list[list[str]]:
    tasks = await list_task_records(session)
    rows = [["task_code", "title", "status", "priority", "assignee", "work_order", "due_at"]]
    for task in tasks:
        rows.append(
            [
                task.task_code,
                task.title,
                task.status,
                task.priority,
                task.assignee.display_name if task.assignee else "Unassigned",
                task.work_order_code or "",
                task.due_at.isoformat() if task.due_at else "",
            ]
        )
    return rows


async def low_stock_csv_rows(session: AsyncSession) -> list[list[str]]:
    alerts = await list_low_stock_alerts(session)
    rows = [["material", "code", "current", "minimum", "risk", "supplier"]]
    for alert in alerts:
        rows.append([alert.material, alert.code, alert.current, alert.minimum, alert.risk, alert.supplier])
    return rows


async def _locked_task(session: AsyncSession, task_id: UUID, lock: bool = True) -> Task:
    query = select(Task).where(Task.id == task_id)
    if lock:
        query = query.with_for_update()
    task = (await session.scalars(query)).first()
    if task is None:
        raise FactoryServiceError(404, "Task was not found.")
    return task


async def _next_task_code(session: AsyncSession) -> str:
    task_count = await session.scalar(select(func.count()).select_from(Task))
    return f"TASK-2026-{int(task_count or 0) + 1:06d}"


async def _roles_by_id(session: AsyncSession) -> dict[UUID, str]:
    roles = list((await session.scalars(select(Role))).all())
    return {role.id: role.name for role in roles}


async def _users_by_id(session: AsyncSession) -> dict[UUID, User]:
    users = list((await session.scalars(select(User))).all())
    return {user.id: user for user in users}


async def _employees_by_id(session: AsyncSession) -> dict[UUID, Employee]:
    employees = list((await session.scalars(select(Employee))).all())
    return {employee.id: employee for employee in employees}


async def _work_orders_by_id(session: AsyncSession) -> dict[UUID, WorkOrder]:
    work_orders = list((await session.scalars(select(WorkOrder))).all())
    return {work_order.id: work_order for work_order in work_orders}


async def _styles_by_id(session: AsyncSession) -> dict[UUID, ProductStyle]:
    styles = list((await session.scalars(select(ProductStyle))).all())
    return {style.id: style for style in styles}


async def _all_suppliers(session: AsyncSession) -> list[Supplier]:
    return list((await session.scalars(select(Supplier))).all())


async def _task_records(session: AsyncSession, tasks: list[Task]) -> list[TaskRecord]:
    roles = await _roles_by_id(session)
    users = await _users_by_id(session)
    employees = await _employees_by_id(session)
    work_orders = await _work_orders_by_id(session)
    styles = await _styles_by_id(session)
    comments_by_task_id = await _comments_by_task_id(session, [task.id for task in tasks])

    records: list[TaskRecord] = []
    for task in tasks:
        assignee = users.get(task.assigned_to_user_id) if task.assigned_to_user_id else None
        employee = employees.get(task.assigned_to_employee_id) if task.assigned_to_employee_id else None
        work_order = work_orders.get(task.work_order_id) if task.work_order_id else None
        style = styles.get(task.product_style_id) if task.product_style_id else None
        records.append(
            TaskRecord(
                id=task.id,
                task_code=task.task_code,
                title=task.title,
                description=task.description,
                status=task.status,
                priority=task.priority,
                assignee=_user_ref(assignee, roles) if assignee else None,
                assigned_employee=_employee_ref(employee) if employee else None,
                assigned_team=task.assigned_team,
                work_order_id=task.work_order_id,
                work_order_code=work_order.work_order_code if work_order else None,
                product_style_code=style.style_code if style else None,
                due_at=task.due_at,
                estimated_quantity=task.estimated_quantity,
                completed_quantity=task.completed_quantity,
                unit_of_measure=task.unit_of_measure,
                blocked_reason=task.blocked_reason,
                requires_review=task.requires_review,
                started_at=task.started_at,
                completed_at=task.completed_at,
                reviewed_at=task.reviewed_at,
                version=task.version,
                comments=comments_by_task_id.get(task.id, []),
            )
        )
    return records


async def _comments_by_task_id(
    session: AsyncSession,
    task_ids: list[UUID],
) -> dict[UUID, list[TaskCommentRecord]]:
    if not task_ids:
        return {}
    comments = list(
        (
            await session.scalars(
                select(TaskComment)
                .where(TaskComment.task_id.in_(task_ids))
                .order_by(TaskComment.created_at)
            )
        ).all()
    )
    records = await _comment_records(session, comments)
    grouped: dict[UUID, list[TaskCommentRecord]] = {}
    for record in records:
        grouped.setdefault(record.task_id, []).append(record)
    return grouped


async def _comment_records(
    session: AsyncSession,
    comments: list[TaskComment],
) -> list[TaskCommentRecord]:
    users = await _users_by_id(session)
    records: list[TaskCommentRecord] = []
    for comment in comments:
        author = users.get(comment.author_user_id)
        records.append(
            TaskCommentRecord(
                id=comment.id,
                task_id=comment.task_id,
                author_user_id=comment.author_user_id,
                author_name=author.display_name if author else "Unknown user",
                comment_text=comment.comment_text,
                client_message_id=comment.client_message_id,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                edited_at=comment.edited_at,
                version=comment.version,
            )
        )
    return records


async def _work_order_records(
    session: AsyncSession,
    work_orders: list[WorkOrder],
) -> list[WorkOrderRecord]:
    styles = await _styles_by_id(session)
    tasks = list((await session.scalars(select(Task))).all())
    size_lines = list(
        (
            await session.scalars(
                select(WorkOrderSizeLine).order_by(WorkOrderSizeLine.color, WorkOrderSizeLine.size)
            )
        ).all()
    )
    size_lines_by_order_id: dict[UUID, list[WorkOrderSizeLine]] = {}
    for size_line in size_lines:
        size_lines_by_order_id.setdefault(size_line.work_order_id, []).append(size_line)

    records: list[WorkOrderRecord] = []
    for work_order in work_orders:
        style = styles[work_order.product_style_id]
        blocked_reason = next(
            (
                task.blocked_reason
                for task in tasks
                if task.work_order_id == work_order.id and task.status == "blocked" and task.blocked_reason
            ),
            None,
        )
        records.append(
            WorkOrderRecord(
                id=work_order.id,
                work_order_code=work_order.work_order_code,
                style_code=style.style_code,
                style_name=style.name,
                status=work_order.status,
                priority=work_order.priority,
                planned_pairs=work_order.planned_pairs,
                completed_pairs=work_order.completed_pairs,
                current_stage=work_order.current_stage,
                due_date=work_order.due_date,
                cost_snapshot_npr=work_order.cost_snapshot_npr,
                version=work_order.version,
                blocker=blocked_reason,
                size_lines=[
                    WorkOrderSizeLineRecord(
                        id=size_line.id,
                        color=size_line.color,
                        size=size_line.size,
                        planned_pairs=size_line.planned_pairs,
                        completed_pairs=size_line.completed_pairs,
                    )
                    for size_line in size_lines_by_order_id.get(work_order.id, [])
                ],
            )
        )
    return records


def _user_ref(user: User, roles: dict[UUID, str]) -> UserRef:
    return UserRef(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        role=roles.get(user.role_id, "unknown"),
    )


def _employee_ref(employee: Employee) -> EmployeeRef:
    return EmployeeRef(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        department=employee.department,
        job_title=employee.job_title,
    )


def _label_template_record(template: LabelTemplate) -> LabelTemplateRecord:
    return LabelTemplateRecord(
        id=template.id,
        template_code=template.template_code,
        name=template.name,
        version=template.version,
        status=template.status,
        page_width_mm=template.page_width_mm,
        page_height_mm=template.page_height_mm,
        label_width_mm=template.label_width_mm,
        label_height_mm=template.label_height_mm,
        margin_top_mm=template.margin_top_mm,
        margin_left_mm=template.margin_left_mm,
        gap_x_mm=template.gap_x_mm,
        gap_y_mm=template.gap_y_mm,
        slots_per_page=template.slots_per_page,
        columns=template.columns,
        rows=template.rows,
        fill_order=template.fill_order,
        design_json=template.design_json,
    )


def _work_order_summary(order: WorkOrderRecord) -> WorkOrderSummary:
    colors = sorted({line.color for line in order.size_lines})
    return WorkOrderSummary(
        code=order.work_order_code,
        style=order.style_name,
        color=", ".join(colors) if colors else "Mixed",
        planned_pairs=order.planned_pairs,
        completed_pairs=order.completed_pairs,
        stage=order.current_stage or order.status,
        blocker=order.blocker,
        due=_due_date_label(order.due_date),
    )


def _task_summary(task: TaskRecord) -> TaskSummary:
    assignee = task.assignee.display_name if task.assignee else "Unassigned"
    quantity = None
    if task.estimated_quantity is not None:
        quantity = (
            f"{_decimal_label(task.completed_quantity)} / {_decimal_label(task.estimated_quantity)} "
            f"{task.unit_of_measure or ''}"
        ).strip()
    return TaskSummary(
        code=task.task_code,
        title=task.title,
        status=task.status,
        priority=task.priority,
        assignee=assignee,
        due_time=_due_time_label(task.due_at),
        work_order=task.work_order_code,
        quantity=quantity,
        blocker_reason=task.blocked_reason,
    )


def _owner_insights(
    blocked_tasks: list[TaskRecord],
    inventory_alerts: list[InventoryAlert],
    quality_signals: list[QualitySignal],
    average_cost: int,
) -> list[OwnerInsight]:
    insights: list[OwnerInsight] = []
    if inventory_alerts:
        first_alert = inventory_alerts[0]
        insights.append(
            OwnerInsight(
                title="Protect tomorrow's output",
                detail=f"{first_alert.material} is at {first_alert.current} against {first_alert.minimum} minimum.",
                action=f"Call {first_alert.supplier} and confirm replenishment",
                tone="red",
            )
        )
    if average_cost > 900:
        insights.append(
            OwnerInsight(
                title="Cost target needs attention",
                detail=f"Average work-order cost is NPR {average_cost} against the NPR 900 target.",
                action="Review BOM and supplier price snapshots",
                tone="amber",
            )
        )
    if blocked_tasks:
        insights.append(
            OwnerInsight(
                title="Blocked work needs a decision",
                detail=f"{len(blocked_tasks)} task is blocked: {blocked_tasks[0].blocked_reason or blocked_tasks[0].title}.",
                action="Open the task board and clear the blocker",
                tone="red",
            )
        )
    if quality_signals:
        insights.append(
            OwnerInsight(
                title="QC pattern emerging",
                detail=quality_signals[0].detail,
                action="Review rework tasks before dispatch",
                tone="cyan",
            )
        )
    return insights[:3]


def _require_task_manager(actor: UserContext) -> None:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers and owner/admins can manage task assignment.")


def _require_task_update_access(actor: UserContext, task: Task) -> None:
    if actor.role in TASK_REVIEW_ROLES:
        return
    if task.assigned_to_user_id == actor.id:
        return
    raise FactoryServiceError(403, "Workers can update only tasks assigned to them.")


def _require_task_comment_access(actor: UserContext, task: Task) -> None:
    if actor.role in TASK_VISIBLE_ROLES or task.assigned_to_user_id == actor.id:
        return
    raise FactoryServiceError(403, "You can comment only on visible or assigned tasks.")


def _require_version(expected_version: int, current_version: int) -> None:
    if expected_version != current_version:
        raise FactoryServiceError(409, "This record changed. Refresh and try again.")


def _validate_status(status: str) -> str:
    clean_status = status.strip().lower()
    if clean_status not in VALID_TASK_STATUSES:
        raise FactoryServiceError(422, "Unsupported task status.")
    return clean_status


def _validate_priority(priority: str) -> str:
    clean_priority = priority.strip().lower()
    if clean_priority not in VALID_PRIORITIES:
        raise FactoryServiceError(422, "Unsupported task priority.")
    return clean_priority


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _stock_risk(current_quantity: Decimal, minimum_stock: Decimal) -> str:
    if current_quantity <= minimum_stock:
        return "Below minimum and can block production"
    if current_quantity <= minimum_stock * Decimal("1.25"):
        return "Near minimum; watch next work order"
    return "Healthy"


def _decimal_label(value: Decimal) -> str:
    normalized = value.normalize()
    return f"{normalized:f}".rstrip("0").rstrip(".") if "." in f"{normalized:f}" else f"{normalized:f}"


def _percent(part: int, total: int) -> int:
    if total == 0:
        return 0
    return round((part / total) * 100)


def _due_date_label(due_date: date | None) -> str:
    if due_date is None:
        return "No due date"
    today = date.today()
    if due_date == today:
        return "Today"
    if due_date.toordinal() == today.toordinal() + 1:
        return "Tomorrow"
    return due_date.isoformat()


def _due_time_label(due_at: datetime | None) -> str:
    if due_at is None:
        return "No due time"
    now = datetime.now(UTC)
    if due_at.date() == now.date():
        return due_at.strftime("%H:%M")
    if due_at.date().toordinal() == now.date().toordinal() + 1:
        return "Tomorrow"
    return due_at.strftime("%b %d")