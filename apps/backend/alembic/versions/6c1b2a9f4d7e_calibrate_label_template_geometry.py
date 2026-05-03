"""calibrate label template geometry

Revision ID: 6c1b2a9f4d7e
Revises: b8c2f4e8d901
Create Date: 2026-05-02 23:40:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "6c1b2a9f4d7e"
down_revision: str | None = "b8c2f4e8d901"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE label_templates
            SET template_code = 'A4-24-LABEL',
                name = '24-up A4 label template',
                label_height_mm = 33.87,
                margin_top_mm = 13.09,
                margin_left_mm = 7.20,
                gap_x_mm = 2.54,
                gap_y_mm = 0.00,
                design_json = COALESCE(design_json, '{}'::jsonb) || jsonb_build_object(
                    'source_reference', 'sample Word label document rounded border shapes measured through Word COM on 2026-05-02',
                    'measured_geometry_mm', jsonb_build_object(
                        'page_width', 209.99,
                        'page_height', 296.99,
                        'word_page_margin_top', 13.05,
                        'word_page_margin_left', 8.64,
                        'border_left', 7.20,
                        'border_top', 13.09,
                        'text_table_left', 8.73,
                        'text_table_top', 13.41,
                        'text_table_inset_x', 1.53,
                        'text_table_inset_y', 0.32,
                        'label_width', 63.50,
                        'label_height', 33.87,
                        'horizontal_gutter', 2.54,
                        'vertical_gutter', 0,
                        'border_line_weight_pt', 0.25,
                        'border_color', '#BFBFBF'
                    )
                )
            WHERE id = 'a0000000-0000-4000-8000-000000000001'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE label_print_jobs
            SET field_values = COALESCE(field_values, '{}'::jsonb) || jsonb_build_object('art_no', 'AFL 02')
            WHERE id = 'a1000000-0000-4000-8000-000000000001'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE label_templates
                SET label_height_mm = 33.90,
                margin_top_mm = 12.50,
                margin_left_mm = 7.25,
                gap_x_mm = 3.20,
                gap_y_mm = 1.60,
                design_json = COALESCE(design_json, '{}'::jsonb) - 'measured_geometry_mm'
                WHERE id = 'a0000000-0000-4000-8000-000000000001'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE label_print_jobs
            SET field_values = COALESCE(field_values, '{}'::jsonb) || jsonb_build_object('art_no', 'PAI-2026-SCH-001')
            WHERE id = 'a1000000-0000-4000-8000-000000000001'
            """
        )
    )