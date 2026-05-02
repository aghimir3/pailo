from app.core.config import Settings
from app.db import models  # noqa: F401
from app.db.base import Base


def test_settings_uses_database_url_override() -> None:
    settings = Settings(database_url="postgresql+asyncpg://user:pass@example.com:5432/app")

    assert settings.sqlalchemy_database_url == "postgresql+asyncpg://user:pass@example.com:5432/app"


def test_settings_builds_sqlalchemy_url_from_database_parts() -> None:
    settings = Settings(
        database_url=None,
        database_host="db.internal",
        database_port=5432,
        database_name="pailo",
        database_username="pailo user",
        database_password="secret/pass",
    )

    assert settings.sqlalchemy_database_url == (
        "postgresql+asyncpg://pailo+user:secret%2Fpass@db.internal:5432/pailo"
    )


def test_mvp_schema_metadata_includes_core_tables() -> None:
    expected_tables = {
        "users",
        "roles",
        "employees",
        "product_styles",
        "product_variants",
        "materials",
        "inventory_stock",
        "inventory_movements",
        "work_orders",
        "tasks",
        "task_status_updates",
        "quality_inspections",
        "label_templates",
        "label_print_jobs",
        "audit_logs",
    }

    assert expected_tables.issubset(Base.metadata.tables)
