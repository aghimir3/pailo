"""Auth-related API endpoints for Pailo (token exchange, session info)."""

from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DbSession
from app.api.v1.users import MeResponse
from app.db.models import Permission, Role, RolePermission
from sqlalchemy import select


router = APIRouter()


@router.get("/session", response_model=MeResponse)
async def get_session(session: DbSession, user: CurrentUser) -> MeResponse:
    """Validate the current token and return user session info."""
    perms_query = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .where(Role.name == user.role)
    )
    perms = list((await session.scalars(perms_query)).all())

    return MeResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        permissions=perms,
    )
