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
