from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.api.router import api_router
from app.core.config import get_settings
from app.modules.factory.service import FactoryServiceError


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # HSTS handled by ALB/CloudFront in production
        if request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Pailo Factory API",
        version="0.1.0",
        description="Factory operations API for tasks, work orders, inventory, QC, and owner insights.",
        docs_url="/api/v1/docs" if settings.auth_mode == "dev" else None,
        redoc_url="/api/v1/redoc" if settings.auth_mode == "dev" else None,
        openapi_url="/api/v1/openapi.json",
    )

    cors_origins: list[str] = []
    if settings.auth_mode == "dev":
        cors_origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])
    if settings.app_domain:
        cors_origins.append(f"https://{settings.app_domain}")
    if settings.cors_origins:
        cors_origins.extend(settings.cors_origins.split(","))

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Internal-Token"],
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
