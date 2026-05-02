# Pailo API Integration And Quality Plan

## Goal

Keep frontend, backend, database, and AWS deployment connected through typed contracts, automated checks, and release gates.

The app should be fast to build, hard to break accidentally, and easy to operate with a small team.

## API Contract Strategy

FastAPI generates OpenAPI. The frontend consumes generated TypeScript types and clients.

Flow:

```text
FastAPI routes + Pydantic schemas
  -> /openapi.json
  -> generated TypeScript API client
  -> TanStack Query hooks/use cases
  -> shadcn/ui screens
```

Use one of:

- `@hey-api/openapi-ts`
- `openapi-typescript`
- `orval`

Recommendation: start with `@hey-api/openapi-ts` for generated client code, or `openapi-typescript` if the team wants lighter type-only generation.

Rules:

- Do not hand-copy backend response models into frontend types.
- CI should fail if OpenAPI generation changes are not committed.
- Breaking API changes require frontend updates in the same PR.
- Version public API paths under `/api/v1`.

## API Design Standards

Pagination:

```json
{
  "items": [],
  "page_info": {
    "next_cursor": "...",
    "has_more": true
  }
}
```

Use cursor pagination for history-heavy tables and page pagination only for stable small lists.

Filtering:

```text
GET /api/v1/tasks?status=blocked&assigned_to=...&due_before=...
```

Errors:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You cannot update this task.",
    "fields": {},
    "request_id": "req_01..."
  }
}
```

Concurrency:

- Mutating important records should include `version`.
- Backend rejects stale updates with `409 conflict`.
- Frontend refreshes and shows a clear message.

## Key Integration Contracts

### Task Status Update

Frontend sends:

```json
{
  "new_status": "blocked",
  "quantity_completed": 20,
  "update_text": "Stitching paused.",
  "blocker_reason": "Thread color missing.",
  "version": 7
}
```

Backend guarantees:

- Permission check.
- Status transition validation.
- Append-only status update.
- Task row updated atomically.
- Audit log written.

### Work Order Creation

Frontend sends:

```json
{
  "style_id": "...",
  "colorway_id": "...",
  "planned_start_date": "2026-05-10",
  "size_lines": [
    { "size": "40", "planned_quantity": 20 },
    { "size": "41", "planned_quantity": 30 }
  ]
}
```

Backend guarantees:

- Work order code generated.
- Size lines created.
- Cost snapshot captured if BOM exists.
- Optional task templates instantiated.
- Audit log written.

### Inventory Movement

Backend owns all stock math.

Frontend never sends final stock quantity as truth. It sends movement intent:

```json
{
  "movement_type": "issue_to_work_order",
  "material_batch_id": "...",
  "work_order_id": "...",
  "quantity": "12.5",
  "unit_of_measure": "meter"
}
```

Backend guarantees:

- Transaction lock.
- Quantity check.
- Movement record.
- Stock update.
- Audit log.

### Label Print Job

Frontend sends:

```json
{
  "template_version_id": "...",
  "work_order_id": "...",
  "items": [
    { "variant_id": "...", "quantity": 30 }
  ]
}
```

Backend guarantees:

- Template version is immutable.
- Data variables are resolved server-side.
- PDF generated and stored in S3.
- Print job history recorded.
- Signed PDF URL returned.

## Testing Strategy

### Frontend

- Vitest for utility and component tests.
- MSW for mocked API responses.
- Playwright for E2E flows.
- Visual smoke tests for dashboard, task board, product gallery, and label preview.
- Accessibility checks for login, My Tasks, and manager dashboard.
- Primary browser smoke matrix for Chrome, Safari, and Brave covering login, dashboard, My Tasks, task board, inventory, camera scan/manual fallback, photo upload, offline queued task update, and label PDF preview/download.
- Manual mobile smoke test on a modern Huawei phone or Huawei Browser, covering login, My Tasks, camera scan/manual fallback, photo upload, offline queued task update, and label PDF preview/download.
- Manual mobile smoke test on Samsung Galaxy S24 Ultra or a newer Galaxy S/Ultra model in Chrome for Android and Samsung Internet, covering login, dashboard density, My Tasks, task board touch interactions, camera scan/manual fallback, photo upload, offline queued task update, and label PDF preview/download.
- Manual mobile smoke test on iPhone 15 or a newer iPhone model in iOS Safari, covering login, dashboard readability, My Tasks, task update bottom sheet with keyboard open, task board touch interactions, camera scan/manual fallback, photo upload with iPhone camera photos, offline queued task update, and label PDF preview/download.
- Manual Brave Browser smoke test with default Brave Shields enabled on desktop and Android where possible, covering login, dashboard, My Tasks, task board, inventory, camera scan/manual fallback, photo upload, signed PDF preview/download, and offline queued task update.

### Backend

- Unit tests for services, validators, and permissions.
- Integration tests with PostgreSQL Testcontainers.
- API tests for every main route.
- Migration tests.
- Authorization tests for every role.
- Transaction tests for inventory and work order state.

### Database

- Migration upgrade from empty DB.
- Seed data idempotency.
- Constraint tests for uniqueness and invalid quantities.
- Index/query smoke tests for dashboard and task board queries.

### AWS/Deployment

- Container build test.
- Health check test.
- ECS task starts successfully in staging.
- Alembic migration one-off task succeeds.
- S3 presigned upload/download smoke test.
- Cognito token verification smoke test.

## CI Pipeline

Pull request checks:

```text
frontend install
frontend typecheck
frontend lint
frontend unit tests
backend install
backend ruff
backend mypy
backend unit tests
backend integration tests
openapi generate
docker build frontend
docker build backend
```

Main branch deployment:

```text
build images
push to ECR
deploy staging
run migrations
run smoke tests
manual approval for prod initially
run prod migration task
update prod ECS service
run prod smoke tests
```

## Quality Gates

No production deployment unless:

- TypeScript passes.
- Ruff passes.
- Backend tests pass.
- Frontend tests pass.
- OpenAPI client is current.
- Docker images build.
- Alembic migration works on staging.
- Health checks pass after deploy.

Manual approval required for:

- Destructive database migrations.
- Permission model changes.
- Inventory calculation changes.
- Label print template engine changes.
- Auth/Cognito changes.

## Observability

Use one request ID across frontend and backend.

Frontend:

- Send request ID header.
- Capture client errors with Sentry if enabled.
- Track Web Vitals and key route latency.

Backend:

- Log JSON with request ID, user, route, status, duration.
- Capture unhandled exceptions.
- Track DB and PDF generation latency.

AWS:

- CloudWatch logs.
- ECS task stopped alarms.
- ALB 5xx alarms.
- RDS CPU/storage alarms.
- AWS Budget alarm.

## Security Checklist

- Cognito auth enabled.
- MFA available for owner/admin.
- CORS locked to production frontend domain.
- S3 buckets private with Block Public Access.
- S3 ACLs disabled.
- Backend validates object-level permissions.
- Backend validates input with Pydantic.
- Core workflows do not depend on Google Mobile Services, Firebase, Google Sign-In, or Google-hosted assets.
- Core workflows do not depend on Samsung-only browser or device services.
- Core workflows do not depend on Apple-only native services or App Store installation.
- Core workflows do not depend on analytics, advertising, tracking pixels, social embeds, third-party cookies, or scripts commonly blocked by Brave Shields.
- Rate limits for login-adjacent and write-heavy endpoints.
- Audit log for inventory, employee, label, task, and cost changes.
- Secrets stored in SSM Parameter Store or Secrets Manager.
- CloudWatch logs do not include passwords, tokens, or private documents.

## Release Plan

### Release 0.1: Technical Skeleton

- Next.js app shell.
- FastAPI health endpoint.
- RDS connection.
- Cognito login.
- ECS deployment.

### Release 0.2: Factory Directory

- Employees.
- Suppliers.
- Product styles for 15 starting styles.
- Product photos through S3.

### Release 0.3: Tasks And Work Orders

- Task boards.
- My Tasks.
- Work orders.
- Task templates.
- Status history.

### Release 0.4: Inventory And Production

- Materials.
- Inventory movements.
- Finished goods.
- Production stage logs.

### Release 0.5: Labels And QC

- Label template MVP.
- PDF label print jobs.
- QC inspections.
- Rework tasks.

### Release 1.0: Operational MVP

- Dashboard.
- Reports.
- Audit logs.
- Backup runbook.
- Production smoke tests.
- Factory team pilot.

## Definition Of Done

For each feature:

- Backend endpoint with tests.
- Database migration if needed.
- Generated frontend types updated.
- Frontend screen or component completed.
- Role permissions checked.
- Audit behavior defined.
- Loading, empty, error, and success states built.
- Mobile and desktop layout checked.
- E2E test added for critical workflows.
