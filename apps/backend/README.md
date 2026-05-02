# Pailo Backend

FastAPI backend for Pailo's factory operating system.

Current increment exposes representative API endpoints backed by sample data so the frontend cockpit can be developed before PostgreSQL and generated clients are introduced.

## Commands

```powershell
uv run --project apps/backend uvicorn app.main:app --app-dir apps/backend --reload --host 0.0.0.0 --port 8000
uv run --project apps/backend pytest
```
