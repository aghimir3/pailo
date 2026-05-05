"""ensure default label template exists

Revision ID: e7b3c1d2f456
Revises: d4a2e8f1c789, d5e2a1b3c789
Create Date: 2026-05-05 10:00:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e7b3c1d2f456"
down_revision: tuple[str, ...] = ("d4a2e8f1c789", "d5e2a1b3c789")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TEMPLATE_ID = "a0000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO label_templates (
                id, template_code, name, version, template_type, status,
                page_width_mm, page_height_mm, label_width_mm, label_height_mm,
                margin_top_mm, margin_left_mm, gap_x_mm, gap_y_mm,
                slots_per_page, columns, rows, fill_order,
                offset_x_mm, offset_y_mm, design_json, approved_at
            ) VALUES (
                'a0000000-0000-4000-8000-000000000001',
                'A4-24-LABEL', '24-up A4 label template', 1, 'product_label', 'approved',
                210, 297, 63.50, 33.87,
                13.09, 7.20, 2.54, 0.00,
                24, 3, 8, 'row_major',
                0, 0,
                '{"brand": "Pailo", "fields": ["Art No.", "Colour", "Size", "MRP", "Manufactured By", "Made in Nepal"], "source_reference": "sample Word label document rounded border shapes measured through Word COM on 2026-05-02", "measured_geometry_mm": {"page_width": 209.99, "page_height": 296.99, "word_page_margin_top": 13.05, "word_page_margin_left": 8.64, "border_left": 7.20, "border_top": 13.09, "text_table_left": 8.73, "text_table_top": 13.41, "text_table_inset_x": 1.53, "text_table_inset_y": 0.32, "label_width": 63.50, "label_height": 33.87, "horizontal_gutter": 2.54, "vertical_gutter": 0, "border_line_weight_pt": 0.25, "border_color": "#BFBFBF"}}'::jsonb,
                now()
            )
            ON CONFLICT (id) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    pass
