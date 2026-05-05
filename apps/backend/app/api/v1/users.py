"""User management API endpoints for Pailo."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import Role, User
from app.modules.factory.service import MANAGER_ROLES


router = APIRouter()


class UserRecord(BaseModel):
    id: str
    email: str | None
    phone: str | None = None
    display_name: str
    role_name: str
    role_id: str
    status: str
    invite_status: str
    cognito_sub: str | None
    employee_id: str | None = None
    last_login_at: str | None


class RoleRecord(BaseModel):
    id: str
    name: str
    description: str | None


class UserCreateRequest(BaseModel):
    email: EmailStr
    display_name: str
    role_id: str


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    role_id: str | None = None
    status: str | None = None
    phone: str | None = None
    employee_id: str | None = None


class MeResponse(BaseModel):
    id: str
    email: str | None
    display_name: str
    role: str
    permissions: list[str]


@router.get("/me", response_model=MeResponse)
async def get_me(session: DbSession, user: CurrentUser) -> MeResponse:
    """Get the current authenticated user's profile and permissions."""
    from app.db.models import Permission, RolePermission

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


@router.get("/roles", response_model=list[RoleRecord])
async def list_roles(session: DbSession, user: CurrentUser) -> list[RoleRecord]:
    """List all available roles. Only owner_admin can manage users."""
    if user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    roles = list((await session.scalars(select(Role).order_by(Role.name))).all())
    return [
        RoleRecord(id=str(r.id), name=r.name, description=r.description)
        for r in roles
    ]


@router.get("", response_model=list[UserRecord])
async def list_users(session: DbSession, user: CurrentUser) -> list[UserRecord]:
    """List all users. Only owner_admin and factory_manager can view."""
    if user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = select(User, Role.name).join(Role, User.role_id == Role.id).order_by(User.display_name)
    rows = (await session.execute(query)).all()

    return [
        UserRecord(
            id=str(u.id),
            email=u.email,
            phone=u.phone,
            display_name=u.display_name,
            role_name=role_name,
            role_id=str(u.role_id),
            status=u.status,
            invite_status=u.invite_status,
            cognito_sub=u.cognito_sub,
            employee_id=str(u.employee_id) if u.employee_id else None,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        )
        for u, role_name in rows
    ]


@router.post("", response_model=UserRecord, status_code=201)
async def create_user(
    payload: UserCreateRequest,
    session: DbSession,
    user: CurrentUser,
) -> UserRecord:
    """Create a new user (admin invite). Only owner_admin can create users."""
    if user.role != "owner_admin":
        raise HTTPException(status_code=403, detail="Only owner_admin can create users")

    # Verify role exists
    role = await session.get(Role, UUID(payload.role_id))
    if role is None:
        raise HTTPException(status_code=400, detail="Invalid role_id")

    # Check email uniqueness
    existing = (
        await session.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    from datetime import UTC, datetime

    from app.core.cognito import CognitoError, admin_create_user as cognito_create

    # Create the user in Cognito first (sends invite email with temp password)
    try:
        cognito_sub = cognito_create(email=payload.email, display_name=payload.display_name)
    except CognitoError as e:
        if e.code == "UsernameExistsException":
            raise HTTPException(
                status_code=409, detail="This email already has a Cognito account"
            ) from e
        raise HTTPException(
            status_code=502, detail=f"Failed to create user in identity provider: {e.message}"
        ) from e

    new_user = User(
        email=payload.email,
        display_name=payload.display_name,
        role_id=UUID(payload.role_id),
        invite_status="invited",
        status="active",
        invited_at=datetime.now(UTC),
        invited_by_user_id=user.id,
        cognito_sub=cognito_sub or None,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    return UserRecord(
        id=str(new_user.id),
        email=new_user.email,
        phone=new_user.phone,
        display_name=new_user.display_name,
        role_name=role.name,
        role_id=str(new_user.role_id),
        status=new_user.status,
        invite_status=new_user.invite_status,
        cognito_sub=new_user.cognito_sub,
        employee_id=str(new_user.employee_id) if new_user.employee_id else None,
        last_login_at=None,
    )


@router.patch("/{user_id}", response_model=UserRecord)
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    session: DbSession,
    user: CurrentUser,
) -> UserRecord:
    """Update a user's role, status, or display name. Only owner_admin."""
    if user.role != "owner_admin":
        raise HTTPException(status_code=403, detail="Only owner_admin can update users")

    target = await session.get(User, UUID(user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.display_name is not None:
        target.display_name = payload.display_name
    if payload.role_id is not None:
        role = await session.get(Role, UUID(payload.role_id))
        if role is None:
            raise HTTPException(status_code=400, detail="Invalid role_id")
        target.role_id = UUID(payload.role_id)
    if payload.status is not None:
        if payload.status not in ("active", "disabled"):
            raise HTTPException(status_code=400, detail="Status must be 'active' or 'disabled'")

        # Sync status change with Cognito
        if payload.status != target.status and target.email:
            from app.core.cognito import CognitoError, admin_disable_user, admin_enable_user

            try:
                if payload.status == "disabled":
                    admin_disable_user(target.email)
                else:
                    admin_enable_user(target.email)
            except CognitoError as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to update user in identity provider: {e.message}",
                ) from e

        target.status = payload.status

    if "phone" in payload.model_fields_set:
        target.phone = payload.phone.strip() if payload.phone else None
    if "employee_id" in payload.model_fields_set:
        target.employee_id = UUID(payload.employee_id) if payload.employee_id else None

    await session.commit()
    await session.refresh(target)

    role = await session.get(Role, target.role_id)

    return UserRecord(
        id=str(target.id),
        email=target.email,
        phone=target.phone,
        display_name=target.display_name,
        role_name=role.name if role else "unknown",
        role_id=str(target.role_id),
        status=target.status,
        invite_status=target.invite_status,
        cognito_sub=target.cognito_sub,
        employee_id=str(target.employee_id) if target.employee_id else None,
        last_login_at=target.last_login_at.isoformat() if target.last_login_at else None,
    )


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    session: DbSession,
    user: CurrentUser,
) -> None:
    """Delete a user. Only owner_admin can delete users. Cannot delete yourself."""
    if user.role != "owner_admin":
        raise HTTPException(status_code=403, detail="Only owner_admin can delete users")

    target = await session.get(User, UUID(user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Remove from Cognito if the user has a linked Cognito account
    if target.email and target.cognito_sub:
        from app.core.cognito import CognitoError, admin_delete_user

        try:
            admin_delete_user(target.email)
        except CognitoError as e:
            # If user doesn't exist in Cognito, proceed with DB deletion
            if e.code != "UserNotFoundException":
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to delete user from identity provider: {e.message}",
                ) from e

    await session.delete(target)
    await session.commit()
