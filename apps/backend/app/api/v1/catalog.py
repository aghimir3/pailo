"""Catalog API — manages shoe catalog items displayed on the public landing page."""

import json
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import SiteSetting

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads" / "catalog"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class CatalogItem(BaseModel):
    id: str
    image_filename: str
    caption: str = ""
    alt_text: str = ""
    price: str = ""


class CatalogItemUpdate(BaseModel):
    caption: str | None = None
    alt_text: str | None = None
    price: str | None = None


class CatalogListResponse(BaseModel):
    items: list[CatalogItem]


# --- Helpers ---


async def _load_catalog(session: DbSession) -> list[dict[str, Any]]:
    result = await session.execute(
        select(SiteSetting).where(SiteSetting.key == "catalog_items")
    )
    setting = result.scalar_one_or_none()
    if setting is None:
        return []
    try:
        return json.loads(setting.value)  # type: ignore[no-any-return]
    except (json.JSONDecodeError, TypeError):
        return []


async def _save_catalog(session: DbSession, items: list[dict[str, Any]]) -> None:
    result = await session.execute(
        select(SiteSetting).where(SiteSetting.key == "catalog_items")
    )
    setting = result.scalar_one_or_none()
    json_value = json.dumps(items, ensure_ascii=False)
    if setting is None:
        setting = SiteSetting(
            key="catalog_items",
            value=json_value,
            description="Shoe catalog items for the public landing page",
        )
        session.add(setting)
    else:
        setting.value = json_value
    await session.commit()


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    return ext


# --- Endpoints ---


@router.get("", response_model=CatalogListResponse)
async def list_catalog(session: DbSession) -> CatalogListResponse:
    """Public - returns all catalog items."""
    items = await _load_catalog(session)
    return CatalogListResponse(items=[CatalogItem(**item) for item in items])


@router.post("", response_model=CatalogItem, status_code=201)
async def create_catalog_item(
    session: DbSession,
    user: CurrentUser,
    image: UploadFile,
    caption: str = "",
    alt_text: str = "",
    price: str = "",
) -> CatalogItem:
    """Upload a new catalog item with image. Requires auth."""
    if not image.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = _validate_extension(image.filename)

    # Read and validate size
    content = await image.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Save file
    item_id = str(uuid.uuid4())[:8]
    filename = f"{item_id}{ext}"
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)

    # Save metadata
    items = await _load_catalog(session)
    new_item = CatalogItem(
        id=item_id,
        image_filename=filename,
        caption=caption,
        alt_text=alt_text,
        price=price,
    )
    items.append(new_item.model_dump())
    await _save_catalog(session, items)

    return new_item


@router.put("/{item_id}", response_model=CatalogItem)
async def update_catalog_item(
    item_id: str,
    body: CatalogItemUpdate,
    session: DbSession,
    user: CurrentUser,
) -> CatalogItem:
    """Update caption, alt_text, or price for a catalog item. Requires auth."""
    items = await _load_catalog(session)
    for i, item in enumerate(items):
        if item["id"] == item_id:
            if body.caption is not None:
                items[i]["caption"] = body.caption
            if body.alt_text is not None:
                items[i]["alt_text"] = body.alt_text
            if body.price is not None:
                items[i]["price"] = body.price
            await _save_catalog(session, items)
            return CatalogItem(**items[i])

    raise HTTPException(status_code=404, detail="Catalog item not found")


@router.put("/{item_id}/image", response_model=CatalogItem)
async def update_catalog_image(
    item_id: str,
    image: UploadFile,
    session: DbSession,
    user: CurrentUser,
) -> CatalogItem:
    """Replace the image for a catalog item. Requires auth."""
    if not image.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = _validate_extension(image.filename)
    content = await image.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    items = await _load_catalog(session)
    for i, item in enumerate(items):
        if item["id"] == item_id:
            # Remove old file
            old_path = UPLOAD_DIR / item["image_filename"]
            if old_path.exists():
                old_path.unlink()
            # Save new file
            filename = f"{item_id}{ext}"
            (UPLOAD_DIR / filename).write_bytes(content)
            items[i]["image_filename"] = filename
            await _save_catalog(session, items)
            return CatalogItem(**items[i])

    raise HTTPException(status_code=404, detail="Catalog item not found")


@router.delete("/{item_id}", status_code=204)
async def delete_catalog_item(
    item_id: str,
    session: DbSession,
    user: CurrentUser,
) -> None:
    """Delete a catalog item and its image. Requires auth."""
    items = await _load_catalog(session)
    for i, item in enumerate(items):
        if item["id"] == item_id:
            # Remove image file
            file_path = UPLOAD_DIR / item["image_filename"]
            if file_path.exists():
                file_path.unlink()
            items.pop(i)
            await _save_catalog(session, items)
            return

    raise HTTPException(status_code=404, detail="Catalog item not found")


@router.get("/images/{filename}")
async def serve_catalog_image(filename: str) -> FileResponse:
    """Public - serve a catalog image file."""
    # Sanitize: only allow simple filenames (no path traversal)
    safe_name = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
