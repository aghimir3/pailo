# Pailo Technical Implementation Overview

## Purpose

This document defines the technical implementation plan for the Pailo factory management app. It connects the business/product plan to concrete frontend, backend, database, deployment, and quality plans.

Pailo starts with about 15 shoe styles, about 100 pairs/day production, and about 5 active app users/day. The architecture should be robust and modern, but not overbuilt or expensive. The app must feel snappy, polished, and futuristic while staying practical for a shoe factory in Nepal.

Browser and mobile device support are production requirements. Chrome, Safari, and Brave are the dominant browsers for Pailo users and should be treated as the primary browser support matrix. The app should also work well on factory-floor phones, including modern Huawei phones without Google Mobile Services, Samsung Galaxy S24 Ultra or newer Galaxy S/Ultra models, and iPhone 15 or newer models. Huawei Browser and Samsung Internet remain device-specific compatibility targets, and Brave workflows must work with normal Brave Shields enabled.

## Research Notes

This plan was prepared on 2026-05-02 using current package registry checks, Context7 MCP documentation, and official web docs for Next.js, shadcn/ui, Tailwind CSS, FastAPI, SQLAlchemy, PostgreSQL, AWS ECS/Fargate, Amazon RDS, Amazon S3, and OWASP API Security.

Important verified current targets:

- Next.js: 16.2.4.
- React / React DOM: 19.2.5.
- TypeScript: 6.0.3.
- Tailwind CSS: 4.2.4.
- shadcn CLI: 4.6.0.
- TanStack Query: 5.100.8.
- TanStack Table: 8.21.3.
- FastAPI: 0.136.1.
- Python: 3.13.2 available locally.
- Pydantic: 2.13.3.
- SQLAlchemy: 2.0.49.
- Alembic: 1.18.4.
- asyncpg: 0.31.0.
- PostgreSQL upstream current docs: 18.3.

Before coding, pin exact versions in lockfiles and enable automated dependency updates through Renovate or Dependabot.

## Architectural Decision

Use a modular monolith backend with a separate frontend and separate managed database.

Do not start with microservices. Pailo has low initial traffic, a small team, and a tightly connected domain. A modular monolith gives strong boundaries without paying the operational cost of many services.

Runtime separation:

- Frontend container: Next.js web app.
- Backend container: FastAPI API service.
- Database: Amazon RDS PostgreSQL.
- File storage: Amazon S3.
- Auth identity provider: Amazon Cognito.
- Deployment: Amazon ECS on Fargate.

Initial cost-saving deployment can run frontend and backend as separate containers inside one ECS task definition behind one Application Load Balancer. This keeps the code and containers separated while avoiding two always-on ECS services at launch. When usage grows, split them into independent ECS services.

## System Diagram

```text
Users
  |
  | HTTPS
  v
CloudFront optional for static/runtime cache
  |
  v
Application Load Balancer
  |-- /*      -> ECS container: frontend Next.js
  |-- /api/* -> ECS container: backend FastAPI
                  |
                  | private network
                  v
             RDS PostgreSQL
                  |
                  v
             Automated backups

Backend FastAPI <-> S3 private bucket for photos, docs, labels, PDFs
Backend FastAPI <-> Cognito JWKS for auth token verification
ECS / Backend / Frontend -> CloudWatch logs and metrics
```

## Domain Plan

Pailo owns `pailoshoes.com`. Use it deliberately:

- `app.pailoshoes.com`: internal factory management app at launch.
- `pailoshoes.com`: future public brand site, catalog, product verification, and storytelling.
- `www.pailoshoes.com`: redirect to `pailoshoes.com` when the public site exists.
- `api.pailoshoes.com`: optional later; at launch, prefer same-origin `/api/*` behind the app load balancer to reduce CORS complexity and keep infrastructure simple.
- `assets.pailoshoes.com`: optional later if public assets are served through CloudFront.

Use the domain in AWS Route 53, ACM TLS certificates, Cognito callback/logout URLs, QR-code product links, and customer-facing email setup. Keep the internal app on the app subdomain so the root domain stays clean for Pailo's public brand.

## Repository Layout

Use one repository with separated app folders and clear boundaries.

```text
pailo/
  apps/
    frontend/
      src/
      public/
      components.json
      package.json
    backend/
      app/
      alembic/
      tests/
      pyproject.toml
  packages/
    api-client/
      generated/
      package.json
    config/
      eslint/
      prettier/
      tsconfig/
  infra/
    terraform/        # AWS ECS/Fargate launch infrastructure
    ecs/
    scripts/
  docs/
```

Recommended tooling:

- `pnpm` workspaces for frontend packages.
- `uv` or `pip-tools` for Python dependency locking.
- Docker Compose for local development.
- GitHub Actions for CI/CD.
- OpenAPI generated TypeScript client shared from backend to frontend.
- Terraform for AWS infrastructure, with the launch root at `infra/terraform` and `ap-south-1` as the default region for Nepal latency.

## Target Stack

### Frontend

- Next.js App Router.
- React 19.
- TypeScript 6.
- Tailwind CSS 4 with CSS variables.
- shadcn/ui open-code components.
- Radix primitives through shadcn/ui.
- lucide-react icons.
- TanStack Query for server state.
- TanStack Table for dense operational tables.
- React Hook Form + Zod for forms.
- Recharts for dashboards.
- Sonner for toast notifications.
- next-themes for theme control.
- @zxing/browser for barcode/QR scanning.
- react-konva only where a visual label editor is truly needed.
- Playwright, Vitest, MSW, ESLint, and Prettier for quality.

Detailed plan: [08-frontend-implementation-plan.md](08-frontend-implementation-plan.md).

### Backend

- Python 3.13.
- FastAPI.
- Pydantic v2.
- SQLAlchemy 2 async ORM.
- Alembic migrations.
- asyncpg PostgreSQL driver.
- Uvicorn server.
- Amazon Cognito JWT verification.
- boto3 or aioboto3 for S3.
- Postgres-backed outbox/jobs for launch.
- Optional Celery/Redis only after real job volume justifies it.
- OpenTelemetry and Sentry for observability.

Detailed plan: [09-backend-implementation-plan.md](09-backend-implementation-plan.md).

### Database

- Amazon RDS PostgreSQL.
- Target PostgreSQL 18.x when supported in the selected AWS region.
- Use the latest AWS-supported major version if RDS support lags upstream.
- Normalized relational schema for factory operations.
- JSONB only for flexible template/config payloads.
- Alembic-controlled migrations.
- Automated backups, point-in-time restore, and regular restore tests.

Detailed plan: [10-database-implementation-plan.md](10-database-implementation-plan.md).

### AWS Deployment

- ECS on Fargate with ARM64/Graviton where images and libraries support it.
- ECR for images.
- One shared ALB at launch.
- RDS PostgreSQL single-AZ at launch to save cost, Multi-AZ later.
- S3 private buckets with presigned uploads/downloads.
- CloudWatch logs with short retention at launch.
- SSM Parameter Store or Secrets Manager for secrets.
- Cognito for user identity.

Detailed plan: [11-aws-ecs-deployment-cost-plan.md](11-aws-ecs-deployment-cost-plan.md).

## Domain Modules

Build the backend and frontend around the same domain modules:

- Identity and roles.
- Employees.
- Task/project management.
- Product styles and gallery.
- BOM and costing.
- Raw material inventory.
- Finished goods inventory.
- Suppliers and purchasing.
- Work orders and production stages.
- Quality control and rework.
- Label templates and print jobs.
- Customers, orders, and dispatch.
- Reports and dashboards.
- Audit log and system settings.

## Key Workflows

### Production Batch

1. Create or select one of the starting 15 styles.
2. Create style variants by color and size.
3. Create BOM and target cost.
4. Create work order by style, color, size, and quantity.
5. Auto-create manufacturing tasks from templates.
6. Reserve and issue materials.
7. Employees update task/stage status.
8. QC records defects and rework.
9. Receive finished goods.
10. Generate labels and print PDFs.
11. Dispatch or reserve finished stock.

### Employee Task Flow

1. Manager creates task or work order generates it.
2. Employee sees task in `My Tasks`.
3. Employee starts task.
4. Employee adds quantity, photo, note, or blocker.
5. Employee requests review or completes task.
6. Manager/QC approves when required.
7. Task history remains immutable.

### Label Printing

1. User selects work order or finished goods batch.
2. User selects label template.
3. Backend merges product, batch, size, price, and QR/barcode data.
4. Backend generates print-accurate PDF.
5. Print job is stored with template version and user.

## Cost-Conscious Principles

- Keep frontend and backend separate in code and containers, but co-schedule them in one ECS task at launch.
- Avoid Redis, Elasticsearch, Kubernetes, Kafka, and separate worker fleets until usage proves the need.
- Use PostgreSQL for transactional data, lightweight search, job/outbox queues, and audit history.
- Store photos and documents in S3, not in the database.
- Use one shared ALB instead of separate load balancers.
- Prefer public-subnet Fargate tasks with strict security groups over NAT Gateway at launch, because NAT Gateway cost can exceed compute cost for this traffic level.
- Use RDS single-AZ at launch with good backups; move to Multi-AZ when downtime risk matters more than cost.
- Keep logs useful but not expensive: start with 14-day CloudWatch retention.

## Performance Principles

- The app should feel instant for 5 users even on small infrastructure.
- Cache read-heavy dashboard data with short TTLs.
- Use TanStack Query caching and optimistic updates for task boards.
- Paginate large tables from day one.
- Compress and resize product photos before upload.
- Serve generated PDFs and images through signed URLs.
- Keep API responses small and typed.
- Avoid loading all products, inventory, and task history on one page.

## Security Principles

- Use Cognito for authentication and MFA readiness.
- Backend enforces all permissions; frontend checks are only UX helpers.
- Every object fetch/update must check object-level authorization.
- Record audit logs for inventory, labels, employees, cost, work orders, and tasks.
- Store secrets outside containers.
- Keep S3 buckets private and ACLs disabled.
- Use HTTPS everywhere.
- Apply OWASP API Security thinking: object-level authorization, authentication, property-level authorization, rate limiting, secure config, endpoint inventory, and third-party API validation.

## Implementation Phases

### Phase 1: Foundation MVP

- Repo and CI.
- Next.js shell with futuristic shadcn/ui design system.
- FastAPI project with OpenAPI.
- PostgreSQL schema foundation.
- Cognito login.
- Product styles, employees, suppliers, tasks, inventory basics.
- Work orders and label PDF MVP.
- ECS Fargate deployment.

### Phase 2: Factory Accuracy

- BOM costing.
- Material reservation and issue.
- Production stage tracking.
- QC and rework.
- Better dashboards.
- Photo uploads and product gallery polish.

### Phase 3: Snappy Operations

- Offline-tolerant task updates.
- QR/barcode scanning.
- Label template visual editor.
- Advanced reports.
- Background jobs split out if needed.

### Phase 4: Scale To 1000 Pairs/Day

- Split ECS frontend/backend services.
- Add worker service.
- Add Redis/Valkey only if job queues or cache load justify it.
- RDS Multi-AZ.
- More granular role permissions.
- Customer portal and sales workflows.
