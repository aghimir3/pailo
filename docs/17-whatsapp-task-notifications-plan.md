# 17 – WhatsApp Task Notifications Plan

## Summary

Send WhatsApp messages to the person assigned to a task whenever a relevant task event occurs (assignment, status change, comment, unblock). Uses Meta's WhatsApp Business Cloud API with pre-approved message templates.

---

## Prerequisite: People Tab & Phone Number Management

WhatsApp notifications require phone numbers on User/Employee records. The existing People pages need enhancements to support inviting users and editing their profile info (especially phone).

### Current State

- **User model** already has `phone` field in DB (nullable, 40 chars) — **never exposed in UI or API**
- **Employee model** already has `phone` field in DB — **read-only via catalog, no CRUD API**
- **Invite flow** works: owner_admin creates user with email → Cognito sends invite email → user sets password → `invite_status` flips to `"accepted"` on first login
- **User edit** only exposes `display_name`, `role_id`, `status` — no phone, no employee link

### What to Build

#### Backend Changes (`apps/backend/app/api/v1/users.py`)

1. **Add `phone` to `UserUpdateRequest`**:
   ```python
   class UserUpdateRequest(BaseModel):
       display_name: str | None = None
       role_id: str | None = None
       status: str | None = None
       phone: str | None = None          # NEW — WhatsApp number
       employee_id: str | None = None    # NEW — link to factory employee
   ```

2. **Add `phone` to `UserRecord` response**:
   ```python
   class UserRecord(BaseModel):
       # ... existing fields ...
       phone: str | None = None          # NEW
       employee_id: str | None = None    # NEW
   ```

3. **In PATCH handler** (`update_user`): persist `phone` and `employee_id` to the User row.

4. **Add Employee CRUD endpoints** (`apps/backend/app/api/v1/employees.py` — new file):

   | Method | Path | Access | Description |
   |--------|------|--------|-------------|
   | GET | `/employees` | MANAGER_ROLES | List all employees (full detail, not just EmployeeRef) |
   | POST | `/employees` | owner_admin | Create employee (code auto-generated) |
   | PATCH | `/employees/{id}` | MANAGER_ROLES | Update employee info (phone, dept, job_title, wage, etc.) |
   | DELETE | `/employees/{id}` | owner_admin | Soft-delete (set status="inactive") |

5. **Employee schemas** (add to `schemas.py` or new file):
   ```python
   class EmployeeRecord(BaseModel):
       id: UUID
       employee_code: str
       full_name: str
       phone: str | None = None
       department: str | None = None
       job_title: str | None = None
       wage_type: str | None = None
       wage_rate_npr: Decimal | None = None
       start_date: date | None = None
       status: str
       address: str | None = None
       emergency_contact_name: str | None = None
       emergency_contact_phone: str | None = None

   class EmployeeCreateRequest(BaseModel):
       full_name: str                    # Required
       phone: str | None = None
       department: str | None = None
       job_title: str | None = None
       wage_type: str | None = None
       wage_rate_npr: Decimal | None = None
       start_date: date | None = None
       address: str | None = None
       emergency_contact_name: str | None = None
       emergency_contact_phone: str | None = None

   class EmployeeUpdateRequest(BaseModel):
       full_name: str | None = None
       phone: str | None = None
       department: str | None = None
       job_title: str | None = None
       wage_type: str | None = None
       wage_rate_npr: Decimal | None = None
       start_date: date | None = None
       status: str | None = None
       address: str | None = None
       emergency_contact_name: str | None = None
       emergency_contact_phone: str | None = None
   ```

#### Frontend Changes (`apps/frontend/src/app/people/`)

1. **Redesign `/people` as a tabbed page** with two tabs:
   - **Users** tab — current user management (invite, edit role/status/phone)
   - **Employees** tab — employee list with add/edit (phone, department, job title, wage)

2. **User edit form** — add phone field:
   ```
   ┌─────────────────────────────────────┐
   │ Edit User: Ram Shrestha             │
   ├─────────────────────────────────────┤
   │ Display Name: [Ram Shrestha       ] │
   │ Phone (WhatsApp): [9852030953     ] │
   │ Role:         [Factory Manager  ▾]  │
   │ Status:       [Active           ▾]  │
   │            [Save]  [Cancel]         │
   └─────────────────────────────────────┘
   ```
   - Show helper text: "Used for WhatsApp task notifications"
   - Phone field available once invite is accepted (user exists)

3. **Employee management panel**:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Employees                          [+ Add Employee] │
   ├──────────┬─────────┬───────────┬──────────┬────────┤
   │ Code     │ Name    │ Phone     │ Dept     │ Status │
   │ EMP-0001 │ Hari B. │ 985203.. │ Cutting  │ Active │
   │ EMP-0002 │ Sita K. │ 984712.. │ Stitching│ Active │
   └──────────┴─────────┴───────────┴──────────┴────────┘
   ```
   - Click row → edit slide-out or inline form
   - Phone field prominently shown (for WhatsApp)
   - Employee code auto-generated by backend (`EMP-XXXX`)

#### Invite → Profile Completion Flow

```
Owner invites user (email + name + role)
    │
    ▼
Cognito sends email with temp password
    │
    ▼
User accepts invite → logs in → invite_status = "accepted"
    │
    ▼
Owner/Manager sees user in People tab → edits to add:
  - Phone number (for WhatsApp notifications)
  - Link to Employee record (if they're a factory worker)
    │
    ▼
WhatsApp notifications now reach this person when tasks are assigned
```

### What You (the Dev) Need to Do

#### Meta/WhatsApp Setup (one-time, ~30 min)

1. Go to [business.facebook.com](https://business.facebook.com) → create or use existing Meta Business account
2. Add "WhatsApp" product in Business Settings → API Setup
3. Register the factory phone number (or get a new one from Meta's test numbers for dev)
4. In WhatsApp Manager → Message Templates → create these 5 templates:
   - `task_assigned` — body: "You have been assigned task {{1}}: {{2}} by {{3}}. Open the app to view details."
   - `task_status_update` — body: "Task {{1}} ({{2}}) status changed to {{3}} by {{4}}."
   - `task_blocked` — body: "⚠️ Task {{1}} ({{2}}) is BLOCKED. Reason: {{3}}. Reported by {{4}}."
   - `task_unblocked` — body: "✅ Task {{1}} ({{2}}) is now unblocked → {{3}}. Updated by {{4}}."
   - `task_comment` — body: "💬 {{1}} commented on task {{2}}: \"{{3}}\""
5. Wait for Meta to approve templates (usually 24-48h for simple text templates)
6. Generate a **System User Token** (permanent) with permission `whatsapp_business_messaging`
7. Note your **Phone Number ID** from WhatsApp → API Setup page

#### AWS Infrastructure (one-time, ~10 min)

1. Store the token in SSM: `aws ssm put-parameter --name /pailo/prod/whatsapp-access-token --type SecureString --value "YOUR_TOKEN"`
2. Store phone number ID: `aws ssm put-parameter --name /pailo/prod/whatsapp-phone-number-id --type String --value "YOUR_PHONE_NUMBER_ID"`
3. Add to ECS task definition environment (via Terraform `compute.tf`):
   ```
   WHATSAPP_ENABLED=true
   WHATSAPP_PHONE_NUMBER_ID=<from SSM>
   WHATSAPP_ACCESS_TOKEN=<from SSM secrets>
   ```

#### Data Entry (ongoing)

1. In the People tab, ensure every user/employee who should receive WhatsApp notifications has their **Nepal mobile number** entered (e.g., `9852030953`)
2. The system auto-normalizes to E.164 (`+9779852030953`) before sending

#### Testing (before enabling in production)

1. Deploy with `WHATSAPP_ENABLED=false` first — code runs but doesn't send
2. Test with Meta's test phone number (free, no approval needed)
3. Verify logs show correct payloads with `whatsapp_disabled` entries
4. Flip `WHATSAPP_ENABLED=true` after templates are approved

---

## Trigger Events

Each of these task events sends a WhatsApp notification to the **assigned person** (employee or user):

| Event | Trigger Location | Message Template |
|-------|-----------------|-----------------|
| Task assigned (new or reassigned) | `create_task`, `patch_task` (when `assigned_to_employee_id` or `assigned_to_user_id` changes) | `task_assigned` |
| Status changed | `update_task_status` | `task_status_update` |
| Task blocked | `update_task_status` (new_status = "blocked") | `task_blocked` |
| Task unblocked | `update_task_status` (old_status = "blocked" → other) | `task_unblocked` |
| Comment added | `create_task_comment` | `task_comment` |
| Task due soon | Future: cron/scheduled job (not in scope of initial impl) | `task_due_reminder` |

---

## Recipient Resolution

The assigned person's phone number is resolved in this priority order:

1. If `assigned_to_employee_id` is set → use `Employee.phone`
2. If `assigned_to_user_id` is set → use `User.phone`, fallback to linked `Employee.phone` via `User.employee_id`
3. If no phone number is found → skip notification silently (log warning)

Phone numbers must be in E.164 format for WhatsApp API (e.g., `+9779852030953`). Store a utility to normalize Nepal numbers (`98XXXXXXXX` → `+97798XXXXXXXX`).

---

## Architecture

```
┌─────────────────────┐
│  Task Service        │  (existing: service.py)
│  - create_task()     │
│  - patch_task()      │
│  - update_status()   │
│  - create_comment()  │
└──────────┬──────────┘
           │ calls (fire-and-forget async)
           ▼
┌─────────────────────┐
│  WhatsApp Module     │  (NEW: app/modules/whatsapp/)
│  - service.py        │  send_task_notification()
│  - client.py         │  WhatsApp Cloud API HTTP client
│  - templates.py      │  Template name/variable mapping
│  - phone_utils.py    │  E.164 normalization for Nepal
└──────────┬──────────┘
           │ HTTP POST
           ▼
┌─────────────────────┐
│  Meta WhatsApp       │
│  Cloud API           │
│  graph.facebook.com  │
└─────────────────────┘
```

### Why not a background job queue?

The project currently has no background job infrastructure (no Celery, no Redis, no outbox). The WhatsApp Cloud API responds in <500ms typically. The implementation uses `asyncio.create_task()` to fire the HTTP call without blocking the request. If the call fails, it logs the error but does not retry (acceptable for notifications). A dead-letter/retry system can be added later if delivery reliability becomes critical.

---

## New Files

```
apps/backend/app/modules/whatsapp/
├── __init__.py
├── client.py          # HTTP client for WhatsApp Cloud API
├── service.py         # send_task_notification() orchestrator
├── templates.py       # Template definitions and variable builders
└── phone_utils.py     # Phone number normalization (Nepal-focused)
```

---

## Configuration (Environment Variables)

Add to `apps/backend/app/core/config.py` `Settings` class:

```python
# WhatsApp Business Cloud API
whatsapp_enabled: bool = False                    # Feature flag; False = no messages sent
whatsapp_phone_number_id: str = ""                # Meta phone number ID (from Business Manager)
whatsapp_access_token: str = ""                   # Permanent system user token (from Meta)
whatsapp_api_version: str = "v21.0"               # Graph API version
whatsapp_default_country_code: str = "+977"       # Nepal default for bare numbers
```

In production, `whatsapp_access_token` should come from AWS SSM Parameter Store / Secrets Manager (injected as env var by ECS task definition). Add to `infra/terraform/ssm.tf`:

```hcl
resource "aws_ssm_parameter" "whatsapp_access_token" {
  name  = "/pailo/prod/whatsapp-access-token"
  type  = "SecureString"
  value = "PLACEHOLDER"
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "whatsapp_phone_number_id" {
  name  = "/pailo/prod/whatsapp-phone-number-id"
  type  = "String"
  value = "PLACEHOLDER"
  lifecycle { ignore_changes = [value] }
}
```

---

## Module Implementation Details

### `client.py` — WhatsApp Cloud API Client

```python
import httpx
import structlog
from app.core.config import get_settings

logger = structlog.get_logger()

GRAPH_API_BASE = "https://graph.facebook.com"

async def send_template_message(
    to_phone: str,           # E.164 format: +9779852030953
    template_name: str,      # Pre-approved template name
    language_code: str,      # "en" or "ne" (Nepali)
    components: list[dict],  # Template variable components
) -> dict | None:
    """Send a WhatsApp template message. Returns API response or None on failure."""
    settings = get_settings()
    if not settings.whatsapp_enabled:
        logger.info("whatsapp_disabled", template=template_name, to=to_phone)
        return None

    url = f"{GRAPH_API_BASE}/{settings.whatsapp_api_version}/{settings.whatsapp_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone.lstrip("+"),  # API expects without +
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()
            logger.info("whatsapp_sent", template=template_name, to=to_phone, message_id=result.get("messages", [{}])[0].get("id"))
            return result
        except httpx.HTTPStatusError as e:
            logger.error("whatsapp_api_error", status=e.response.status_code, body=e.response.text, template=template_name, to=to_phone)
            return None
        except httpx.RequestError as e:
            logger.error("whatsapp_network_error", error=str(e), template=template_name, to=to_phone)
            return None
```

### `phone_utils.py` — Nepal Phone Normalization

```python
import re
from app.core.config import get_settings

def normalize_phone_to_e164(phone: str | None) -> str | None:
    """
    Normalize a phone number to E.164 format for WhatsApp.
    Handles Nepal numbers: 98XXXXXXXX, 098XXXXXXXX, +97798XXXXXXXX.
    Returns None if phone is missing or unparseable.
    """
    if not phone:
        return None

    # Strip spaces, dashes, dots, parens
    cleaned = re.sub(r"[\s\-\.\(\)]+", "", phone.strip())

    # Already E.164
    if cleaned.startswith("+") and len(cleaned) >= 10:
        return cleaned

    settings = get_settings()
    default_code = settings.whatsapp_default_country_code  # "+977"

    # Remove leading 0 (Nepal trunk prefix)
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]

    # Nepal mobile: 10 digits starting with 9
    if len(cleaned) == 10 and cleaned.startswith("9"):
        return f"{default_code}{cleaned}"

    # If already has country code without +
    if cleaned.startswith("977") and len(cleaned) >= 12:
        return f"+{cleaned}"

    # Fallback: prepend country code
    if len(cleaned) >= 7:
        return f"{default_code}{cleaned}"

    return None  # Too short / unparseable
```

### `templates.py` — Message Template Builders

```python
"""
WhatsApp message template definitions.

Each template must be pre-registered and approved in Meta Business Manager.
Template names must match exactly what's approved.

Variables are positional: {{1}}, {{2}}, etc. in the template body.
"""

def task_assigned_components(task_code: str, task_title: str, assigner_name: str) -> list[dict]:
    """
    Template: task_assigned
    Body: "You have been assigned task {{1}}: {{2}} by {{3}}. Open the app to view details."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:100]},
        {"type": "text", "text": assigner_name},
    ]}]


def task_status_update_components(task_code: str, task_title: str, new_status: str, actor_name: str) -> list[dict]:
    """
    Template: task_status_update
    Body: "Task {{1}} ({{2}}) status changed to {{3}} by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": new_status.replace("_", " ").title()},
        {"type": "text", "text": actor_name},
    ]}]


def task_blocked_components(task_code: str, task_title: str, blocker_reason: str, actor_name: str) -> list[dict]:
    """
    Template: task_blocked
    Body: "⚠️ Task {{1}} ({{2}}) is BLOCKED. Reason: {{3}}. Reported by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": blocker_reason[:200] if blocker_reason else "No reason given"},
        {"type": "text", "text": actor_name},
    ]}]


def task_unblocked_components(task_code: str, task_title: str, new_status: str, actor_name: str) -> list[dict]:
    """
    Template: task_unblocked
    Body: "✅ Task {{1}} ({{2}}) is now unblocked → {{3}}. Updated by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": new_status.replace("_", " ").title()},
        {"type": "text", "text": actor_name},
    ]}]


def task_comment_components(task_code: str, commenter_name: str, comment_preview: str) -> list[dict]:
    """
    Template: task_comment
    Body: "💬 {{1}} commented on task {{2}}: \"{{3}}\""
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": commenter_name},
        {"type": "text", "text": task_code},
        {"type": "text", "text": comment_preview[:150]},
    ]}]
```

### `service.py` — Notification Orchestrator

```python
import asyncio
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import Task, Employee, User
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
    """Fire-and-forget: notify assignee of new task assignment."""
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
    """Fire-and-forget: notify assignee of status change."""
    phone = await _resolve_assignee_phone(session, task)
    if not phone:
        logger.warning("whatsapp_no_phone", task_id=str(task.id), event="status_change")
        return

    # Choose template based on transition
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
    """Fire-and-forget: notify assignee of new comment (skip if commenter IS assignee)."""
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
```

---

## Integration Points in Existing Service

Modify `apps/backend/app/modules/factory/service.py` to call WhatsApp notifications after successful DB commits. Use `asyncio.create_task()` so the HTTP call doesn't block the response.

### In `create_task()` — after `session.commit()`:

```python
if task.assigned_to_employee_id or task.assigned_to_user_id:
    asyncio.create_task(
        whatsapp_service.notify_task_assigned(session, task, actor.display_name)
    )
```

### In `patch_task()` — when assignment changes:

```python
# Detect assignment change
old_employee = task.assigned_to_employee_id
old_user = task.assigned_to_user_id
# ... apply patch ...
await session.commit()

assignment_changed = (
    task.assigned_to_employee_id != old_employee or
    task.assigned_to_user_id != old_user
)
if assignment_changed and (task.assigned_to_employee_id or task.assigned_to_user_id):
    asyncio.create_task(
        whatsapp_service.notify_task_assigned(session, task, actor.display_name)
    )
```

### In `update_task_status()` — after `session.commit()`:

```python
asyncio.create_task(
    whatsapp_service.notify_task_status_change(
        session, task, old_status, payload.new_status, actor.display_name,
        blocker_reason=payload.blocker_reason,
    )
)
```

### In `create_task_comment()` — after `session.commit()`:

```python
# Don't notify if commenter is the assignee
is_self_comment = (task.assigned_to_user_id == actor.id)
if not is_self_comment:
    asyncio.create_task(
        whatsapp_service.notify_task_comment(session, task, actor.display_name, payload.comment_text)
    )
```

---

## Database Changes

**No schema migration required.** The `users.phone` and `employees.phone` columns already exist in the DB. The Employee CRUD and User phone editing are new API/UI surfaces over existing columns.

If needed later, consider adding:
- `notification_log` table for delivery tracking
- `whatsapp_opted_out` boolean on Employee/User for opt-out preference

---

## Dependencies

Add to `apps/backend/pyproject.toml`:

```toml
[project.dependencies]
# ... existing deps ...
httpx = ">=0.27"  # Already likely present for tests; used for WhatsApp API calls
```

Check if `httpx` is already a dependency (it may be via test deps). If not, add it as a runtime dependency.

---

## WhatsApp Business Setup (Manual Steps)

See "What You (the Dev) Need to Do" section above for the full step-by-step including Meta setup, AWS infrastructure, and data entry.

---

## Testing Strategy

### Unit Tests (`tests/test_whatsapp.py`)

```python
# 1. Phone normalization
def test_normalize_nepal_10_digit():
    assert normalize_phone_to_e164("9852030953") == "+9779852030953"

def test_normalize_with_trunk_prefix():
    assert normalize_phone_to_e164("09852030953") == "+9779852030953"

def test_normalize_already_e164():
    assert normalize_phone_to_e164("+9779852030953") == "+9779852030953"

def test_normalize_none():
    assert normalize_phone_to_e164(None) is None

def test_normalize_too_short():
    assert normalize_phone_to_e164("123") is None

# 2. Template component builders (verify structure matches Meta API spec)
def test_task_assigned_components_structure():
    result = task_assigned_components("TASK-2026-000001", "Cut leather panels", "Ram")
    assert result[0]["type"] == "body"
    assert len(result[0]["parameters"]) == 3

# 3. Service layer (mock httpx)
@pytest.mark.asyncio
async def test_notify_skips_when_no_phone(db_session):
    # Create task with no assigned employee phone
    ...
    # Should not raise, should log warning

@pytest.mark.asyncio
async def test_notify_sends_when_phone_present(db_session, respx_mock):
    # Mock WhatsApp API
    respx_mock.post(...).respond(200, json={"messages": [{"id": "wamid.xxx"}]})
    ...

# 4. Feature flag test
@pytest.mark.asyncio
async def test_disabled_flag_skips_send(monkeypatch):
    monkeypatch.setenv("WHATSAPP_ENABLED", "false")
    # Verify no HTTP call made
```

### Integration Test

- Start backend with `WHATSAPP_ENABLED=false` (default) → verify no errors
- Mock the WhatsApp endpoint with `respx` → verify correct payloads sent after task operations

---

## Rollout Plan

1. **Phase 0**: Build People tab enhancements — Employee CRUD API, phone field on User edit, tabbed UI. Deploy independently (useful even without WhatsApp).
2. **Phase 1**: Build WhatsApp module. Deploy with `WHATSAPP_ENABLED=false`. Code is present but dormant.
3. **Phase 2**: Set up Meta Business account, register phone, submit templates for approval (dev task, see above).
4. **Phase 3**: Once templates approved, add credentials to SSM, set `WHATSAPP_ENABLED=true` in ECS env.
5. **Phase 4**: Enter phone numbers for all assignable users/employees in the People tab.
6. **Phase 5**: Monitor structlog for `whatsapp_sent` / `whatsapp_api_error` events via CloudWatch.

---

## Security Considerations

- **Access token** stored in SSM SecureString, never in source code or `.env` files committed to git.
- **Phone numbers** are PII — already protected by existing role-based access (HR/admin only for employee details).
- **Rate limits**: Meta allows 1000 business-initiated conversations/month on free tier, 100k+ on paid. Monitor usage.
- **No user input in template names**: Template names are hardcoded constants, not derived from user input.
- **Timeout**: 10s HTTP timeout prevents hanging requests from blocking the event loop.

---

## Future Enhancements (Out of Scope for v1)

- **Delivery receipts**: Webhook endpoint to receive read/delivered status from Meta.
- **Notification preferences**: Per-employee opt-out stored in DB.
- **Nepali language templates**: Submit `ne` locale templates for workers who prefer Nepali.
- **Due date reminders**: Scheduled job (APScheduler or Lambda) for tasks due within 24h.
- **Notification log table**: Track all sent messages for audit/debugging.
- **Retry queue**: Simple DB-backed outbox for failed sends.
- **Two-way messaging**: Workers reply to update task status via WhatsApp (requires webhook + NLP).
