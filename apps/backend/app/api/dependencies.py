from typing import Annotated
from uuid import UUID

import hmac
import jwt
import structlog
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_cognito_token
from app.core.config import get_settings
from app.db.session import get_db_session
from app.modules.factory.service import UserContext, resolve_current_user

logger = structlog.get_logger()

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_current_user(
    session: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    x_pailo_user_id: Annotated[UUID | None, Header(alias="X-Pailo-User-Id")] = None,
    x_pailo_user_email: Annotated[str | None, Header(alias="X-Pailo-User-Email")] = None,
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> UserContext:
    settings = get_settings()

    # Internal service token for SSR calls within ECS task (timing-safe comparison)
    if (
        x_internal_token
        and settings.internal_service_token
        and hmac.compare_digest(x_internal_token, settings.internal_service_token)
    ):
        return await resolve_current_user(session, user_email=settings.initial_owner_admin_email or None)

    # Production: verify JWT from Authorization header
    if settings.auth_mode == "cognito":
        if not settings.cognito_user_pool_id:
            logger.error("cognito_not_configured", auth_mode="cognito")
            raise HTTPException(status_code=503, detail="Authentication service not configured")

        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

        token = authorization[7:]  # Strip "Bearer "
        try:
            claims = verify_cognito_token(token)
        except jwt.exceptions.PyJWTError as e:
            logger.warning("jwt_verification_failed", error=str(e))
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        try:
            return await resolve_current_user(
                session,
                cognito_sub=claims.sub,
                user_email=claims.email,
            )
        except Exception as e:
            logger.warning("resolve_user_failed", error=str(e), sub=claims.sub, email=claims.email)
            raise HTTPException(status_code=401, detail="User not found or inactive")

    # Dev mode: use header-based auth (for local development only)
    if settings.auth_mode != "dev":
        raise HTTPException(status_code=401, detail="Authentication required")
    return await resolve_current_user(session, x_pailo_user_id, x_pailo_user_email)


CurrentUser = Annotated[UserContext, Depends(get_current_user)]