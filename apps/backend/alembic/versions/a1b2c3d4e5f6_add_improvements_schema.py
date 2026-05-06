"""add high-impact improvements schema

Revision ID: a1b2c3d4e5f6
Revises: e7b3c1d2f456
Create Date: 2026-05-05 14:00:00.000000+00:00

Tables added:
- bom_versions, bom_items, material_price_history, work_order_cost_snapshots
- material_reservations
- purchase_orders, purchase_order_items, supplier_performance
- stage_time_logs
- worker_production_log, piece_rate_config
- customers, sales_orders, sales_order_items, dispatch_records, dispatch_items
- daily_production_plans, daily_plan_items
- cycle_counts, cycle_count_items, inventory_accuracy_log
- defect_analytics

Columns added:
- materials: reorder_point, reorder_quantity, lead_time_days
- quality_inspections: rework_work_order_id, rework_cost_npr, root_cause_category
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: str = "e7b3c1d2f456"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # NOTE: bom_versions and bom_items already exist from MVP migration.
    # The costing module uses the existing tables directly.

    # ── Material Price History ────────────────────────────────────────
    op.create_table(
        "material_price_history",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("supplier_id", sa.UUID(), nullable=True),
        sa.Column("price_per_unit", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="NPR", nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], name=op.f("fk_material_price_history_material_id_materials"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], name=op.f("fk_material_price_history_supplier_id_suppliers")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_material_price_history_created_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_material_price_history")),
    )
    op.create_index("ix_material_price_history_material_date", "material_price_history", ["material_id", "effective_from"])

    # ── Work Order Cost Snapshots ─────────────────────────────────────
    op.create_table(
        "work_order_cost_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("work_order_id", sa.UUID(), nullable=False),
        sa.Column("bom_version_id", sa.UUID(), nullable=False),
        sa.Column("estimated_material_cost_per_pair", sa.Numeric(12, 2), nullable=False),
        sa.Column("estimated_labor_cost_per_pair", sa.Numeric(12, 2), nullable=True),
        sa.Column("estimated_overhead_per_pair", sa.Numeric(12, 2), nullable=True),
        sa.Column("estimated_total_per_pair", sa.Numeric(12, 2), nullable=False),
        sa.Column("actual_material_cost_per_pair", sa.Numeric(12, 2), nullable=True),
        sa.Column("actual_labor_cost_per_pair", sa.Numeric(12, 2), nullable=True),
        sa.Column("actual_total_per_pair", sa.Numeric(12, 2), nullable=True),
        sa.Column("variance_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("snapshot_prices", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], name=op.f("fk_wo_cost_snapshots_work_order_id_work_orders"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["bom_version_id"], ["bom_versions.id"], name=op.f("fk_wo_cost_snapshots_bom_version_id_bom_versions")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_work_order_cost_snapshots")),
    )

    # ── Material Reservations ─────────────────────────────────────────
    op.create_table(
        "material_reservations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("work_order_id", sa.UUID(), nullable=False),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("quantity_reserved", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_issued", sa.Numeric(12, 3), server_default="0", nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), server_default="reserved", nullable=False),
        sa.Column("reserved_by", sa.UUID(), nullable=False),
        sa.Column("reserved_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status in ('reserved', 'partially_issued', 'fully_issued', 'cancelled')", name=op.f("ck_material_reservations_status")),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], name=op.f("fk_material_reservations_work_order_id_work_orders"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], name=op.f("fk_material_reservations_material_id_materials")),
        sa.ForeignKeyConstraint(["reserved_by"], ["users.id"], name=op.f("fk_material_reservations_reserved_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_material_reservations")),
    )
    op.create_index(
        "ix_material_reservations_material_active",
        "material_reservations",
        ["material_id", "status"],
        postgresql_where=sa.text("status IN ('reserved', 'partially_issued')"),
    )

    # ── Purchase Orders ───────────────────────────────────────────────
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("po_number", sa.String(20), nullable=False),
        sa.Column("supplier_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("order_date", sa.Date(), nullable=True),
        sa.Column("expected_delivery_date", sa.Date(), nullable=True),
        sa.Column("actual_delivery_date", sa.Date(), nullable=True),
        sa.Column("subtotal_npr", sa.Numeric(12, 2), nullable=True),
        sa.Column("tax_npr", sa.Numeric(12, 2), server_default="0", nullable=True),
        sa.Column("total_npr", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status in ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')",
            name=op.f("ck_purchase_orders_status"),
        ),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], name=op.f("fk_purchase_orders_supplier_id_suppliers")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_purchase_orders_created_by_users")),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], name=op.f("fk_purchase_orders_approved_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_orders")),
        sa.UniqueConstraint("po_number", name=op.f("uq_purchase_orders_po_number")),
    )
    op.create_index("ix_purchase_orders_status", "purchase_orders", ["status"])
    op.create_index("ix_purchase_orders_supplier", "purchase_orders", ["supplier_id"])

    # ── Purchase Order Items ──────────────────────────────────────────
    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("purchase_order_id", sa.UUID(), nullable=False),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("quantity_ordered", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_received", sa.Numeric(12, 3), server_default="0", nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("unit_price_npr", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_price_npr", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["purchase_order_id"], ["purchase_orders.id"], name=op.f("fk_po_items_purchase_order_id_purchase_orders"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], name=op.f("fk_po_items_material_id_materials")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_purchase_order_items")),
    )

    # ── Supplier Performance ──────────────────────────────────────────
    op.create_table(
        "supplier_performance",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("supplier_id", sa.UUID(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("total_orders", sa.Integer(), server_default="0", nullable=False),
        sa.Column("on_time_deliveries", sa.Integer(), server_default="0", nullable=False),
        sa.Column("on_time_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("avg_delivery_days", sa.Integer(), nullable=True),
        sa.Column("total_spend_npr", sa.Numeric(14, 2), nullable=True),
        sa.Column("quality_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("overall_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], name=op.f("fk_supplier_performance_supplier_id_suppliers")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_supplier_performance")),
        sa.UniqueConstraint("supplier_id", "period_start", "period_end", name=op.f("uq_supplier_performance_period")),
    )

    # ── Stage Time Logs ───────────────────────────────────────────────
    op.create_table(
        "stage_time_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("work_order_id", sa.UUID(), nullable=False),
        sa.Column("stage", sa.String(50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_pause_duration_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("worker_count", sa.Integer(), nullable=True),
        sa.Column("pairs_input", sa.Integer(), nullable=True),
        sa.Column("pairs_output", sa.Integer(), nullable=True),
        sa.Column("pairs_defect", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], name=op.f("fk_stage_time_logs_work_order_id_work_orders"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_stage_time_logs_created_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stage_time_logs")),
    )
    op.create_index("ix_stage_time_logs_wo", "stage_time_logs", ["work_order_id"])
    op.create_index("ix_stage_time_logs_stage_date", "stage_time_logs", ["stage", "started_at"])

    # ── Worker Production Log ─────────────────────────────────────────
    op.create_table(
        "worker_production_log",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("employee_id", sa.UUID(), nullable=False),
        sa.Column("production_date", sa.Date(), nullable=False),
        sa.Column("stage", sa.String(50), nullable=False),
        sa.Column("work_order_id", sa.UUID(), nullable=True),
        sa.Column("pairs_completed", sa.Integer(), nullable=False),
        sa.Column("hours_worked", sa.Numeric(4, 2), nullable=True),
        sa.Column("quality_pass_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], name=op.f("fk_worker_production_log_employee_id_employees")),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], name=op.f("fk_worker_production_log_work_order_id_work_orders")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_worker_production_log")),
    )
    op.create_index("ix_worker_prod_employee_date", "worker_production_log", ["employee_id", "production_date"])
    op.create_index("ix_worker_prod_date", "worker_production_log", ["production_date"])

    # ── Piece Rate Config ─────────────────────────────────────────────
    op.create_table(
        "piece_rate_config",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("stage", sa.String(50), nullable=False),
        sa.Column("style_category", sa.String(50), nullable=True),
        sa.Column("rate_per_pair", sa.Numeric(8, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_piece_rate_config_created_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_piece_rate_config")),
    )

    # ── Customers ─────────────────────────────────────────────────────
    op.create_table(
        "customers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("customer_code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(20), server_default="wholesale", nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("credit_limit_npr", sa.Numeric(12, 2), nullable=True),
        sa.Column("payment_terms_days", sa.Integer(), server_default="30", nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("type in ('wholesale', 'retail', 'agent')", name=op.f("ck_customers_type")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_customers")),
        sa.UniqueConstraint("customer_code", name=op.f("uq_customers_customer_code")),
    )

    # ── Sales Orders ──────────────────────────────────────────────────
    op.create_table(
        "sales_orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_number", sa.String(20), nullable=False),
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("order_date", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("requested_delivery_date", sa.Date(), nullable=True),
        sa.Column("promised_delivery_date", sa.Date(), nullable=True),
        sa.Column("actual_dispatch_date", sa.Date(), nullable=True),
        sa.Column("subtotal_npr", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_npr", sa.Numeric(12, 2), server_default="0", nullable=True),
        sa.Column("tax_npr", sa.Numeric(12, 2), server_default="0", nullable=True),
        sa.Column("total_npr", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status in ('pending', 'confirmed', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled')",
            name=op.f("ck_sales_orders_status"),
        ),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], name=op.f("fk_sales_orders_customer_id_customers")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_sales_orders_created_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sales_orders")),
        sa.UniqueConstraint("order_number", name=op.f("uq_sales_orders_order_number")),
    )
    op.create_index("ix_sales_orders_status", "sales_orders", ["status"])
    op.create_index("ix_sales_orders_customer", "sales_orders", ["customer_id"])

    # ── Sales Order Items ─────────────────────────────────────────────
    op.create_table(
        "sales_order_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("sales_order_id", sa.UUID(), nullable=False),
        sa.Column("style_id", sa.UUID(), nullable=False),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("size", sa.String(10), nullable=True),
        sa.Column("quantity_ordered", sa.Integer(), nullable=False),
        sa.Column("quantity_dispatched", sa.Integer(), server_default="0", nullable=False),
        sa.Column("unit_price_npr", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_price_npr", sa.Numeric(12, 2), nullable=False),
        sa.ForeignKeyConstraint(["sales_order_id"], ["sales_orders.id"], name=op.f("fk_so_items_sales_order_id_sales_orders"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["style_id"], ["product_styles.id"], name=op.f("fk_so_items_style_id_product_styles")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sales_order_items")),
    )

    # ── Dispatch Records ──────────────────────────────────────────────
    op.create_table(
        "dispatch_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dispatch_number", sa.String(20), nullable=False),
        sa.Column("sales_order_id", sa.UUID(), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("dispatched_by", sa.UUID(), nullable=False),
        sa.Column("transport_method", sa.String(50), nullable=True),
        sa.Column("tracking_number", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["sales_order_id"], ["sales_orders.id"], name=op.f("fk_dispatch_records_sales_order_id_sales_orders")),
        sa.ForeignKeyConstraint(["dispatched_by"], ["users.id"], name=op.f("fk_dispatch_records_dispatched_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_dispatch_records")),
        sa.UniqueConstraint("dispatch_number", name=op.f("uq_dispatch_records_dispatch_number")),
    )

    # ── Dispatch Items ────────────────────────────────────────────────
    op.create_table(
        "dispatch_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dispatch_id", sa.UUID(), nullable=False),
        sa.Column("sales_order_item_id", sa.UUID(), nullable=False),
        sa.Column("style_id", sa.UUID(), nullable=False),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("size", sa.String(10), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dispatch_id"], ["dispatch_records.id"], name=op.f("fk_dispatch_items_dispatch_id_dispatch_records"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sales_order_item_id"], ["sales_order_items.id"], name=op.f("fk_dispatch_items_so_item_id_sales_order_items")),
        sa.ForeignKeyConstraint(["style_id"], ["product_styles.id"], name=op.f("fk_dispatch_items_style_id_product_styles")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_dispatch_items")),
    )

    # ── Daily Production Plans ────────────────────────────────────────
    op.create_table(
        "daily_production_plans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("target_pairs", sa.Integer(), nullable=False),
        sa.Column("actual_pairs", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("confirmed_by", sa.UUID(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status in ('draft', 'confirmed', 'in_progress', 'completed')", name=op.f("ck_daily_production_plans_status")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_daily_plans_created_by_users")),
        sa.ForeignKeyConstraint(["confirmed_by"], ["users.id"], name=op.f("fk_daily_plans_confirmed_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_production_plans")),
        sa.UniqueConstraint("plan_date", name=op.f("uq_daily_production_plans_plan_date")),
    )

    # ── Daily Plan Items ──────────────────────────────────────────────
    op.create_table(
        "daily_plan_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("plan_id", sa.UUID(), nullable=False),
        sa.Column("work_order_id", sa.UUID(), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column("target_pairs", sa.Integer(), nullable=False),
        sa.Column("actual_pairs", sa.Integer(), server_default="0", nullable=False),
        sa.Column("materials_ready", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["daily_production_plans.id"], name=op.f("fk_daily_plan_items_plan_id_daily_production_plans"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], name=op.f("fk_daily_plan_items_work_order_id_work_orders")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_plan_items")),
    )

    # ── Cycle Counts ──────────────────────────────────────────────────
    op.create_table(
        "cycle_counts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("count_number", sa.String(20), nullable=False),
        sa.Column("count_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), server_default="in_progress", nullable=False),
        sa.Column("count_type", sa.String(20), nullable=False),
        sa.Column("category_filter", sa.String(50), nullable=True),
        sa.Column("counted_by", sa.UUID(), nullable=False),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_items_counted", sa.Integer(), server_default="0", nullable=False),
        sa.Column("discrepancies_found", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_variance_npr", sa.Numeric(12, 2), server_default="0", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status in ('in_progress', 'completed', 'approved')", name=op.f("ck_cycle_counts_status")),
        sa.CheckConstraint("count_type in ('full', 'category', 'abc_class_a', 'random_sample')", name=op.f("ck_cycle_counts_count_type")),
        sa.ForeignKeyConstraint(["counted_by"], ["users.id"], name=op.f("fk_cycle_counts_counted_by_users")),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], name=op.f("fk_cycle_counts_approved_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cycle_counts")),
        sa.UniqueConstraint("count_number", name=op.f("uq_cycle_counts_count_number")),
    )

    # ── Cycle Count Items ─────────────────────────────────────────────
    op.create_table(
        "cycle_count_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cycle_count_id", sa.UUID(), nullable=False),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("system_quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("counted_quantity", sa.Numeric(12, 3), nullable=True),
        sa.Column("unit_cost_npr", sa.Numeric(10, 2), nullable=True),
        sa.Column("adjustment_approved", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["cycle_count_id"], ["cycle_counts.id"], name=op.f("fk_cycle_count_items_cycle_count_id_cycle_counts"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], name=op.f("fk_cycle_count_items_material_id_materials")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cycle_count_items")),
    )

    # ── Inventory Accuracy Log ────────────────────────────────────────
    op.create_table(
        "inventory_accuracy_log",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("measured_date", sa.Date(), nullable=False),
        sa.Column("items_counted", sa.Integer(), nullable=False),
        sa.Column("items_accurate", sa.Integer(), nullable=False),
        sa.Column("accuracy_rate", sa.Numeric(5, 2), nullable=False),
        sa.Column("total_variance_npr", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inventory_accuracy_log")),
    )

    # ── Defect Analytics ──────────────────────────────────────────────
    op.create_table(
        "defect_analytics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("style_id", sa.UUID(), nullable=True),
        sa.Column("stage", sa.String(50), nullable=True),
        sa.Column("defect_type", sa.String(100), nullable=True),
        sa.Column("root_cause_category", sa.String(50), nullable=True),
        sa.Column("total_defects", sa.Integer(), nullable=False),
        sa.Column("total_rework_cost_npr", sa.Numeric(12, 2), nullable=True),
        sa.Column("avg_rework_time_hours", sa.Numeric(6, 2), nullable=True),
        sa.Column("supplier_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["style_id"], ["product_styles.id"], name=op.f("fk_defect_analytics_style_id_product_styles")),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], name=op.f("fk_defect_analytics_supplier_id_suppliers")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_defect_analytics")),
    )

    # ── Add columns to existing tables ────────────────────────────────
    op.add_column("materials", sa.Column("reorder_point", sa.Numeric(12, 3), nullable=True))
    op.add_column("materials", sa.Column("reorder_quantity", sa.Numeric(12, 3), nullable=True))
    op.add_column("materials", sa.Column("lead_time_days", sa.Integer(), server_default="7", nullable=True))

    op.add_column("quality_inspections", sa.Column("rework_work_order_id", sa.UUID(), nullable=True))
    op.add_column("quality_inspections", sa.Column("rework_cost_npr", sa.Numeric(12, 2), nullable=True))
    op.add_column("quality_inspections", sa.Column("root_cause_category", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("quality_inspections", "root_cause_category")
    op.drop_column("quality_inspections", "rework_cost_npr")
    op.drop_column("quality_inspections", "rework_work_order_id")
    op.drop_column("materials", "lead_time_days")
    op.drop_column("materials", "reorder_quantity")
    op.drop_column("materials", "reorder_point")

    op.drop_table("defect_analytics")
    op.drop_table("inventory_accuracy_log")
    op.drop_table("cycle_count_items")
    op.drop_table("cycle_counts")
    op.drop_table("daily_plan_items")
    op.drop_table("daily_production_plans")
    op.drop_table("dispatch_items")
    op.drop_table("dispatch_records")
    op.drop_table("sales_order_items")
    op.drop_table("sales_orders")
    op.drop_table("customers")
    op.drop_table("piece_rate_config")
    op.drop_table("worker_production_log")
    op.drop_table("stage_time_logs")
    op.drop_table("supplier_performance")
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
    op.drop_table("material_reservations")
    op.drop_table("work_order_cost_snapshots")
    op.drop_table("material_price_history")
