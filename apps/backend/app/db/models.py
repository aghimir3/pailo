from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)


class Permission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[UUID] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Employee(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("status in ('active', 'inactive', 'probation')", name="employee_status"),
        Index("ix_employees_status_department", "status", "department"),
    )

    employee_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(Text)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(160))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(40))
    department: Mapped[str | None] = mapped_column(String(80))
    job_title: Mapped[str | None] = mapped_column(String(120))
    wage_type: Mapped[str | None] = mapped_column(String(40))
    wage_rate_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    start_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default="active")
    notes: Mapped[str | None] = mapped_column(Text)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "invite_status in ('not_invited', 'invited', 'accepted', 'disabled')",
            name="user_invite_status",
        ),
        CheckConstraint("status in ('active', 'disabled')", name="user_status"),
        Index("ix_users_email", "email", unique=True, postgresql_where=text("email is not null")),
        Index(
            "ix_users_cognito_sub",
            "cognito_sub",
            unique=True,
            postgresql_where=text("cognito_sub is not null"),
        ),
    )

    cognito_sub: Mapped[str | None] = mapped_column(String(128))
    email: Mapped[str | None] = mapped_column(String(256))
    phone: Mapped[str | None] = mapped_column(String(40))
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    employee_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL")
    )
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    invite_status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="not_invited"
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default="active")
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invited_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    accepted_invite_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EmployeeSkill(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employee_skills"
    __table_args__ = (
        UniqueConstraint("employee_id", "skill", name="uq_employee_skills_employee_skill"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    skill: Mapped[str] = mapped_column(String(80), nullable=False)


class Supplier(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "suppliers"

    supplier_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(256))
    address: Mapped[str | None] = mapped_column(Text)
    material_categories: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    payment_terms: Mapped[str | None] = mapped_column(String(120))
    usual_lead_time_days: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class ProductStyle(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_styles"
    __table_args__ = (Index("ix_product_styles_category_status", "category", "sample_status"),)

    style_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    size_range: Mapped[str | None] = mapped_column(String(120))
    sample_status: Mapped[str] = mapped_column(String(40), nullable=False, server_default="draft")
    target_cost_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    target_mrp_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class ProductVariant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint(
            "product_style_id", "color", "size", name="uq_product_variants_style_color_size"
        ),
    )

    product_style_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_styles.id", ondelete="CASCADE"),
        nullable=False,
    )
    color: Mapped[str] = mapped_column(String(80), nullable=False)
    size: Mapped[str] = mapped_column(String(24), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(80), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class Material(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "materials"
    __table_args__ = (Index("ix_materials_category_active", "category", "active"),)

    material_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(32), nullable=False)
    supplier_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL")
    )
    minimum_stock: Mapped[Decimal] = mapped_column(
        Numeric(14, 3), nullable=False, server_default="0"
    )
    average_cost_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    last_purchase_cost_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    location: Mapped[str | None] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    reorder_point: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    reorder_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    lead_time_days: Mapped[int | None] = mapped_column(Integer, server_default="7")


class BomVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bom_versions"
    __table_args__ = (
        UniqueConstraint("product_style_id", "version", name="uq_bom_versions_style_version"),
    )

    product_style_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_styles.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="draft")
    notes: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class BomItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bom_items"

    bom_version_id: Mapped[UUID] = mapped_column(
        ForeignKey("bom_versions.id", ondelete="CASCADE"), nullable=False
    )
    material_id: Mapped[UUID] = mapped_column(
        ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False
    )
    quantity_per_pair: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    wastage_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, server_default="0"
    )
    cost_snapshot_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))


class WorkOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "work_orders"
    __table_args__ = (
        CheckConstraint("planned_pairs > 0", name="work_order_planned_pairs_positive"),
        CheckConstraint("completed_pairs >= 0", name="work_order_completed_pairs_non_negative"),
        Index("ix_work_orders_status_due_date", "status", "due_date"),
    )

    work_order_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    product_style_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_styles.id", ondelete="RESTRICT"), nullable=False
    )
    bom_version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("bom_versions.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, server_default="draft")
    priority: Mapped[str] = mapped_column(String(24), nullable=False, server_default="normal")
    planned_pairs: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_pairs: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    current_stage: Mapped[str | None] = mapped_column(String(80))
    due_date: Mapped[date | None] = mapped_column(Date)
    cost_snapshot_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class WorkOrderSizeLine(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "work_order_size_lines"
    __table_args__ = (
        CheckConstraint("planned_pairs > 0", name="work_order_size_line_planned_pairs_positive"),
        CheckConstraint(
            "completed_pairs >= 0", name="work_order_size_line_completed_pairs_non_negative"
        ),
        UniqueConstraint(
            "work_order_id", "color", "size", name="uq_work_order_size_lines_order_color_size"
        ),
    )

    work_order_id: Mapped[UUID] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    color: Mapped[str] = mapped_column(String(80), nullable=False)
    size: Mapped[str] = mapped_column(String(24), nullable=False)
    planned_pairs: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_pairs: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")


class InventoryStock(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory_stock"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="inventory_stock_non_negative"),
        CheckConstraint(
            "(material_id is not null and product_variant_id is null) "
            "or (material_id is null and product_variant_id is not null)",
            name="inventory_stock_exactly_one_item",
        ),
        Index("ix_inventory_stock_material_id", "material_id"),
        Index("ix_inventory_stock_product_variant_id", "product_variant_id"),
    )

    material_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("materials.id", ondelete="RESTRICT")
    )
    product_variant_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT")
    )
    stock_type: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False, server_default="0")
    unit_of_measure: Mapped[str] = mapped_column(String(32), nullable=False)
    location: Mapped[str | None] = mapped_column(String(120))
    qc_status: Mapped[str | None] = mapped_column(String(40))
    label_status: Mapped[str | None] = mapped_column(String(40))
    batch_no: Mapped[str | None] = mapped_column(String(80))


class InventoryMovement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (Index("ix_inventory_movements_created_at", "created_at"),)

    movement_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    stock_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_stock.id", ondelete="SET NULL")
    )
    material_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("materials.id", ondelete="RESTRICT")
    )
    product_variant_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT")
    )
    work_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("work_orders.id", ondelete="SET NULL")
    )
    movement_type: Mapped[str] = mapped_column(String(40), nullable=False)
    quantity_delta: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    performed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class TaskBoard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "task_boards"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    board_type: Mapped[str] = mapped_column(String(60), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class Task(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("completed_quantity >= 0", name="task_completed_quantity_non_negative"),
        Index("ix_tasks_status_due_at", "status", "due_at"),
        Index(
            "ix_tasks_assigned_employee_status_due", "assigned_to_employee_id", "status", "due_at"
        ),
        Index("ix_tasks_assigned_user_status_due", "assigned_to_user_id", "status", "due_at"),
        Index("ix_tasks_work_order_status", "work_order_id", "status"),
        Index("ix_tasks_board_status_priority", "board_id", "status", "priority"),
    )

    task_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    board_id: Mapped[UUID | None] = mapped_column(ForeignKey("task_boards.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(40), nullable=False, server_default="backlog")
    priority: Mapped[str] = mapped_column(String(24), nullable=False, server_default="normal")
    assigned_to_employee_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL")
    )
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    assigned_team: Mapped[str | None] = mapped_column(String(120))
    work_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("work_orders.id", ondelete="SET NULL")
    )
    product_style_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_styles.id", ondelete="SET NULL")
    )
    material_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("materials.id", ondelete="SET NULL")
    )
    supplier_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL")
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    completed_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 3), nullable=False, server_default="0"
    )
    unit_of_measure: Mapped[str | None] = mapped_column(String(32))
    blocked_reason: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    requires_review: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class TaskComment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "task_comments"
    __table_args__ = (
        CheckConstraint("length(btrim(comment_text)) > 0", name="task_comment_text_not_blank"),
        UniqueConstraint(
            "author_user_id",
            "client_message_id",
            name="uq_task_comments_author_client_message",
        ),
        Index("ix_task_comments_task_created", "task_id", "created_at"),
        Index("ix_task_comments_author_created", "author_user_id", "created_at"),
    )

    task_id: Mapped[UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    client_message_id: Mapped[str | None] = mapped_column(String(80))
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class TaskStatusUpdate(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "task_status_updates"
    __table_args__ = (Index("ix_task_status_updates_task_created", "task_id", "created_at"),)

    task_id: Mapped[UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    old_status: Mapped[str | None] = mapped_column(String(40))
    new_status: Mapped[str] = mapped_column(String(40), nullable=False)
    update_note: Mapped[str | None] = mapped_column(Text)
    blocker_reason: Mapped[str | None] = mapped_column(Text)
    completed_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class QualityInspection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quality_inspections"
    __table_args__ = (
        CheckConstraint("inspected_quantity > 0", name="quality_inspection_quantity_positive"),
        CheckConstraint("defect_quantity >= 0", name="quality_inspection_defects_non_negative"),
        CheckConstraint(
            "defect_quantity <= inspected_quantity", name="quality_inspection_defects_lte_inspected"
        ),
    )

    inspection_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    work_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("work_orders.id", ondelete="SET NULL")
    )
    product_style_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_styles.id", ondelete="SET NULL")
    )
    inspected_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    inspected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    inspected_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    defect_quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class QualityDefect(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quality_defects"
    __table_args__ = (CheckConstraint("quantity > 0", name="quality_defect_quantity_positive"),)

    inspection_id: Mapped[UUID] = mapped_column(
        ForeignKey("quality_inspections.id", ondelete="CASCADE"), nullable=False
    )
    defect_type: Mapped[str] = mapped_column(String(80), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(40))
    rework_task_id: Mapped[UUID | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)


class LabelTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "label_templates"
    __table_args__ = (
        CheckConstraint("page_width_mm > 0", name="label_template_page_width_positive"),
        CheckConstraint("page_height_mm > 0", name="label_template_page_height_positive"),
        CheckConstraint("label_width_mm > 0", name="label_template_label_width_positive"),
        CheckConstraint("label_height_mm > 0", name="label_template_label_height_positive"),
        CheckConstraint("slots_per_page > 0", name="label_template_slots_positive"),
        UniqueConstraint("template_code", "version", name="uq_label_templates_code_version"),
    )

    template_code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    template_type: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="draft")
    page_width_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    page_height_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    label_width_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    label_height_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    margin_top_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    margin_left_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    gap_x_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    gap_y_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    slots_per_page: Mapped[int] = mapped_column(Integer, nullable=False)
    columns: Mapped[int] = mapped_column(Integer, nullable=False)
    rows: Mapped[int] = mapped_column(Integer, nullable=False)
    fill_order: Mapped[str] = mapped_column(String(40), nullable=False, server_default="row_major")
    offset_x_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, server_default="0")
    offset_y_mm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, server_default="0")
    design_json: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class SavedLabel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "saved_labels"
    __table_args__ = (
        CheckConstraint("default_quantity > 0", name="saved_label_default_quantity_positive"),
        CheckConstraint("status in ('active', 'archived')", name="saved_label_status"),
        Index("ix_saved_labels_status_updated", "status", "updated_at"),
        Index("ix_saved_labels_template_status", "template_id", "status"),
    )

    label_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    template_id: Mapped[UUID] = mapped_column(
        ForeignKey("label_templates.id", ondelete="RESTRICT"), nullable=False
    )
    template_version: Mapped[int] = mapped_column(Integer, nullable=False)
    product_style_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_styles.id", ondelete="SET NULL")
    )
    art_no: Mapped[str] = mapped_column(String(80), nullable=False)
    colour: Mapped[str] = mapped_column(String(80), nullable=False)
    size: Mapped[str] = mapped_column(String(24), nullable=False)
    mrp_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    manufactured_by: Mapped[str] = mapped_column(String(160), nullable=False)
    origin_text: Mapped[str] = mapped_column(String(80), nullable=False)
    default_quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="24")
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="active")
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class LabelPrintJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "label_print_jobs"
    __table_args__ = (
        Index("ix_label_print_jobs_created_at", "created_at"),
        Index("ix_label_print_jobs_saved_label_id", "saved_label_id"),
    )

    print_job_code: Mapped[str] = mapped_column(String(48), nullable=False, unique=True)
    saved_label_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("saved_labels.id", ondelete="SET NULL")
    )
    template_id: Mapped[UUID] = mapped_column(
        ForeignKey("label_templates.id", ondelete="RESTRICT"), nullable=False
    )
    template_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    work_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("work_orders.id", ondelete="SET NULL")
    )
    product_style_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_styles.id", ondelete="SET NULL")
    )
    requested_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    field_values: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    pdf_s3_key: Mapped[str | None] = mapped_column(String(512))
    printed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity_created", "entity_type", "entity_id", "created_at"),
    )

    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[UUID | None] = mapped_column(PostgresUUID(as_uuid=True))
    before_data: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    after_data: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SiteSetting(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "site_settings"
    __table_args__ = (
        UniqueConstraint("key", name="uq_site_settings_key"),
    )

    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class PartnerInquiry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "partner_inquiries"
    __table_args__ = (
        CheckConstraint(
            "partner_type in ('retail', 'supermarket', 'direct', 'wholesale', 'other')",
            name="partner_inquiry_type",
        ),
        CheckConstraint(
            "status in ('new', 'contacted', 'converted', 'declined')",
            name="partner_inquiry_status",
        ),
        Index("ix_partner_inquiries_status_created", "status", "created_at"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str | None] = mapped_column(String(256))
    location: Mapped[str | None] = mapped_column(String(200))
    partner_type: Mapped[str] = mapped_column(String(40), nullable=False, server_default="retail")
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default="new")


# ══════════════════════════════════════════════════════════════════════
# HIGH-IMPACT IMPROVEMENTS MODELS
# ══════════════════════════════════════════════════════════════════════


class MaterialPriceHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "material_price_history"

    material_id: Mapped[UUID] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    supplier_id: Mapped[UUID | None] = mapped_column(ForeignKey("suppliers.id"))
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="NPR")
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    source: Mapped[str | None] = mapped_column(String(50))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class WorkOrderCostSnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "work_order_cost_snapshots"

    work_order_id: Mapped[UUID] = mapped_column(ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    bom_version_id: Mapped[UUID] = mapped_column(ForeignKey("bom_versions.id"), nullable=False)
    estimated_material_cost_per_pair: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estimated_labor_cost_per_pair: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    estimated_overhead_per_pair: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    estimated_total_per_pair: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    actual_material_cost_per_pair: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    actual_labor_cost_per_pair: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    actual_total_per_pair: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    variance_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    snapshot_prices: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class MaterialReservation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "material_reservations"
    __table_args__ = (
        CheckConstraint("status in ('reserved', 'partially_issued', 'fully_issued', 'cancelled')", name="ck_material_reservations_status"),
    )

    work_order_id: Mapped[UUID] = mapped_column(ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[UUID] = mapped_column(ForeignKey("materials.id"), nullable=False)
    quantity_reserved: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    quantity_issued: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, server_default="0")
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="reserved")
    reserved_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PurchaseOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        CheckConstraint(
            "status in ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')",
            name="ck_purchase_orders_status",
        ),
    )

    po_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    supplier_id: Mapped[UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")
    order_date: Mapped[date | None] = mapped_column(Date)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date)
    actual_delivery_date: Mapped[date | None] = mapped_column(Date)
    subtotal_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    tax_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    total_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class PurchaseOrderItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "purchase_order_items"

    purchase_order_id: Mapped[UUID] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[UUID] = mapped_column(ForeignKey("materials.id"), nullable=False)
    quantity_ordered: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    quantity_received: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, server_default="0")
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    unit_price_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class SupplierPerformance(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "supplier_performance"
    __table_args__ = (
        UniqueConstraint("supplier_id", "period_start", "period_end", name="uq_supplier_performance_period"),
    )

    supplier_id: Mapped[UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_orders: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    on_time_deliveries: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    on_time_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    avg_delivery_days: Mapped[int | None] = mapped_column(Integer)
    total_spend_npr: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    quality_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class StageTimeLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "stage_time_logs"

    work_order_id: Mapped[UUID] = mapped_column(ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_pause_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    worker_count: Mapped[int | None] = mapped_column(Integer)
    pairs_input: Mapped[int | None] = mapped_column(Integer)
    pairs_output: Mapped[int | None] = mapped_column(Integer)
    pairs_defect: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class WorkerProductionLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "worker_production_log"

    employee_id: Mapped[UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    production_date: Mapped[date] = mapped_column(Date, nullable=False)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    work_order_id: Mapped[UUID | None] = mapped_column(ForeignKey("work_orders.id"))
    pairs_completed: Mapped[int] = mapped_column(Integer, nullable=False)
    hours_worked: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    quality_pass_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class PieceRateConfig(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "piece_rate_config"

    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    style_category: Mapped[str | None] = mapped_column(String(50))
    rate_per_pair: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Customer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("type in ('wholesale', 'retail', 'agent')", name="ck_customers_type"),
    )

    customer_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, server_default="wholesale")
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    credit_limit_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    payment_terms_days: Mapped[int | None] = mapped_column(Integer, server_default="30")
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class SalesOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sales_orders"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending', 'confirmed', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled')",
            name="ck_sales_orders_status",
        ),
    )

    order_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    customer_id: Mapped[UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pending")
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    requested_delivery_date: Mapped[date | None] = mapped_column(Date)
    promised_delivery_date: Mapped[date | None] = mapped_column(Date)
    actual_dispatch_date: Mapped[date | None] = mapped_column(Date)
    subtotal_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    tax_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    total_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class SalesOrderItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "sales_order_items"

    sales_order_id: Mapped[UUID] = mapped_column(ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False)
    style_id: Mapped[UUID] = mapped_column(ForeignKey("product_styles.id"), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50))
    size: Mapped[str | None] = mapped_column(String(10))
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_dispatched: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    unit_price_npr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)


class DispatchRecord(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "dispatch_records"

    dispatch_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    sales_order_id: Mapped[UUID] = mapped_column(ForeignKey("sales_orders.id"), nullable=False)
    dispatched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    dispatched_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    transport_method: Mapped[str | None] = mapped_column(String(50))
    tracking_number: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class DispatchItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "dispatch_items"

    dispatch_id: Mapped[UUID] = mapped_column(ForeignKey("dispatch_records.id", ondelete="CASCADE"), nullable=False)
    sales_order_item_id: Mapped[UUID] = mapped_column(ForeignKey("sales_order_items.id"), nullable=False)
    style_id: Mapped[UUID] = mapped_column(ForeignKey("product_styles.id"), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50))
    size: Mapped[str | None] = mapped_column(String(10))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)


class DailyProductionPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "daily_production_plans"
    __table_args__ = (
        CheckConstraint("status in ('draft', 'confirmed', 'in_progress', 'completed')", name="ck_daily_production_plans_status"),
    )

    plan_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")
    target_pairs: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_pairs: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    confirmed_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DailyPlanItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "daily_plan_items"

    plan_id: Mapped[UUID] = mapped_column(ForeignKey("daily_production_plans.id", ondelete="CASCADE"), nullable=False)
    work_order_id: Mapped[UUID] = mapped_column(ForeignKey("work_orders.id"), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    target_pairs: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_pairs: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    materials_ready: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    notes: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")


class CycleCount(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "cycle_counts"
    __table_args__ = (
        CheckConstraint("status in ('in_progress', 'completed', 'approved')", name="ck_cycle_counts_status"),
    )

    count_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    count_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="in_progress")
    count_type: Mapped[str] = mapped_column(String(20), nullable=False)
    category_filter: Mapped[str | None] = mapped_column(String(50))
    counted_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_items_counted: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    discrepancies_found: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_variance_npr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CycleCountItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "cycle_count_items"

    cycle_count_id: Mapped[UUID] = mapped_column(ForeignKey("cycle_counts.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[UUID] = mapped_column(ForeignKey("materials.id"), nullable=False)
    system_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    counted_quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit_cost_npr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    adjustment_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    notes: Mapped[str | None] = mapped_column(Text)


class InventoryAccuracyLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "inventory_accuracy_log"

    measured_date: Mapped[date] = mapped_column(Date, nullable=False)
    items_counted: Mapped[int] = mapped_column(Integer, nullable=False)
    items_accurate: Mapped[int] = mapped_column(Integer, nullable=False)
    accuracy_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    total_variance_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class DefectAnalytics(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "defect_analytics"

    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    style_id: Mapped[UUID | None] = mapped_column(ForeignKey("product_styles.id"))
    stage: Mapped[str | None] = mapped_column(String(50))
    defect_type: Mapped[str | None] = mapped_column(String(100))
    root_cause_category: Mapped[str | None] = mapped_column(String(50))
    total_defects: Mapped[int] = mapped_column(Integer, nullable=False)
    total_rework_cost_npr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    avg_rework_time_hours: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    supplier_id: Mapped[UUID | None] = mapped_column(ForeignKey("suppliers.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
