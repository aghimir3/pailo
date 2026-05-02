# pailo
Factory and operations platform for Pailo Shoes: production tasks, inventory, employees, suppliers, product gallery, labels, and reporting.

## Local Development

This repo is now scaffolded as a monorepo with a Next.js frontend and FastAPI backend.

```powershell
corepack pnpm install
corepack pnpm dev:frontend
uv run --project apps/backend uvicorn app.main:app --app-dir apps/backend --reload --host 0.0.0.0 --port 8000
```

Useful checks:

```powershell
corepack pnpm generate:api
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build:frontend
uv run --project apps/backend pytest
```

Docker run:

```powershell
docker compose up --build
```

Then open `http://localhost:3000`. The backend is available at `http://localhost:8000`.

Infrastructure lives in [infra/terraform](infra/terraform). The default AWS region is `ap-south-1` for Nepal latency.

```powershell
cd infra/terraform
copy terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

The current implementation slice includes a FastAPI dashboard API, generated OpenAPI TypeScript types, and a Next.js factory cockpit. The dashboard fetches the local backend when available and falls back to typed representative data for offline builds.
