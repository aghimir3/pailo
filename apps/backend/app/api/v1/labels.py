from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DbSession
from app.modules.factory import service
from app.modules.factory.schemas import (
    LabelPreviewRequest,
    LabelPreviewResponse,
    LabelPrintJobCreateRequest,
    LabelPrintJobRecord,
    LabelTemplateRecord,
    SavedLabelCreateRequest,
    SavedLabelDuplicateRequest,
    SavedLabelPatchRequest,
    SavedLabelPreviewRequest,
    SavedLabelRecord,
)

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


@router.get("/saved", response_model=list[SavedLabelRecord])
async def list_saved_labels(
    session: DbSession,
    include_archived: bool = False,
) -> list[SavedLabelRecord]:
    return await service.list_saved_labels(session, include_archived)


@router.post("/saved", response_model=SavedLabelRecord, status_code=status.HTTP_201_CREATED)
async def create_saved_label(
    payload: SavedLabelCreateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> SavedLabelRecord:
    saved_label = await service.create_saved_label(session, payload, current_user)
    await session.commit()
    return saved_label


@router.get("/saved/{saved_label_id}", response_model=SavedLabelRecord)
async def get_saved_label(saved_label_id: UUID, session: DbSession) -> SavedLabelRecord:
    return await service.get_saved_label(session, saved_label_id)


@router.patch("/saved/{saved_label_id}", response_model=SavedLabelRecord)
async def patch_saved_label(
    saved_label_id: UUID,
    payload: SavedLabelPatchRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> SavedLabelRecord:
    saved_label = await service.patch_saved_label(session, saved_label_id, payload, current_user)
    await session.commit()
    return saved_label


@router.delete("/saved/{saved_label_id}", response_model=SavedLabelRecord)
async def archive_saved_label(
    saved_label_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
    version: int = Query(ge=1),
) -> SavedLabelRecord:
    saved_label = await service.archive_saved_label(session, saved_label_id, version, current_user)
    await session.commit()
    return saved_label


@router.post("/saved/{saved_label_id}/duplicate", response_model=SavedLabelRecord, status_code=status.HTTP_201_CREATED)
async def duplicate_saved_label(
    saved_label_id: UUID,
    payload: SavedLabelDuplicateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> SavedLabelRecord:
    saved_label = await service.duplicate_saved_label(session, saved_label_id, payload, current_user)
    await session.commit()
    return saved_label


@router.post("/saved/{saved_label_id}/preview", response_model=LabelPreviewResponse)
async def preview_saved_label(
    saved_label_id: UUID,
    payload: SavedLabelPreviewRequest,
    session: DbSession,
) -> LabelPreviewResponse:
    return await service.preview_saved_label(session, saved_label_id, payload)


@router.get("/print-jobs", response_model=list[LabelPrintJobRecord])
async def list_label_print_jobs(
    session: DbSession,
    saved_label_id: UUID | None = None,
) -> list[LabelPrintJobRecord]:
    return await service.list_label_print_jobs(session, saved_label_id)


@router.post("/saved/{saved_label_id}/print-jobs", response_model=LabelPrintJobRecord, status_code=status.HTTP_201_CREATED)
async def create_label_print_job(
    saved_label_id: UUID,
    payload: LabelPrintJobCreateRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> LabelPrintJobRecord:
    print_job = await service.create_label_print_job(session, saved_label_id, payload, current_user)
    await session.commit()
    return print_job