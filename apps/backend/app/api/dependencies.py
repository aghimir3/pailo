from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.modules.factory.service import UserContext, resolve_current_user


DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_current_user(
    session: DbSession,
    x_pailo_user_id: Annotated[UUID | None, Header(alias="X-Pailo-User-Id")] = None,
    x_pailo_user_email: Annotated[str | None, Header(alias="X-Pailo-User-Email")] = None,
) -> UserContext:
    return await resolve_current_user(session, x_pailo_user_id, x_pailo_user_email)


CurrentUser = Annotated[UserContext, Depends(get_current_user)]