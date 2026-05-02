# MVP Build Plan

## Goal

Build the MVP as a sequence of vertical factory workflows that keep the app runnable after every slice. The MVP is considered usable when Pailo can run one production batch from product/style setup through work order, task execution, inventory movement, QC, label printing, finished goods receipt, and owner reporting.

This plan is intentionally practical for rapid implementation. It prioritizes flows that connect database records, backend services, API contracts, and mobile-first screens over isolated UI mockups.

## Current State

Already in place before this MVP implementation slice:

- Next.js factory cockpit shell with dashboard, work orders, My Tasks, inventory alerts, QC signals, and light/dark mode.
- FastAPI app shell with OpenAPI, health endpoint, and sample-backed dashboard/task/work-order/inventory/QC endpoints.
- Generated TypeScript API client package.
- PostgreSQL 18 local setup, SQLAlchemy models, Alembic migrations, and CI checks.
- Core MVP schema for users, roles, employees, suppliers, products, BOM, work orders, inventory, tasks, comments, QC, labels, print jobs, and audit logs.
- AWS Terraform launch stack and CI/CD workflow skeleton.

Implementation checkpoint added in this slice:

- Deterministic MVP seed data for app users, employees, suppliers, product styles, BOM snapshot, materials, stock, work orders, tasks, comments, QC, Sticker 42, and print history.
- DB-backed dashboard, tasks, My Tasks, work orders, inventory, QC, catalog, label-template, and CSV report endpoints.
- Task mutations with assignment scoping, blocked-reason enforcement, review-required completion guard, optimistic `version` checks, retry-safe comments, and author-only comment edits.
- Generated OpenAPI JSON and TypeScript API client from the live FastAPI schema.
- A phone-friendly MVP operating console at `/mvp` covering task board, My Tasks, work orders, styles, inventory, suppliers, QC, Sticker 42 preview, users, and owner exports.
- Backend tests for worker scoping, blocked-task reasons, review-required completion, comment ownership, and 24-up label preview.

Remaining gap for production hardening:

- Cognito JWT verification still needs to replace the temporary header/default-user resolver.
- Full create/edit screens for styles, BOMs, work-order generation, inventory movement forms, QC entry, and server-side PDF output should deepen the current seeded workflows.
- Photo upload, S3 signed URLs, audit-log reads, and deployment smoke tests remain production-hardening work.

## Build Order

### Slice 1: Real Task And Work Order Core

Outcome: managers and workers can use task boards and My Tasks against real database records.

Backend:

- Add service/repository layer for users, work orders, tasks, task status updates, and task comments.
- Add DB-backed `GET /api/v1/tasks`, `GET /api/v1/tasks/my-tasks`, and `GET /api/v1/work-orders`.
- Add `POST /api/v1/tasks`, `PATCH /api/v1/tasks/{task_id}`, `POST /api/v1/tasks/{task_id}/updates`, `POST /api/v1/tasks/{task_id}/comments`, and comment edit endpoints.
- Enforce blocked reason, assigned-user updates, author-only comment edits, and optimistic `version` checks.
- Add tests for task assignment, blocked status, review-required completion, and comment ownership.

Frontend:

- Add Tasks route with board columns and My Tasks route optimized for phones.
- Add task update sheet with quantity, blocker reason, note, review request, and complete actions.
- Add comment composer and edit-owned-comment state.

### Slice 2: Product Style, BOM, And Work Order Creation

Outcome: a manager can create the production batch foundation without spreadsheets.

Backend:

- Add product style, variant, material, BOM, and work-order create/list/detail APIs.
- Snapshot approved BOM cost into work orders.
- Generate starter production tasks from a work order.

Frontend:

- Add Styles screen with style detail and simple BOM editor.
- Add Work Orders screen with create flow, size lines, material requirement preview, and stage progress.

### Slice 3: Inventory Movement Truth

Outcome: stock changes only through movement records and dashboard risk reflects real stock.

Backend:

- Add material list/detail APIs and inventory movement service.
- Add receive, issue-to-work-order, wastage, adjustment, and finished-goods receipt mutations.
- Enforce adjustment reasons and negative-stock override rules.
- Add low-stock query from `inventory_stock` and `materials.minimum_stock`.

Frontend:

- Add Inventory screen with material list, low-stock queue, receive/issue/adjust forms, and movement history.
- Add clear phone-friendly receive and issue flows.

### Slice 4: QC And Finished Goods Gate

Outcome: QC decisions are traceable and finished goods cannot become sellable before approval.

Backend:

- Add QC inspection and defect APIs.
- Add rework task creation from failed QC.
- Add finished-goods receipt gate requiring QC pass.

Frontend:

- Add QC screen for inspection entry, defect quantities, photos later, and rework creation.
- Show QC status on work orders and dashboard.

### Slice 5: Sticker 42 Labels

Outcome: Pailo can preview, print, and audit Sticker 42 labels for a work order.

Backend:

- Add label template read APIs and approved `Sticker 42` seed/template configuration.
- Add label variable resolution from style, work order, size, MRP, manufacturer, and batch data.
- Add PDF generation from millimeter coordinates and store print-job history.

Frontend:

- Add label template screen, one-sticker editor, 24-up A4 preview, quantity/per-size entry, and download/print action.

### Slice 6: Auth, Admin, Reports, And Production Hardening

Outcome: the app is deployable as an invite-only internal factory app.

Backend:

- Add Cognito JWT verification dependency and local user bootstrap by `initial_owner_admin_email`.
- Add role/permission guards on every mutation.
- Add CSV reports and audit-log reads for admin roles.
- Add structured logging and production health checks.

Frontend:

- Add login/session shell, role-aware navigation, admin/settings screens, employee/user management, and reports.

## Today Execution Plan

1. Start Slice 1 first. It unlocks the daily factory heartbeat and exercises the existing database design.
2. Keep the dashboard running with fallback data until DB-backed endpoints are complete.
3. Commit each finished vertical group separately: backend service/API, generated client, frontend route, docs/tests.
4. Validate after every group with backend lint/type/tests, API generation, frontend lint/type/build, and migration checks when schema changes.

## Definition Of Done For MVP

- A real production batch can be created, assigned, updated, QC checked, received into stock, labeled, and reported through the app.
- Every stock change is an inventory movement.
- Every important task update is append-only history.
- Every label print is tied to an approved template version and print job.
- Backend owns permissions, cost snapshots, stock math, task transition rules, QC gates, label variables, and audit history.
- The app remains usable on a 390px-wide phone without horizontal page scroll.