# Pailo Software Planning Docs

These documents outline a practical software plan for Pailo, a Nepal-based shoe factory starting around 100 pairs per day and aiming for 1000 pairs per day in 1+ years.

The goal is to build one operating system for the factory: product development, task/project management, production planning, inventory, employee records, supplier contacts, shoe gallery, label printing, costing, and reporting.

## Documents

- [01-product-plan.md](01-product-plan.md) - product vision, users, modules, and recommended features.
- [02-roadmap.md](02-roadmap.md) - staged build plan from MVP to 1000 pairs/day scale.
- [03-data-model.md](03-data-model.md) - suggested core entities and relationships.
- [04-label-printing-plan.md](04-label-printing-plan.md) - plan for editable web label templates and printing.
- [05-operations-playbook.md](05-operations-playbook.md) - operating rhythms, KPIs, and process ideas to support growth.
- [06-task-management-plan.md](06-task-management-plan.md) - employee task tracking, manufacturing boards, status updates, and completion workflow.
- [07-technical-implementation-overview.md](07-technical-implementation-overview.md) - 2026 engineering architecture, stack choices, and system boundaries.
- [08-frontend-implementation-plan.md](08-frontend-implementation-plan.md) - Next.js, shadcn/ui, futuristic factory UI, state, forms, labels, and performance.
- [09-backend-implementation-plan.md](09-backend-implementation-plan.md) - FastAPI service design, modules, security, jobs, files, and APIs.
- [10-database-implementation-plan.md](10-database-implementation-plan.md) - PostgreSQL schema, indexing, migrations, backups, and factory data design.
- [11-aws-ecs-deployment-cost-plan.md](11-aws-ecs-deployment-cost-plan.md) - AWS ECS/Fargate deployment plan optimized for low traffic and low cost.
- [12-api-integration-quality-plan.md](12-api-integration-quality-plan.md) - API contracts, generated clients, testing, CI/CD, observability, and release gates.
- [13-implementation-execution-plan.md](13-implementation-execution-plan.md) - incremental execution plan for building the app from runnable foundation to production launch.
- [14-mvp-scope.md](14-mvp-scope.md) - concrete MVP scope, workflows, acceptance criteria, out-of-scope items, and build order.

## Implementation Artifacts

- [../infra/terraform](../infra/terraform) - Terraform root for the AWS launch stack in `ap-south-1`: VPC, ALB, ECS Fargate, ECR, RDS PostgreSQL, S3, Cognito, Route 53/ACM, CloudWatch, SSM, and AWS Budgets.

## Current Workspace Notes

- Existing label sample: `../Sticker 42.doc`
- Brand name: `Pailo`, a Nepali word written in Roman letters.
- Purchased domain: `pailoshoes.com`.
- Current approximate production cost: `900 NPR` per pair.
- Current production volume: about `100 pairs/day`.
- Target production volume: about `1000 pairs/day` in 1+ years.

## Recommended First Decision

Start with a web app that works well on mobile phones, tablets, and office computers. The first version should focus on daily factory control rather than a public ecommerce site. Once inventory, costing, production, and labels are controlled internally, customer-facing sales tools become much easier to build.

## Current Technical Direction

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui.
- Backend: FastAPI modular monolith with OpenAPI-first APIs.
- Database: PostgreSQL on Amazon RDS.
- Files: Amazon S3 for shoe photos, employee documents, label assets, and generated PDFs.
- Deployment: Terraform-managed AWS ECS on Fargate in `ap-south-1`, tuned for about 5 active users/day at launch while keeping the app snappy.
- Domain plan: use `app.pailoshoes.com` for the internal factory app at launch and reserve `pailoshoes.com` / `www.pailoshoes.com` for the future public brand site.
- Scaling path: start cost-conscious, then split services and add more managed infrastructure only when factory usage justifies it.
