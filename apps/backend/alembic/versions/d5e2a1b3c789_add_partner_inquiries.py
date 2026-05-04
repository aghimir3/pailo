"""add partner_inquiries table

Revision ID: d5e2a1b3c789
Revises: c3a1f7b2e456
Create Date: 2026-05-04 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d5e2a1b3c789"
down_revision = "c3a1f7b2e456"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "partner_inquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("business_name", sa.String(200), nullable=True),
        sa.Column("phone", sa.String(40), nullable=False),
        sa.Column("email", sa.String(256), nullable=True),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column(
            "partner_type",
            sa.String(40),
            nullable=False,
            server_default="retail",
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(24),
            nullable=False,
            server_default="new",
        ),
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
        sa.CheckConstraint(
            "partner_type in ('retail', 'supermarket', 'direct', 'wholesale', 'other')",
            name="partner_inquiry_type",
        ),
        sa.CheckConstraint(
            "status in ('new', 'contacted', 'converted', 'declined')",
            name="partner_inquiry_status",
        ),
    )
    op.create_index(
        "ix_partner_inquiries_status_created",
        "partner_inquiries",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_partner_inquiries_status_created", table_name="partner_inquiries")
    op.drop_table("partner_inquiries")
