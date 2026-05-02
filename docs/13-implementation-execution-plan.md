# Pailo Implementation Execution Plan

## Purpose

This document is the build plan for turning the Pailo planning docs into a working factory operating system. It is intentionally execution-focused: each increment should leave the repo in a runnable, saved state with a clearer user experience than before.

The app should help factory workers move quickly and help the owner understand what is happening in the business: production throughput, blocked work, low stock, QC risk, cost pressure, supplier delays, and daily execution quality.

## Build Principles

- Build the internal factory app first, not a public landing page.
- Ship thin vertical slices that connect shell, API shape, domain data, and useful screens.
- Keep mobile factory-floor workflows fast: large actions, short forms, status clarity, scan/manual fallback, and visible sync states.
- Keep owner views insight-rich: show trends, bottlenecks, cost variance, low-stock risk, quality risk, and work-order progress.
- Save work frequently in small, reviewable file groups.
- Update docs when implementation decisions differ from the planning docs.

## Target Repository Shape

```text
apps/frontend/       # Next.js factory cockpit
apps/backend/        # FastAPI modular monolith
packages/api-client/ # generated or transitional API client types
packages/config/     # shared TypeScript/lint/prettier config later
infra/               # deployment assets later
docs/                # product, technical, and execution docs
```

## Increment 0: Runnable Foundation

Goal: create a runnable local foundation with the first high-value screen and API slice.

Deliverables:

- Monorepo workspace files.
- Next.js frontend app shell.
- FastAPI backend app shell.
- Local sample data for the starting factory cockpit.
- Owner dashboard with production, task, stock, QC, and cost signals.
- Worker-focused My Tasks preview.
- Backend endpoints for health, dashboard summary, tasks, work orders, inventory alerts, and QC signals.
- Basic lint/type/test commands where the scaffold supports them.

Acceptance:

- Frontend starts locally and opens to the operating dashboard.
- Backend starts locally and exposes OpenAPI.
- The first screen is useful on mobile and desktop.
- No production secrets or real credentials are required.

## Increment 1: Contract And Data Layer

Goal: replace transitional sample data with typed contracts and database-ready boundaries.

Deliverables:

- Generate TypeScript API client from FastAPI OpenAPI.
- Add Pydantic schemas for dashboard, tasks, products, inventory, work orders, labels, and QC.
- Add SQLAlchemy model foundation and Alembic baseline.
- Add seed data for production stages, task statuses, roles, and demo factory records.
- Add backend tests for API shapes and core validation rules.

Acceptance:

- Frontend imports generated client types instead of duplicated response models.
- Backend tests pass for key permissions and task transitions.
- Alembic can create the baseline schema on a local database.

## Increment 2: Task And Work-Order Core

Goal: make daily execution real.

Deliverables:

- Task boards and My Tasks backed by API data.
- Create/update/block/request-review task flows.
- Work-order list and detail with size lines and stage progress.
- Append-only task status history.
- Optimistic concurrency with version fields.
- Mobile bottom-sheet task update UX.

Acceptance:

- Workers can update assigned tasks quickly.
- Managers can identify blocked and review-needed work.
- Backend rejects invalid transitions and missing blocked reasons.

## Increment 3: Inventory And Production Accuracy

Goal: protect stock truth and production status.

Deliverables:

- Materials and finished-goods inventory screens.
- Inventory movement API and transaction service.
- Low-stock alerts and stock movement history.
- Work-order material requirement preview.
- Finished-goods receiving path after QC.

Acceptance:

- Stock changes only through movement records.
- Negative stock requires explicit manager override.
- Owner dashboard reflects material risk and production blockers.

## Increment 4: Products, BOM, Cost, And Gallery

Goal: connect factory execution to product economics.

Deliverables:

- Product style gallery and detail screens.
- BOM editor and approved BOM versioning.
- Estimated cost per pair and work-order cost snapshot.
- Product photo upload flow through S3-ready abstractions.

Acceptance:

- Owner can inspect target vs estimated cost.
- Old cost snapshots are not silently rewritten by new material prices.

## Increment 5: Labels And QC

Goal: make labels and quality traceable.

Deliverables:

- Label template list and fixed-template editor.
- Backend PDF generation service boundary.
- Label print-job history.
- QC inspection and defect recording.
- Rework tasks linked to QC failures.

Acceptance:

- Print jobs store template version, actor, time, and output reference.
- Finished goods cannot dispatch before QC approval.

## Increment 6: Deployment And Operations

Goal: prepare for a reliable low-cost production launch.

Deliverables:

- Dockerfiles for frontend and backend.
- Local compose file for app plus PostgreSQL.
- GitHub Actions checks.
- ECS/Fargate infrastructure skeleton.
- Terraform root for AWS VPC, ALB, ECS, ECR, RDS, S3, Cognito, DNS/TLS, CloudWatch, SSM, and budgets.
- Health checks, structured logs, and request IDs.

Acceptance:

- CI verifies frontend, backend, contracts, and containers.
- Staging deploy can run migrations and smoke checks.

## Current Slice

Increment 0 is implemented as the first runnable vertical slice. The current cockpit shows what matters today:

- Pairs planned vs completed.
- Active work orders and stage bottlenecks.
- My Tasks and blocked work.
- Low-stock materials.
- QC issues.
- Cost pressure against the 900 NPR target.
- Supplier delays and quick actions.

Increment 1 has started with OpenAPI generation and a typed frontend API client. The dashboard now imports generated API response types and fetches the FastAPI dashboard endpoint, with representative fallback data kept only so local builds and demos remain usable when the backend is offline.

Increment 6 has an initial Terraform infrastructure root in `infra/terraform`. It encodes the launch AWS stack in `ap-south-1` for Nepal latency, including the cost-conscious one-service ECS/Fargate topology, private RDS/S3, Cognito, Route 53/ACM, CloudWatch, SSM, ECR, and AWS Budget guardrails.

Next implementation work should continue Increment 1 by adding SQLAlchemy models, Alembic baseline migrations, seed data, and broader schema coverage for products, inventory movements, labels, and QC.