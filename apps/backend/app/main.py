from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.modules.factory.service import FactoryServiceError


def create_app() -> FastAPI:
    app = FastAPI(
        title="Pailo Factory API",
        version="0.1.0",
        description="Factory operations API for tasks, work orders, inventory, QC, and owner insights.",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    settings = get_settings()
    cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    if settings.app_domain:
        cors_origins.append(f"https://{settings.app_domain}")
    if settings.cors_origins:
        cors_origins.extend(settings.cors_origins.split(","))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "pailo-backend"}

    @app.exception_handler(FactoryServiceError)
    async def factory_service_error(
        request: Request,
        exc: FactoryServiceError,
    ) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
