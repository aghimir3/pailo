"""WhatsApp notification orchestrator for task events."""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Employee, Task, User
from app.modules.whatsapp.client import send_template_message
from app.modules.whatsapp.phone_utils import normalize_phone_to_e164
from app.modules.whatsapp import templates

logger = structlog.get_logger()


async def _resolve_assignee_phone(session: AsyncSession, task: Task) -> str | None:
    """Get the assigned person's phone number in E.164 format."""
    phone: str | None = None

    if task.assigned_to_employee_id:
        result = await session.execute(
            select(Employee.phone).where(Employee.id == task.assigned_to_employee_id)
        )
        phone = result.scalar_one_or_none()

    if not phone and task.assigned_to_user_id:
        result = await session.execute(
            select(User.phone, User.employee_id).where(User.id == task.assigned_to_user_id)
        )
        row = result.one_or_none()
        if row:
            phone = row.phone
            # Fallback to linked employee's phone
            if not phone and row.employee_id:
                emp_result = await session.execute(
                    select(Employee.phone).where(Employee.id == row.employee_id)
                )
                phone = emp_result.scalar_one_or_none()

    return normalize_phone_to_e164(phone)


async def notify_task_assigned(
    session: AsyncSession,
    task: Task,
    assigner_name: str,
) -> None:
    """Notify assignee of new task assignment."""
    phone = await _resolve_assignee_phone(session, task)
    if not phone:
        logger.warning("whatsapp_no_phone", task_id=str(task.id), event="assigned")
        return

    components = templates.task_assigned_components(
        task_code=task.task_code,
        task_title=task.title,
        assigner_name=assigner_name,
    )
    await send_template_message(phone, "task_assigned", "en", components)


async def notify_task_status_change(
    session: AsyncSession,
    task: Task,
    old_status: str | None,
    new_status: str,
    actor_name: str,
    blocker_reason: str | None = None,
) -> None:
    """Notify assignee of status change."""
    phone = await _resolve_assignee_phone(session, task)
    if not phone:
        logger.warning("whatsapp_no_phone", task_id=str(task.id), event="status_change")
        return

    if new_status == "blocked":
        components = templates.task_blocked_components(
            task_code=task.task_code,
            task_title=task.title,
            blocker_reason=blocker_reason or "",
            actor_name=actor_name,
        )
        template_name = "task_blocked"
    elif old_status == "blocked" and new_status != "blocked":
        components = templates.task_unblocked_components(
            task_code=task.task_code,
            task_title=task.title,
            new_status=new_status,
            actor_name=actor_name,
        )
        template_name = "task_unblocked"
    else:
        components = templates.task_status_update_components(
            task_code=task.task_code,
            task_title=task.title,
            new_status=new_status,
            actor_name=actor_name,
        )
        template_name = "task_status_update"

    await send_template_message(phone, template_name, "en", components)


async def notify_task_comment(
    session: AsyncSession,
    task: Task,
    commenter_name: str,
    comment_text: str,
) -> None:
    """Notify assignee of new comment."""
    phone = await _resolve_assignee_phone(session, task)
    if not phone:
        logger.warning("whatsapp_no_phone", task_id=str(task.id), event="comment")
        return

    components = templates.task_comment_components(
        task_code=task.task_code,
        commenter_name=commenter_name,
        comment_preview=comment_text,
    )
    await send_template_message(phone, "task_comment", "en", components)
