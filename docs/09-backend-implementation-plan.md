# Pailo Backend Implementation Plan

## Goal

Build a secure, typed, modular FastAPI backend that controls the factory's source of truth: tasks, employees, products, inventory, work orders, labels, suppliers, QC, costing, and audit history.

The backend should be boring in the best way: predictable, observable, easy to test, and cheap to run on ECS.

## Target Stack

Use these package targets as of 2026-05-02:

- `python 3.13.x`
- `fastapi 0.136.1`
- `pydantic 2.13.3`
- `sqlalchemy 2.0.49`
- `alembic 1.18.4`
- `asyncpg 0.31.0`
- `uvicorn 0.46.0`
- `httpx 0.28.1`
- `pytest 9.0.3`
- `pytest-asyncio 1.3.0`
- `testcontainers 4.14.2`
- `ruff 0.15.12`
- `mypy 1.20.2`
- `structlog 25.5.0`
- `opentelemetry-sdk 1.41.1`
- `sentry-sdk 2.58.0`
- `redis 7.4.0` only if Redis is added later.
- `celery 5.6.3` only if a real worker queue is added later.

Use exact lockfiles and automated update PRs. Do not blindly auto-deploy major updates.

## Backend Responsibilities

The backend owns:

- Authentication token verification.
- Role and object-level authorization.
- OpenAPI contract.
- Domain validation and business rules.
- Database writes and transactions.
- Inventory quantity correctness.
- Cost calculations.
- Work order state transitions.
- Task completion/review rules.
- Label PDF generation.
- S3 presigned URL creation.
- Audit logging.
- Background job orchestration.

The backend should never trust the frontend for permissions, costs, stock numbers, task completion rules, or label data.

## Backend Architecture

Use a modular monolith with explicit module boundaries.

```text
apps/backend/
  app/
    main.py
    api/
      deps.py
      router.py
      v1/
        tasks.py
        employees.py
        products.py
        inventory.py
        work_orders.py
        labels.py
        suppliers.py
        quality.py
        reports.py
    core/
      config.py
      security.py
      logging.py
      errors.py
      pagination.py
      permissions.py
      time.py
    db/
      session.py
      base.py
      migrations.py
    modules/
      iam/
      employees/
      tasks/
      products/
      inventory/
      production/
      labels/
      suppliers/
      quality/
      reports/
      audit/
      files/
      jobs/
    tests/
  alembic/
  pyproject.toml
```

Each module should contain:

- SQLAlchemy models.
- Pydantic schemas.
- Repository/query functions.
- Service/business logic.
- API router.
- Tests.

Do not put business rules directly inside route handlers.

## API Style

Use REST with OpenAPI-first discipline.

Route shape:

```text
/api/v1/auth/me
/api/v1/tasks
/api/v1/task-boards
/api/v1/employees
/api/v1/product-styles
/api/v1/product-variants
/api/v1/materials
/api/v1/inventory-movements
/api/v1/work-orders
/api/v1/quality-inspections
/api/v1/label-templates
/api/v1/label-print-jobs
/api/v1/suppliers
/api/v1/purchase-orders
/api/v1/reports/dashboard
```

API response rules:

- Use stable IDs and human-readable codes.
- Use ISO timestamps in UTC.
- Use NPR integer minor units where possible, for example `cost_paisa`, or use decimal strings if paisa is not needed.
- Use explicit pagination metadata.
- Use typed error responses with error code, message, and field errors.
- Do not expose internal stack traces.

## Authentication And Authorization

Use Amazon Cognito for identity.

Flow:

1. User signs in through frontend using Cognito-hosted or custom UI.
2. Frontend receives secure tokens.
3. Backend verifies JWT signature using Cognito JWKS.
4. Backend maps Cognito subject/email/phone to local `users` and `employees`.
5. Backend enforces role and permission checks for every endpoint.

MVP signup policy:

- Disable public self-signup. Factory users should be invited or created by an owner/admin.
- The first owner/admin is not guessed from the AWS account or GitHub account. It is the email configured as `initial_owner_admin_email` during deployment.
- After Cognito is created, invite that email through Cognito `admin-create-user` or an equivalent admin screen/automation.
- On database bootstrap or first authenticated login, if no local owner/admin exists and the authenticated email matches `initial_owner_admin_email`, create the local `owner_admin` user and employee mapping.
- Once the first owner/admin exists, additional users are invited from inside the app by an authorized owner/admin or office admin.
- Users may use Gmail addresses as their email usernames, but the MVP should not depend on Google OAuth or `Continue with Google` for core login.

Local roles:

- owner_admin
- factory_manager
- inventory_clerk
- purchasing
- hr_admin
- quality_inspector
- sales_dispatch
- worker

Permission examples:

- `task:create`
- `task:update:any`
- `task:update:own`
- `inventory:adjust`
- `label-template:update`
- `employee:read_sensitive`
- `costing:read`

Object-level authorization is mandatory. For example, a worker can update only assigned tasks, not every task by ID.

## Core Modules

### Tasks

Responsibilities:

- Task boards.
- Task creation and assignment.
- Status transitions.
- Blocker handling.
- Comments and attachments.
- Task history.
- Review/approval workflows.
- Task templates.

Important rules:

- Blocked tasks require a blocker reason.
- Some task types require review before `done`.
- Status updates are append-only history.
- Completed quantity cannot exceed assigned quantity unless manager approves.
- Task updates should use optimistic concurrency with a `version` field.

### Products

Responsibilities:

- Initial 15 shoe styles.
- Style codes.
- Colorways.
- Size variants.
- Product photos.
- Sample statuses.
- BOM association.

### Inventory

Responsibilities:

- Material master.
- Material batches/lots.
- Finished goods stock.
- Inventory movements.
- Low-stock alerts.
- Stock adjustments.

Important rule: inventory quantity should change only through inventory movement transactions.

### Production

Responsibilities:

- Work orders.
- Size-run lines.
- Stage logs.
- Material reservations.
- Finished goods receiving.
- Production dashboards.

### Labels

Responsibilities:

- Template storage.
- Template versioning.
- Label variable validation.
- QR/barcode data.
- PDF generation.
- Print job history.

Recommended MVP implementation:

- Store template dimensions and layout JSON in PostgreSQL.
- Render HTML/CSS from trusted template data.
- Generate PDF in backend using a container-safe renderer.
- Store generated PDF in S3.
- Return signed URL to frontend.

Avoid editing binary Word files directly. Recreate `Sticker 42.doc` as a web template.

### Files

Responsibilities:

- S3 key generation.
- Presigned upload/download URLs.
- File metadata records.
- MIME/type validation.
- Optional image processing later.

Use private S3 buckets. Do not make product photos public by default. The backend should issue signed URLs.

## Background Jobs

Because initial traffic is very low, avoid a dedicated Redis/Celery stack at launch.

Use this launch pattern:

- Short tasks: FastAPI request or `BackgroundTasks` if safe.
- Medium tasks: `jobs` table plus ECS scheduled task runner.
- Reliable events: transactional outbox table.

Good launch jobs:

- Label PDF generation.
- Image thumbnail generation.
- Low-stock alert calculation.
- Daily production summary.
- Backup verification reminders.

Add Redis/Valkey + Celery later only when:

- PDF/image jobs block users.
- Scheduled jobs become frequent.
- Real-time notifications need a broker.
- Multiple backend tasks need distributed queueing.

## Database Access

- Use SQLAlchemy 2 async sessions.
- One request gets one session.
- Keep transactions short.
- Use explicit service-level transactions for inventory/work-order operations.
- Use `SELECT ... FOR UPDATE` or equivalent patterns for stock mutation rows.
- Do not lazy-load large object graphs in route handlers.
- Use targeted queries and DTOs for dashboards.

## Error Handling

Define a stable error shape:

```json
{
  "error": {
    "code": "TASK_BLOCKER_REQUIRED",
    "message": "Blocked tasks require a blocker reason.",
    "fields": {
      "blocked_reason": ["Required when status is blocked."]
    },
    "request_id": "req_..."
  }
}
```

Common error categories:

- validation_error
- permission_denied
- not_found
- conflict
- inventory_rule_violation
- task_transition_invalid
- label_template_invalid
- rate_limited

## Security

Apply OWASP API Security practices:

- Check object-level authorization on every object access.
- Check function-level authorization on every endpoint.
- Avoid mass assignment by using explicit Pydantic input schemas.
- Rate-limit sensitive endpoints.
- Validate file uploads by size and MIME type.
- Keep API docs private or authenticated in production if needed.
- Disable debug output.
- Use strict CORS for the frontend domain.
- Log security-relevant events without logging secrets.
- Store secrets in SSM Parameter Store or Secrets Manager, not env files in source.

## Observability

Every request should include:

- Request ID.
- User ID when authenticated.
- Route name.
- Status code.
- Duration.
- Error code if failed.

Use:

- `structlog` for JSON logs.
- CloudWatch logs with 14-day retention at launch.
- Sentry for exceptions if budget allows.
- OpenTelemetry instrumentation for traces when debugging production issues.

Metrics to expose:

- Request count and latency.
- Error count by route.
- Task status update count.
- Label PDF generation duration.
- DB query latency for key endpoints.
- Inventory adjustment count.

## Backend Testing

- Unit tests for services and permissions.
- Integration tests with PostgreSQL using Testcontainers.
- API tests with FastAPI test client/httpx.
- Migration tests: upgrade from empty DB and from previous migration.
- Security tests for object-level authorization.
- Inventory transaction tests for concurrent stock changes.
- Label PDF snapshot/metadata tests.

Critical test scenarios:

- Worker cannot update someone else's task.
- Blocked task requires reason.
- Finished goods cannot dispatch before QC approval.
- Inventory cannot go negative without manager override.
- Label print job records template version.
- Work order completion updates finished goods correctly.

## Backend Deliverables

- FastAPI app skeleton.
- Cognito auth verification.
- Role/permission system.
- Domain modules.
- OpenAPI contract.
- PostgreSQL async data layer.
- Alembic migrations.
- S3 file service.
- Label PDF generation service.
- Audit logging.
- Test suite.
- Docker image ready for ECS.
