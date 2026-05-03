"""add saved labels

Revision ID: f4f0a8c9d123
Revises: 6c1b2a9f4d7e
Create Date: 2026-05-02 23:55:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "f4f0a8c9d123"
down_revision: str | None = "6c1b2a9f4d7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_labels",
        sa.Column("label_code", sa.String(length=48), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("template_id", sa.UUID(), nullable=False),
        sa.Column("template_version", sa.Integer(), nullable=False),
        sa.Column("product_style_id", sa.UUID(), nullable=True),
        sa.Column("art_no", sa.String(length=80), nullable=False),
        sa.Column("colour", sa.String(length=80), nullable=False),
        sa.Column("size", sa.String(length=24), nullable=False),
        sa.Column("mrp_npr", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("manufactured_by", sa.String(length=160), nullable=False),
        sa.Column("origin_text", sa.String(length=80), nullable=False),
        sa.Column("default_quantity", sa.Integer(), server_default="24", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("default_quantity > 0", name=op.f("ck_saved_labels_saved_label_default_quantity_positive")),
        sa.CheckConstraint("status in ('active', 'archived')", name=op.f("ck_saved_labels_saved_label_status")),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_saved_labels_created_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["product_style_id"],
            ["product_styles.id"],
            name=op.f("fk_saved_labels_product_style_id_product_styles"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["label_templates.id"],
            name=op.f("fk_saved_labels_template_id_label_templates"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
            name=op.f("fk_saved_labels_updated_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_saved_labels")),
        sa.UniqueConstraint("label_code", name=op.f("uq_saved_labels_label_code")),
    )
    op.create_index("ix_saved_labels_status_updated", "saved_labels", ["status", "updated_at"], unique=False)
    op.create_index("ix_saved_labels_template_status", "saved_labels", ["template_id", "status"], unique=False)
    op.add_column("label_print_jobs", sa.Column("saved_label_id", sa.UUID(), nullable=True))
    op.add_column(
        "label_print_jobs",
        sa.Column("template_version", sa.Integer(), server_default="1", nullable=False),
    )
    op.create_foreign_key(
        op.f("fk_label_print_jobs_saved_label_id_saved_labels"),
        "label_print_jobs",
        "saved_labels",
        ["saved_label_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_label_print_jobs_saved_label_id", "label_print_jobs", ["saved_label_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_label_print_jobs_saved_label_id", table_name="label_print_jobs")
    op.drop_constraint(op.f("fk_label_print_jobs_saved_label_id_saved_labels"), "label_print_jobs", type_="foreignkey")
    op.drop_column("label_print_jobs", "template_version")
    op.drop_column("label_print_jobs", "saved_label_id")
    op.drop_index("ix_saved_labels_template_status", table_name="saved_labels")
    op.drop_index("ix_saved_labels_status_updated", table_name="saved_labels")
    op.drop_table("saved_labels")