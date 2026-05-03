"""add site_settings table

Revision ID: c3a1f7b2e456
Revises: 97e55c766e03
Create Date: 2026-05-02 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c3a1f7b2e456"
down_revision = "f4f0a8c9d123"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(120), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", name="uq_site_settings_key"),
    )

    # Seed the contact phone setting
    op.execute(
        """
        INSERT INTO site_settings (id, key, value, description)
        VALUES (
            gen_random_uuid(),
            'contact_phone',
            '9852030953',
            'Primary contact phone number displayed on the landing page'
        )
        """
    )


def downgrade() -> None:
    op.drop_table("site_settings")
