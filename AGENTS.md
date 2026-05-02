# Project Guidelines

## Project Context

Pailo is a factory and operations platform for Pailo Shoes, a Nepal-based shoe factory growing from about 100 pairs/day toward 1000 pairs/day. The app is an internal factory operating system first: products, BOM/costing, tasks, work orders, inventory, employees, suppliers, labels, QC, reporting, and dispatch. Do not treat the first product as ecommerce or a public marketing site.

The current repository is planning-docs-first. Treat [docs/README.md](docs/README.md) as the map and the numbered docs as the source of truth until implementation files exist. When docs and code disagree, call out the mismatch and update the relevant docs as part of the change.

## Source Documents

- [docs/01-product-plan.md](docs/01-product-plan.md): product vision, roles, modules, MVP scope, and business risks.
- [docs/02-roadmap.md](docs/02-roadmap.md): staged delivery plan and success criteria.
- [docs/03-data-model.md](docs/03-data-model.md): core entities, relationships, and data-quality rules.
- [docs/04-label-printing-plan.md](docs/04-label-printing-plan.md): label templates, PDF output, variables, print workflow, and brand safety.
- [docs/05-operations-playbook.md](docs/05-operations-playbook.md): daily/weekly rhythms, KPIs, and data-entry expectations.
- [docs/06-task-management-plan.md](docs/06-task-management-plan.md): manufacturing task boards, employee updates, manager review, and task history.
- [docs/07-technical-implementation-overview.md](docs/07-technical-implementation-overview.md): target architecture, stack, repo layout, domain modules, security, and scaling path.
- [docs/08-frontend-implementation-plan.md](docs/08-frontend-implementation-plan.md): Next.js frontend plan, mobile UX, browser/device support, UI system, testing.
- [docs/09-backend-implementation-plan.md](docs/09-backend-implementation-plan.md): FastAPI backend modules, auth, API style, jobs, security, observability, testing.
- [docs/10-database-implementation-plan.md](docs/10-database-implementation-plan.md): PostgreSQL schema strategy, constraints, indexes, migrations, backup, privacy.
- [docs/11-aws-ecs-deployment-cost-plan.md](docs/11-aws-ecs-deployment-cost-plan.md): AWS ECS/Fargate launch architecture, cost controls, CI/CD, environments.
- [docs/12-api-integration-quality-plan.md](docs/12-api-integration-quality-plan.md): OpenAPI contract, generated clients, tests, CI gates, release plan.

## Product Rules

- Optimize for daily factory control: fast task updates, work-order visibility, inventory accuracy, labels, QC, and production dashboards.
- Keep workflows mobile-first and factory-floor friendly. Workers should use big actions, dropdowns, quick quantity inputs, scanning/manual-code fallback, and photo upload instead of long forms.
- Preserve one source of truth for stock, costs, production status, labels, employee records, and audit history.
- Use NPR for money unless another currency is explicitly required. Keep Nepal-ready details such as local phone/address fields and optional Nepali date/language support in mind.
- Keep competitor trademarks, logos, and brand names out of generated labels, product names, packaging, invoices, catalog exports, and customer-facing outputs. Store inspiration only as internal reference notes/photos when needed.
- Use `app.pailoshoes.com` for the internal factory app. Reserve `pailoshoes.com` and `www.pailoshoes.com` for future public brand/catalog/verification experiences.
- Labels should use Pailo branding, Pailo style codes, immutable template versions, PDF output, and print-job history. Treat `Sticker 42.doc` as a visual reference to recreate, not as a binary file to edit in production.

## Architecture

- Use one monorepo with clear boundaries:

```text
apps/frontend/
apps/backend/
packages/api-client/
packages/config/
infra/
docs/
```

- Build a modular monolith backend and a separate frontend. Do not introduce microservices at launch.
- Domain modules should align across frontend, backend, and database: identity/roles, employees, tasks, product styles/gallery, BOM/costing, raw materials, finished goods, suppliers/purchasing, work orders/stages, QC/rework, labels/print jobs, customers/dispatch, reports, audit, settings.
- Keep frontend and backend separate in code and containers, but launch cost-consciously as two containers in one ECS Fargate service behind one ALB unless requirements change.
- Prefer PostgreSQL for transactional data, search, audit history, jobs/outbox, and reporting until real load proves another system is needed. Avoid Redis, Elasticsearch/OpenSearch, Kafka, Kubernetes, and separate worker fleets at launch unless the docs are intentionally revised.

## Frontend Guidelines

- Target stack: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, TanStack Query, TanStack Table, React Hook Form, Zod, Recharts, Sonner, `@zxing/browser`, Playwright, Vitest, and MSW.
- The first authenticated screen should be the operating dashboard, not a landing page.
- Use a `factory cockpit` design direction: polished, dense, operational, dark/light capable, status-rich, and practical. Avoid marketing-style hero sections for the internal app.
- Design phone-first, then enhance for tablets and desktop. The app must be usable around 390px width without horizontal page scroll.
- Supported browser/device targets include Chrome, Safari, Brave with default Shields, Huawei phones without Google Mobile Services, Samsung Galaxy S/Ultra phones, and iPhone 15 or newer.
- Do not depend on Google Play Services, Firebase, Google Sign-In, Google Fonts from remote Google domains, reCAPTCHA, third-party cookies, tracker-like scripts, hosted social embeds, Samsung-only services, or Apple-only native services for core workflows.
- Self-host fonts and critical UI assets. Prefer same-origin `/api/*` at launch to reduce CORS and privacy-browser issues.
- Always provide manual entry/photo-upload fallback for QR/barcode scanning.
- Generate frontend API types/clients from FastAPI OpenAPI. Do not hand-copy backend response models into TypeScript interfaces.
- Use TanStack Query for server state, local React state for local UI state, and only small context providers for shell/session/theme UI.

## Backend Guidelines

- Target stack: Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2 async ORM, Alembic, asyncpg, Uvicorn, Cognito JWT verification, S3 via boto3/aioboto3, structlog, OpenTelemetry/Sentry where useful, pytest, ruff, and mypy.
- Keep business rules in services/modules, not directly in route handlers.
- Use REST under `/api/v1` with OpenAPI-first discipline, stable typed errors, UTC ISO timestamps, explicit pagination metadata, and object-level authorization.
- Backend owns auth verification, permissions, cost calculations, inventory math, work-order transitions, task review rules, label data resolution, PDF generation, S3 signed URLs, audit logging, and background job orchestration.
- Never trust the frontend for permissions, costs, stock quantities, task completion rules, or label variables.
- Use Cognito for identity and local roles/permissions for application access. Worker updates must be restricted to assigned/authorized tasks.
- Use optimistic concurrency with a `version` field for important mutations.
- Store secrets in SSM Parameter Store or Secrets Manager, not source-controlled env files.

## Data And Database Guidelines

- Use Amazon RDS PostgreSQL with Alembic migrations. Use the newest AWS-supported PostgreSQL major version for the selected region.
- Normalize core factory data. Use JSONB for flexible template/config payloads, not as a substitute for relational modeling.
- Use UUID primary keys plus human-readable factory codes such as `PAI-2026-SNK-001`, `WO-2026-000001`, `TASK-2026-000001`, `PO-2026-000001`, `SUP-0001`, and `EMP-0001`.
- Store timestamps in UTC. Avoid hard deletes for business records.
- Inventory quantity changes must happen only through inventory movement transactions. Manual adjustments require reasons and manager permission.
- Task status updates are append-only history. Blocked tasks require a blocker reason. Important task types can require manager/QC review before final completion.
- Approved BOM versions and approved label template versions should be immutable. New material prices must not silently rewrite old cost snapshots.
- Store files in private S3 buckets and file metadata in PostgreSQL. Use signed URLs for access.
- Restrict sensitive employee fields and documents to HR/admin roles.

## Build And Test

This repo currently contains planning docs only. Do not invent successful build/test results before package files and lockfiles exist.

When implementation is scaffolded, prefer the documented toolchain:

- Frontend: pnpm workspace commands for install, typecheck, lint, unit tests, OpenAPI client generation, and Playwright tests.
- Backend: uv or pip-tools-managed Python environment, ruff, mypy, pytest, pytest-asyncio, Testcontainers, and Alembic migration checks.
- Contracts: regenerate the TypeScript API client from `/openapi.json`; CI should fail if generated client changes are missing.
- Containers: build frontend and backend Docker images before deployment.
- Release gates: type checks, lint, backend tests, frontend tests, OpenAPI client freshness, Docker builds, Alembic migration in staging, health checks, and critical smoke tests.

Critical scenarios to test include task permissions, blocked-task reasons, manager review, inventory transaction correctness, no negative stock without override, QC-before-dispatch, label print-job history, and work-order completion updating finished goods.

## Deployment Guidelines

- Launch target is AWS `ap-south-1` unless latency/cost checks choose otherwise.
- Use Route 53, ACM TLS, ALB, ECS Fargate, ECR, RDS PostgreSQL, private S3, Cognito, CloudWatch, and SSM Parameter Store/Secrets Manager.
- Launch cheaply: one ECS service, one task definition with frontend/backend containers, desired count 1, one shared ALB, RDS single-AZ, no NAT Gateway unless required, 14-day CloudWatch log retention, AWS Budgets alert.
- Keep S3 buckets private with Block Public Access and ACLs disabled. Use IAM task roles for AWS access.
- Add Multi-AZ RDS, split ECS services, workers, Redis/Valkey, WAF, or CloudFront only when operational need justifies it.

## Implementation Conventions

- Before coding a feature, read the relevant numbered docs and preserve their intent. If the implementation requires a different decision, update the docs in the same change.
- Keep module boundaries explicit and avoid cross-module shortcuts that bypass services, permissions, audit logging, or inventory movement rules.
- Prefer generated contracts and typed schemas over duplicated interfaces or ad hoc payloads.
- Add loading, empty, error, success, permission-denied, and mobile states for user-facing workflows.
- Update tests with risk: broader tests for permissions, inventory, labels, work orders, migrations, API contracts, and mobile-critical workflows.
- Keep code and documentation focused on the internal factory app until the roadmap explicitly moves into public catalog, wholesale portal, or ecommerce work.
