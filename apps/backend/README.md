# Pailo Backend

FastAPI backend for Pailo's factory operating system.

Current increment exposes representative API endpoints backed by sample data while the PostgreSQL schema and migration foundation are added underneath it.

## Commands

```powershell
uv run --project apps/backend uvicorn app.main:app --app-dir apps/backend --reload --host 0.0.0.0 --port 8000
uv run --project apps/backend pytest
docker compose up -d --wait db
uv run --project apps/backend alembic -c apps/backend/alembic.ini upgrade head
uv run --project apps/backend alembic -c apps/backend/alembic.ini check
```

Local database URL used by Docker Compose:

```text
postgresql+asyncpg://pailo:pailo@127.0.0.1:55432/pailo
```

In production, Terraform provides `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, and the `DATABASE_PASSWORD` secret. The backend builds the async SQLAlchemy URL from those values unless `DATABASE_URL` is explicitly set.

If `DATABASE_URL` is set locally, it also overrides the `55432` default.
