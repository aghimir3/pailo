"""add extended columns for styles suppliers bom workorders

Revision ID: d4a2e8f1c789
Revises: c3a1f7b2e456
Create Date: 2025-01-15 12:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4a2e8f1c789"
down_revision: Union[str, None] = "c3a1f7b2e456"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ProductStyle: add version, description, size_range
    op.add_column("product_styles", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("product_styles", sa.Column("size_range", sa.String(120), nullable=True))
    op.add_column("product_styles", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))

    # Supplier: add payment_terms, version
    op.add_column("suppliers", sa.Column("payment_terms", sa.String(120), nullable=True))
    op.add_column("suppliers", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))

    # BomVersion: add notes
    op.add_column("bom_versions", sa.Column("notes", sa.Text(), nullable=True))

    # WorkOrder: add notes
    op.add_column("work_orders", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("work_orders", "notes")
    op.drop_column("bom_versions", "notes")
    op.drop_column("suppliers", "version")
    op.drop_column("suppliers", "payment_terms")
    op.drop_column("product_styles", "version")
    op.drop_column("product_styles", "size_range")
    op.drop_column("product_styles", "description")
