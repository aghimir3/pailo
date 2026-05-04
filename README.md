# Pailo

Internal factory operating system for Pailo Shoes — a Nepal-based shoe factory scaling from ~100 to 1000 pairs/day. Manages production tasks, work orders, inventory, employees, suppliers, product gallery, labels, QC, and reporting.

**Live:** [app.pailoshoes.com](https://app.pailoshoes.com)

## Tech Stack

| Layer      | Stack                                                              |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui   |
| Backend    | Python 3.13, FastAPI, SQLAlchemy 2 async, Pydantic v2              |
| Database   | PostgreSQL 18 (RDS in prod, Docker locally)                        |
| Infra      | AWS ECS Fargate, ALB, RDS, S3, Cognito, Terraform                  |
| CI/CD      | GitHub Actions (lint, test, build, deploy)                         |

## Repo Structure

```
apps/frontend/       Next.js factory cockpit UI
apps/backend/        FastAPI backend (modular monolith)
packages/api-client/ Generated TypeScript API client from OpenAPI
infra/terraform/     AWS infrastructure as code
docs/                Planning and design documents
```

## Local Development

Prerequisites: Node.js 20+, pnpm (via corepack), Python 3.13+, uv, Docker.

```powershell
# Install frontend dependencies
corepack pnpm install

# Start local PostgreSQL
corepack pnpm db:start

# Run database migrations
corepack pnpm db:migrate

# Start backend (http://localhost:8000)
corepack pnpm dev:backend

# Start frontend (http://localhost:3000 proxied, or :3001 direct)
corepack pnpm dev:frontend
```

### Useful Commands

```powershell
corepack pnpm generate:api        # Regenerate TypeScript API client from OpenAPI
corepack pnpm lint                 # Lint frontend
corepack pnpm lint:backend         # Lint backend (ruff)
corepack pnpm typecheck            # TypeScript type check
corepack pnpm typecheck:backend    # mypy type check
corepack pnpm build:frontend       # Production build
corepack pnpm test:backend         # Run pytest
corepack pnpm db:check             # Verify migrations are current
corepack pnpm db:revision          # Generate a new Alembic migration
```

### Docker Compose (full stack)

```powershell
docker compose up --build
```

Frontend at `http://localhost:3000`, backend at `http://localhost:8000`.

## Infrastructure

Terraform configs in [infra/terraform/](infra/terraform/). Default region: `ap-south-1` (Mumbai, for Nepal latency).

```powershell
cd infra/terraform
copy terraform.tfvars.example terraform.tfvars   # fill in values
terraform init
terraform plan
terraform apply
```

See [infra/terraform/README.md](infra/terraform/README.md) for details.

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

- **ci.yml** — lint, typecheck, test on push/PR
- **deploy.yml** — build and deploy containers to ECS
- **terraform.yml** — plan/apply infrastructure changes

## Documentation

Planning docs in [docs/](docs/). See [docs/README.md](docs/README.md) for the full map. Key docs:

- [Product Plan](docs/01-product-plan.md) — vision, roles, modules
- [MVP Scope](docs/14-mvp-scope.md) — current build target
- [Technical Overview](docs/07-technical-implementation-overview.md) — architecture decisions
- [MVP Build Plan](docs/15-mvp-build-plan.md) — implementation phases
