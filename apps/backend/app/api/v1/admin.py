from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service_extended as svc

router = APIRouter()


@router.get("/audit-logs")
async def list_audit_logs(
    session: DbSession,
    current_user: CurrentUser,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[dict[str, object]]:
    return await svc.list_audit_logs(session, entity_type, entity_id, page, page_size)
