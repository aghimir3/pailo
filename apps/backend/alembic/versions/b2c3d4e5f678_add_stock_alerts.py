"""add stock_alerts table

Revision ID: b2c3d4e5f678
Revises: a1b2c3d4e5f6
Create Date: 2026-05-10 12:00:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f678"
down_revision: str = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_alerts",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("alert_type", sa.String(32), nullable=False),
        sa.Column("current_stock", sa.Numeric(14, 3), nullable=False),
        sa.Column("threshold", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit", sa.String(32), nullable=False),
        sa.Column("days_remaining", sa.Numeric(8, 1), nullable=True),
        sa.Column("daily_consumption_rate", sa.Numeric(14, 3), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_by_user_id", sa.UUID(), nullable=True),
        sa.Column("po_reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["acknowledged_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "alert_type in ('below_reorder', 'below_minimum', 'stockout_imminent', 'stockout')",
            name="ck_stock_alerts_type",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_stock_alerts_material_acknowledged",
        "stock_alerts",
        ["material_id", "acknowledged"],
    )
    op.create_index(
        "ix_stock_alerts_created_at",
        "stock_alerts",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_stock_alerts_created_at", table_name="stock_alerts")
    op.drop_index("ix_stock_alerts_material_acknowledged", table_name="stock_alerts")
    op.drop_table("stock_alerts")
