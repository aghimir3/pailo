from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.factory import service
from app.modules.factory.schemas import LabelPreviewRequest, LabelPreviewResponse, LabelTemplateRecord

router = APIRouter()


@router.get("/templates", response_model=list[LabelTemplateRecord])
async def list_label_templates(session: DbSession) -> list[LabelTemplateRecord]:
    return await service.list_label_templates(session)


@router.post("/templates/{template_id}/preview", response_model=LabelPreviewResponse)
async def preview_label_sheet(
    template_id: UUID,
    payload: LabelPreviewRequest,
    session: DbSession,
) -> LabelPreviewResponse:
    return await service.preview_label_sheet(session, template_id, payload)