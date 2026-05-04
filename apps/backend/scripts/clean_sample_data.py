"""Clean all sample/demo data from the database.

Usage (from repo root):
    uv run --project apps/backend python -m scripts.clean_sample_data

Or connect directly:
    DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/pailo \
    uv run --project apps/backend python -m scripts.clean_sample_data

This preserves the schema, roles table, boards, and sequences.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Allow running from scripts/ or repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings

# Tables to truncate, in dependency-safe order (children first)
TABLES_TO_CLEAN = [
    "label_print_jobs",
    "label_templates",
    "quality_defects",
    "quality_inspections",
    "task_comments",
    "task_status_updates",
    "tasks",
    "inventory_movements",
    "inventory_stock",
    "work_order_size_lines",
    "work_orders",
    "bom_items",
    "bom_versions",
    "materials",
    "product_variants",
    "product_styles",
    "suppliers",
    "saved_labels",
    "partner_inquiries",
    "users",
    "employees",
]


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.sqlalchemy_database_url, echo=False)

    async with engine.begin() as conn:
        for table in TABLES_TO_CLEAN:
            result = await conn.execute(text(f"DELETE FROM {table}"))  # noqa: S608
            print(f"  {table}: deleted {result.rowcount} rows")

    print("\nAll sample data removed. Schema and lookup tables (roles, boards) preserved.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
