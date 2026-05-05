"""Extended factory services for Styles, BOM, Suppliers, Work Orders, Inventory, and QC."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AuditLog,
    BomItem,
    BomVersion,
    InventoryMovement,
    InventoryStock,
    Material,
    ProductStyle,
    QualityDefect,
    QualityInspection,
    Supplier,
    Task,
    TaskBoard,
    User,
    WorkOrder,
    WorkOrderSizeLine,
)
from app.modules.factory.schemas_extended import (
    BomItemResponse,
    BomVersionCreate,
    BomVersionResponse,
    InspectionCreate,
    InspectionResponse,
    DefectInput,
    DefectResponse,
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    MovementResponse,
    ProductStyleCreate,
    ProductStyleDetail,
    ProductStyleResponse,
    ProductStyleUpdate,
    ReceiveStockInput,
    IssueStockInput,
    AdjustStockInput,
    WastageInput,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
    WorkOrderCreate,
    WorkOrderCreateResponse,
    WorkOrderUpdate,
)
from app.modules.factory.service import (
    FactoryServiceError,
    MANAGER_ROLES,
    UserContext,
)


# =============================================================================
# Audit Logging
# =============================================================================

async def write_audit(
    session: AsyncSession,
    actor: UserContext,
    action: str,
    entity_type: str,
    entity_id: UUID,
    before_data: dict[str, object] | None = None,
    after_data: dict[str, object] | None = None,
) -> None:
    log = AuditLog(
        actor_user_id=actor.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
    )
    session.add(log)


def _require_manager(actor: UserContext) -> None:
    if actor.role not in MANAGER_ROLES:
        raise FactoryServiceError(403, "Only managers and admins can perform this action.")


def _require_admin(actor: UserContext) -> None:
    if actor.role != "owner_admin":
        raise FactoryServiceError(403, "Only admins can perform this action.")


# =============================================================================
# Product Styles
# =============================================================================

async def list_product_styles(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
) -> list[ProductStyleResponse]:
    query = select(ProductStyle).order_by(ProductStyle.created_at.desc())
    if search:
        query = query.where(
            ProductStyle.name.ilike(f"%{search}%")
            | ProductStyle.style_code.ilike(f"%{search}%")
        )
    query = query.offset((page - 1) * page_size).limit(page_size)
    styles = list((await session.scalars(query)).all())
    return [_style_response(s) for s in styles]


async def get_product_style(session: AsyncSession, style_id: UUID) -> ProductStyleDetail:
    style = await session.get(ProductStyle, style_id)
    if not style:
        raise FactoryServiceError(404, "Product style not found.")
    # Get active BOM
    bom_query = select(BomVersion).where(
        BomVersion.product_style_id == style_id,
        BomVersion.status == "approved",
    ).order_by(BomVersion.version.desc()).limit(1)
    active_bom = (await session.scalars(bom_query)).first()
    bom_resp = None
    if active_bom:
        bom_resp = await _bom_version_response(session, active_bom)
    return ProductStyleDetail(
        **_style_response(style).model_dump(),
        active_bom=bom_resp,
    )


async def create_product_style(
    session: AsyncSession,
    data: ProductStyleCreate,
    actor: UserContext,
) -> ProductStyleResponse:
    _require_manager(actor)
    # Generate style code
    year = datetime.now(UTC).year
    cat_prefix = data.category[:3].upper()
    count_query = select(func.count()).select_from(ProductStyle).where(
        ProductStyle.style_code.like(f"PAI-{year}-{cat_prefix}-%")
    )
    count = (await session.scalar(count_query)) or 0
    style_code = f"PAI-{year}-{cat_prefix}-{count + 1:03d}"

    style = ProductStyle(
        style_code=style_code,
        name=data.name,
        category=data.category,
        sample_status=data.sample_status or "concept",
        target_cost_npr=data.target_cost_npr,
        target_mrp_npr=data.target_mrp_npr,
        notes=data.notes,
    )
    session.add(style)
    await session.flush()
    await write_audit(session, actor, "style.create", "product_style", style.id,
                      after_data={"style_code": style_code, "name": data.name})
    return _style_response(style)


async def update_product_style(
    session: AsyncSession,
    style_id: UUID,
    data: ProductStyleUpdate,
    actor: UserContext,
) -> ProductStyleResponse:
    _require_manager(actor)
    style = await session.get(ProductStyle, style_id)
    if not style:
        raise FactoryServiceError(404, "Product style not found.")
    if style.version != data.version:
        raise FactoryServiceError(409, "Style was modified by another user. Refresh and try again.")

    before: dict[str, object] = {"name": style.name, "category": style.category, "sample_status": style.sample_status}
    if data.name is not None:
        style.name = data.name
    if data.category is not None:
        style.category = data.category
    if data.description is not None:
        style.description = data.description
    if data.size_range is not None:
        style.size_range = data.size_range
    if data.sample_status is not None:
        style.sample_status = data.sample_status
    if data.target_cost_npr is not None:
        style.target_cost_npr = data.target_cost_npr
    if data.target_mrp_npr is not None:
        style.target_mrp_npr = data.target_mrp_npr
    if data.notes is not None:
        style.notes = data.notes
    style.version += 1
    await session.flush()
    await write_audit(session, actor, "style.update", "product_style", style.id,
                      before_data=before,
                      after_data={"name": style.name, "category": style.category})
    return _style_response(style)


def _style_response(s: ProductStyle) -> ProductStyleResponse:
    return ProductStyleResponse(
        id=s.id,
        style_code=s.style_code,
        name=s.name,
        category=s.category,
        description=s.description,
        size_range=s.size_range,
        sample_status=s.sample_status,
        target_cost_npr=s.target_cost_npr,
        target_mrp_npr=s.target_mrp_npr,
        notes=s.notes,
        created_at=s.created_at,
        version=s.version,
    )


# =============================================================================
# BOM
# =============================================================================

async def list_bom_versions(session: AsyncSession, style_id: UUID) -> list[BomVersionResponse]:
    query = select(BomVersion).where(
        BomVersion.product_style_id == style_id
    ).order_by(BomVersion.version.desc())
    versions = list((await session.scalars(query)).all())
    results = []
    for v in versions:
        results.append(await _bom_version_response(session, v))
    return results


async def create_bom_version(
    session: AsyncSession,
    style_id: UUID,
    data: BomVersionCreate,
    actor: UserContext,
) -> BomVersionResponse:
    _require_manager(actor)
    style = await session.get(ProductStyle, style_id)
    if not style:
        raise FactoryServiceError(404, "Product style not found.")

    # Get next version number
    max_ver = await session.scalar(
        select(func.max(BomVersion.version)).where(BomVersion.product_style_id == style_id)
    )
    new_version = (max_ver or 0) + 1

    bom = BomVersion(
        product_style_id=style_id,
        version=new_version,
        status="draft",
        notes=data.notes,
    )
    session.add(bom)
    await session.flush()

    # Add items with cost snapshots
    total_cost = Decimal("0")
    for item_input in data.items:
        material = await session.get(Material, item_input.material_id)
        if not material:
            raise FactoryServiceError(400, f"Material {item_input.material_id} not found.")
        cost_snapshot = material.average_cost_npr or Decimal("0")
        qty_with_wastage = item_input.quantity_per_pair * (1 + item_input.wastage_percent / Decimal("100"))
        line_cost = cost_snapshot * qty_with_wastage
        total_cost += line_cost

        bom_item = BomItem(
            bom_version_id=bom.id,
            material_id=item_input.material_id,
            quantity_per_pair=item_input.quantity_per_pair,
            wastage_percent=item_input.wastage_percent,
            cost_snapshot_npr=cost_snapshot,
        )
        session.add(bom_item)

    await session.flush()
    await write_audit(session, actor, "bom.create", "bom_version", bom.id,
                      after_data={"style_id": str(style_id), "version": new_version})
    return await _bom_version_response(session, bom)


async def approve_bom_version(
    session: AsyncSession,
    style_id: UUID,
    bom_id: UUID,
    actor: UserContext,
) -> BomVersionResponse:
    _require_admin(actor)
    bom = await session.get(BomVersion, bom_id)
    if not bom or bom.product_style_id != style_id:
        raise FactoryServiceError(404, "BOM version not found.")
    if bom.status != "draft":
        raise FactoryServiceError(400, "Only draft BOMs can be approved.")

    # Supersede any existing approved BOM
    await session.execute(
        update(BomVersion)
        .where(BomVersion.product_style_id == style_id, BomVersion.status == "approved")
        .values(status="superseded")
    )
    bom.status = "approved"
    bom.approved_at = datetime.now(UTC)
    bom.approved_by_user_id = actor.id
    await session.flush()
    await write_audit(session, actor, "bom.approve", "bom_version", bom.id)
    return await _bom_version_response(session, bom)


async def _bom_version_response(session: AsyncSession, bom: BomVersion) -> BomVersionResponse:
    items_query = select(BomItem, Material.name, Material.material_code).join(
        Material, BomItem.material_id == Material.id
    ).where(BomItem.bom_version_id == bom.id)
    rows = (await session.execute(items_query)).all()
    items = []
    total_cost = Decimal("0")
    for item, mat_name, mat_code in rows:
        qty_with_wastage = item.quantity_per_pair * (1 + item.wastage_percent / Decimal("100"))
        line_cost = (item.cost_snapshot_npr or Decimal("0")) * qty_with_wastage
        total_cost += line_cost
        items.append(BomItemResponse(
            id=item.id,
            material_id=item.material_id,
            material_code=mat_code,
            material_name=mat_name,
            quantity_per_pair=item.quantity_per_pair,
            wastage_percent=item.wastage_percent,
            cost_snapshot_npr=item.cost_snapshot_npr or Decimal("0"),
            line_cost_npr=line_cost,
        ))
    return BomVersionResponse(
        id=bom.id,
        version=bom.version,
        status=bom.status,
        notes=bom.notes,
        total_cost_per_pair_npr=total_cost,
        items=items,
        approved_at=bom.approved_at,
        created_at=bom.created_at,
    )


# =============================================================================
# Suppliers
# =============================================================================

async def list_suppliers(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
) -> list[SupplierResponse]:
    query = select(Supplier).order_by(Supplier.name)
    if search:
        query = query.where(
            Supplier.name.ilike(f"%{search}%")
            | Supplier.supplier_code.ilike(f"%{search}%")
        )
    query = query.offset((page - 1) * page_size).limit(page_size)
    suppliers = list((await session.scalars(query)).all())
    return [_supplier_response(s) for s in suppliers]


async def get_supplier(session: AsyncSession, supplier_id: UUID) -> SupplierResponse:
    supplier = await session.get(Supplier, supplier_id)
    if not supplier:
        raise FactoryServiceError(404, "Supplier not found.")
    return _supplier_response(supplier)


async def create_supplier(
    session: AsyncSession,
    data: SupplierCreate,
    actor: UserContext,
) -> SupplierResponse:
    _require_manager(actor)
    count = (await session.scalar(select(func.count()).select_from(Supplier))) or 0
    supplier_code = f"SUP-{count + 1:04d}"

    supplier = Supplier(
        supplier_code=supplier_code,
        name=data.name,
        contact_person=data.contact_person,
        phone=data.phone,
        email=data.email,
        address=data.address,
        material_categories=data.material_categories or [],
        payment_terms=data.payment_terms,
        usual_lead_time_days=data.usual_lead_time_days,
        notes=data.notes,
    )
    session.add(supplier)
    await session.flush()
    await write_audit(session, actor, "supplier.create", "supplier", supplier.id,
                      after_data={"name": data.name, "code": supplier_code})
    return _supplier_response(supplier)


async def update_supplier(
    session: AsyncSession,
    supplier_id: UUID,
    data: SupplierUpdate,
    actor: UserContext,
) -> SupplierResponse:
    _require_manager(actor)
    supplier = await session.get(Supplier, supplier_id)
    if not supplier:
        raise FactoryServiceError(404, "Supplier not found.")
    if getattr(supplier, "version", 1) != data.version:
        raise FactoryServiceError(409, "Supplier was modified. Refresh and try again.")

    if data.name is not None:
        supplier.name = data.name
    if data.contact_person is not None:
        supplier.contact_person = data.contact_person
    if data.phone is not None:
        supplier.phone = data.phone
    if data.email is not None:
        supplier.email = data.email
    if data.address is not None:
        supplier.address = data.address
    if data.material_categories is not None:
        supplier.material_categories = data.material_categories
    if data.payment_terms is not None:
        supplier.payment_terms = data.payment_terms
    if data.usual_lead_time_days is not None:
        supplier.usual_lead_time_days = data.usual_lead_time_days
    if data.rating is not None:
        supplier.rating = data.rating
    if data.notes is not None:
        supplier.notes = data.notes
    supplier.version += 1
    await session.flush()
    await write_audit(session, actor, "supplier.update", "supplier", supplier.id)
    return _supplier_response(supplier)


def _supplier_response(s: Supplier) -> SupplierResponse:
    return SupplierResponse(
        id=s.id,
        supplier_code=s.supplier_code,
        name=s.name,
        contact_person=s.contact_person,
        phone=s.phone,
        email=s.email,
        address=s.address,
        material_categories=s.material_categories or [],
        payment_terms=s.payment_terms,
        usual_lead_time_days=s.usual_lead_time_days,
        rating=s.rating,
        notes=s.notes,
        created_at=s.created_at,
        version=s.version,
    )


# =============================================================================
# Work Orders (Create/Update/Generate Tasks)
# =============================================================================

async def create_work_order(
    session: AsyncSession,
    data: WorkOrderCreate,
    actor: UserContext,
) -> WorkOrderCreateResponse:
    _require_manager(actor)
    style = await session.get(ProductStyle, data.product_style_id)
    if not style:
        raise FactoryServiceError(400, "Product style not found.")

    # Get approved BOM for cost snapshot
    bom_query = select(BomVersion).where(
        BomVersion.product_style_id == data.product_style_id,
        BomVersion.status == "approved",
    ).order_by(BomVersion.version.desc()).limit(1)
    approved_bom = (await session.scalars(bom_query)).first()

    # Calculate cost snapshot
    cost_snapshot = None
    total_pairs = sum(sl.planned_pairs for sl in data.size_lines)
    if approved_bom:
        bom_resp = await _bom_version_response(session, approved_bom)
        cost_snapshot = bom_resp.total_cost_per_pair_npr * total_pairs

    # Generate work order code
    year = datetime.now(UTC).year
    count = (await session.scalar(
        select(func.count()).select_from(WorkOrder).where(
            WorkOrder.work_order_code.like(f"WO-{year}-%")
        )
    )) or 0
    wo_code = f"WO-{year}-{count + 1:06d}"

    wo = WorkOrder(
        work_order_code=wo_code,
        product_style_id=data.product_style_id,
        bom_version_id=approved_bom.id if approved_bom else None,
        status="planning",
        priority=data.priority,
        planned_pairs=total_pairs,
        completed_pairs=0,
        current_stage="cutting",
        due_date=data.due_date,
        cost_snapshot_npr=cost_snapshot,
        version=1,
    )
    session.add(wo)
    await session.flush()

    # Add size lines
    for sl in data.size_lines:
        size_line = WorkOrderSizeLine(
            work_order_id=wo.id,
            color=sl.color,
            size=sl.size,
            planned_pairs=sl.planned_pairs,
            completed_pairs=0,
        )
        session.add(size_line)

    await session.flush()
    await write_audit(session, actor, "work_order.create", "work_order", wo.id,
                      after_data={"code": wo_code, "style": style.name, "pairs": total_pairs})

    return WorkOrderCreateResponse(
        id=wo.id,
        work_order_code=wo_code,
        style_name=style.name,
        planned_pairs=total_pairs,
        cost_snapshot_npr=cost_snapshot,
    )


async def update_work_order(
    session: AsyncSession,
    wo_id: UUID,
    data: WorkOrderUpdate,
    actor: UserContext,
) -> WorkOrderCreateResponse:
    _require_manager(actor)
    wo = await session.get(WorkOrder, wo_id)
    if not wo:
        raise FactoryServiceError(404, "Work order not found.")
    if wo.version != data.version:
        raise FactoryServiceError(409, "Work order was modified. Refresh and try again.")

    if data.priority is not None:
        wo.priority = data.priority
    if data.status is not None:
        wo.status = data.status
    if data.due_date is not None:
        wo.due_date = data.due_date
    if data.notes is not None:
        wo.notes = data.notes
    wo.version += 1
    await session.flush()
    await write_audit(session, actor, "work_order.update", "work_order", wo.id)

    style = await session.get(ProductStyle, wo.product_style_id)
    return WorkOrderCreateResponse(
        id=wo.id,
        work_order_code=wo.work_order_code,
        style_name=style.name if style else "Unknown",
        planned_pairs=wo.planned_pairs,
        cost_snapshot_npr=wo.cost_snapshot_npr,
    )


async def generate_work_order_tasks(
    session: AsyncSession,
    wo_id: UUID,
    actor: UserContext,
) -> list[dict[str, object]]:
    _require_manager(actor)
    wo = await session.get(WorkOrder, wo_id)
    if not wo:
        raise FactoryServiceError(404, "Work order not found.")

    # Idempotency: check if tasks already exist for this work order
    existing_count = await session.scalar(
        select(func.count()).select_from(Task).where(Task.work_order_id == wo_id)
    )
    if existing_count and existing_count > 0:
        raise FactoryServiceError(409, "Tasks already generated for this work order.")

    style = await session.get(ProductStyle, wo.product_style_id)
    style_name = style.name if style else "Unknown"

    # Production stages
    stages = ["cutting", "stitching", "lasting", "sole_attachment", "finishing", "qc", "packing"]

    # Get or create production board
    board = (await session.scalars(
        select(TaskBoard).where(TaskBoard.board_type == "production").limit(1)
    )).first()
    if not board:
        board = TaskBoard(name="Production", board_type="production", active=True)
        session.add(board)
        await session.flush()

    # Generate task code prefix
    year = datetime.now(UTC).year
    task_count_base = (await session.scalar(select(func.count()).select_from(Task))) or 0

    created_tasks: list[dict[str, object]] = []
    for i, stage in enumerate(stages):
        task_count_base += 1
        task_code = f"TASK-{year}-{task_count_base:06d}"
        task = Task(
            task_code=task_code,
            title=f"{stage.replace('_', ' ').title()} - {style_name} - {wo.work_order_code}",
            board_id=board.id,
            status="backlog",
            priority=wo.priority or "normal",
            work_order_id=wo.id,
            product_style_id=wo.product_style_id,
            estimated_quantity=Decimal(str(wo.planned_pairs)),
            completed_quantity=Decimal("0"),
            unit_of_measure="pairs",
            requires_review=(stage == "qc"),
            version=1,
        )
        session.add(task)
        created_tasks.append({"task_code": task_code, "stage": stage, "title": task.title})

    await session.flush()
    await write_audit(session, actor, "work_order.generate_tasks", "work_order", wo.id,
                      after_data={"task_count": len(created_tasks)})
    return created_tasks


async def get_material_requirements(
    session: AsyncSession,
    wo_id: UUID,
) -> list[dict[str, object]]:
    wo = await session.get(WorkOrder, wo_id)
    if not wo:
        raise FactoryServiceError(404, "Work order not found.")

    if not wo.bom_version_id:
        return []

    items_query = select(BomItem, Material).join(
        Material, BomItem.material_id == Material.id
    ).where(BomItem.bom_version_id == wo.bom_version_id)
    rows = (await session.execute(items_query)).all()

    requirements: list[dict[str, object]] = []
    for bom_item, material in rows:
        qty_with_wastage = bom_item.quantity_per_pair * (1 + bom_item.wastage_percent / Decimal("100"))
        required = qty_with_wastage * wo.planned_pairs

        # Get current stock
        stock_query = select(func.coalesce(func.sum(InventoryStock.quantity), Decimal("0"))).where(
            InventoryStock.material_id == material.id
        )
        current_stock = await session.scalar(stock_query) or Decimal("0")

        shortfall = max(Decimal("0"), required - current_stock)
        requirements.append({
            "material_id": str(material.id),
            "material_code": material.material_code,
            "material_name": material.name,
            "unit": material.unit_of_measure,
            "required_quantity": float(required),
            "current_stock": float(current_stock),
            "shortfall": float(shortfall),
        })

    return requirements


# =============================================================================
# Materials & Inventory Movements
# =============================================================================

async def list_materials(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
) -> list[MaterialResponse]:
    query = select(Material).where(Material.active == True).order_by(Material.name)  # noqa: E712
    if search:
        query = query.where(
            Material.name.ilike(f"%{search}%")
            | Material.material_code.ilike(f"%{search}%")
        )
    query = query.offset((page - 1) * page_size).limit(page_size)
    materials = list((await session.scalars(query)).all())

    results = []
    for mat in materials:
        stock_qty = await session.scalar(
            select(func.coalesce(func.sum(InventoryStock.quantity), Decimal("0"))).where(
                InventoryStock.material_id == mat.id
            )
        ) or Decimal("0")
        risk = "ok"
        if stock_qty <= 0:
            risk = "critical"
        elif stock_qty < mat.minimum_stock:
            risk = "low"
        results.append(MaterialResponse(
            id=mat.id,
            material_code=mat.material_code,
            name=mat.name,
            category=mat.category,
            unit_of_measure=mat.unit_of_measure,
            supplier_id=mat.supplier_id,
            minimum_stock=mat.minimum_stock,
            current_stock=stock_qty,
            average_cost_npr=mat.average_cost_npr,
            last_purchase_cost_npr=mat.last_purchase_cost_npr,
            location=mat.location,
            risk=risk,
            version=getattr(mat, "version", 1),
        ))
    return results


async def create_material(
    session: AsyncSession,
    data: MaterialCreate,
    actor: UserContext,
) -> MaterialResponse:
    _require_manager(actor)
    count = (await session.scalar(select(func.count()).select_from(Material))) or 0
    mat_code = f"MAT-{count + 1:04d}"

    mat = Material(
        material_code=mat_code,
        name=data.name,
        category=data.category,
        unit_of_measure=data.unit_of_measure,
        supplier_id=data.supplier_id,
        minimum_stock=data.minimum_stock,
        average_cost_npr=data.average_cost_npr,
        location=data.location,
        active=True,
    )
    session.add(mat)
    await session.flush()

    # Create initial stock record
    stock = InventoryStock(
        material_id=mat.id,
        stock_type="raw_material",
        quantity=Decimal("0"),
        unit_of_measure=data.unit_of_measure,
    )
    session.add(stock)
    await session.flush()
    await write_audit(session, actor, "material.create", "material", mat.id,
                      after_data={"code": mat_code, "name": data.name})

    return MaterialResponse(
        id=mat.id,
        material_code=mat_code,
        name=mat.name,
        category=mat.category,
        unit_of_measure=mat.unit_of_measure,
        supplier_id=mat.supplier_id,
        minimum_stock=mat.minimum_stock,
        current_stock=Decimal("0"),
        average_cost_npr=mat.average_cost_npr,
        last_purchase_cost_npr=None,
        location=mat.location,
        risk="critical",
        version=1,
    )


async def update_material(
    session: AsyncSession,
    material_id: UUID,
    data: MaterialUpdate,
    actor: UserContext,
) -> MaterialResponse:
    _require_manager(actor)
    mat = await session.get(Material, material_id)
    if not mat:
        raise FactoryServiceError(404, "Material not found.")

    if data.name is not None:
        mat.name = data.name
    if data.category is not None:
        mat.category = data.category
    if data.unit_of_measure is not None:
        mat.unit_of_measure = data.unit_of_measure
    if data.supplier_id is not None:
        mat.supplier_id = data.supplier_id
    if data.minimum_stock is not None:
        mat.minimum_stock = data.minimum_stock
    if data.location is not None:
        mat.location = data.location
    await session.flush()
    await write_audit(session, actor, "material.update", "material", mat.id)

    stock_qty = await session.scalar(
        select(func.coalesce(func.sum(InventoryStock.quantity), Decimal("0"))).where(
            InventoryStock.material_id == mat.id
        )
    ) or Decimal("0")
    risk = "ok"
    if stock_qty <= 0:
        risk = "critical"
    elif stock_qty < mat.minimum_stock:
        risk = "low"

    return MaterialResponse(
        id=mat.id,
        material_code=mat.material_code,
        name=mat.name,
        category=mat.category,
        unit_of_measure=mat.unit_of_measure,
        supplier_id=mat.supplier_id,
        minimum_stock=mat.minimum_stock,
        current_stock=stock_qty,
        average_cost_npr=mat.average_cost_npr,
        last_purchase_cost_npr=mat.last_purchase_cost_npr,
        location=mat.location,
        risk=risk,
        version=getattr(mat, "version", 1),
    )


async def receive_stock(
    session: AsyncSession,
    data: ReceiveStockInput,
    actor: UserContext,
) -> MovementResponse:
    _require_manager(actor)
    mat = await session.get(Material, data.material_id)
    if not mat:
        raise FactoryServiceError(400, "Material not found.")

    # Update stock
    stock = (await session.scalars(
        select(InventoryStock).where(InventoryStock.material_id == data.material_id).limit(1)
    )).first()
    if stock:
        stock.quantity += data.quantity
    else:
        stock = InventoryStock(
            material_id=data.material_id,
            stock_type="raw_material",
            quantity=data.quantity,
            unit_of_measure=mat.unit_of_measure,
        )
        session.add(stock)

    # Update material cost
    mat.last_purchase_cost_npr = data.unit_cost_npr
    if mat.average_cost_npr and stock.quantity > data.quantity:
        # Simple moving average: weight old cost by old stock, new cost by new quantity
        current_stock = stock.quantity - data.quantity
        total_value = mat.average_cost_npr * current_stock + data.unit_cost_npr * data.quantity
        mat.average_cost_npr = total_value / stock.quantity
    else:
        mat.average_cost_npr = data.unit_cost_npr

    # Record movement
    count = (await session.scalar(select(func.count()).select_from(InventoryMovement))) or 0
    movement = InventoryMovement(
        movement_code=f"MOV-{count + 1:06d}",
        stock_id=stock.id if stock.id else None,
        material_id=data.material_id,
        movement_type="receive",
        quantity_delta=data.quantity,
        unit_of_measure=mat.unit_of_measure,
        reason=data.notes or "Received from supplier",
        performed_by_user_id=actor.id,
    )
    session.add(movement)
    await session.flush()
    await write_audit(session, actor, "inventory.receive", "inventory_movement", movement.id,
                      after_data={"material": mat.name, "qty": float(data.quantity)})

    return MovementResponse(
        id=movement.id,
        movement_code=movement.movement_code,
        material_name=mat.name,
        movement_type="receive",
        quantity=data.quantity,
        unit=mat.unit_of_measure,
        reason=movement.reason,
        created_at=movement.created_at,
    )


async def issue_stock(
    session: AsyncSession,
    data: IssueStockInput,
    actor: UserContext,
) -> MovementResponse:
    _require_manager(actor)
    mat = await session.get(Material, data.material_id)
    if not mat:
        raise FactoryServiceError(400, "Material not found.")

    stock = (await session.scalars(
        select(InventoryStock).where(InventoryStock.material_id == data.material_id).limit(1)
    )).first()
    if not stock or stock.quantity < data.quantity:
        available = stock.quantity if stock else Decimal("0")
        raise FactoryServiceError(
            400,
            f"Insufficient stock. Available: {available} {mat.unit_of_measure}, requested: {data.quantity}",
        )

    stock.quantity -= data.quantity

    count = (await session.scalar(select(func.count()).select_from(InventoryMovement))) or 0
    movement = InventoryMovement(
        movement_code=f"MOV-{count + 1:06d}",
        stock_id=stock.id,
        material_id=data.material_id,
        work_order_id=data.work_order_id,
        movement_type="issue_to_work_order",
        quantity_delta=-data.quantity,
        unit_of_measure=mat.unit_of_measure,
        reason=data.notes or "Issued to work order",
        performed_by_user_id=actor.id,
    )
    session.add(movement)
    await session.flush()
    await write_audit(session, actor, "inventory.issue", "inventory_movement", movement.id,
                      after_data={"material": mat.name, "qty": float(data.quantity)})

    return MovementResponse(
        id=movement.id,
        movement_code=movement.movement_code,
        material_name=mat.name,
        movement_type="issue_to_work_order",
        quantity=data.quantity,
        unit=mat.unit_of_measure,
        reason=movement.reason,
        created_at=movement.created_at,
    )


async def adjust_stock(
    session: AsyncSession,
    data: AdjustStockInput,
    actor: UserContext,
) -> MovementResponse:
    _require_manager(actor)
    mat = await session.get(Material, data.material_id)
    if not mat:
        raise FactoryServiceError(400, "Material not found.")

    stock = (await session.scalars(
        select(InventoryStock).where(InventoryStock.material_id == data.material_id).limit(1)
    )).first()
    if not stock:
        stock = InventoryStock(
            material_id=data.material_id,
            stock_type="raw_material",
            quantity=Decimal("0"),
            unit_of_measure=mat.unit_of_measure,
        )
        session.add(stock)
        await session.flush()

    new_qty = stock.quantity + data.quantity_delta
    if new_qty < 0:
        raise FactoryServiceError(400, f"Adjustment would result in negative stock ({new_qty}).")

    stock.quantity = new_qty

    count = (await session.scalar(select(func.count()).select_from(InventoryMovement))) or 0
    movement = InventoryMovement(
        movement_code=f"MOV-{count + 1:06d}",
        stock_id=stock.id,
        material_id=data.material_id,
        movement_type="adjustment",
        quantity_delta=data.quantity_delta,
        unit_of_measure=mat.unit_of_measure,
        reason=data.reason,
        performed_by_user_id=actor.id,
    )
    session.add(movement)
    await session.flush()
    await write_audit(session, actor, "inventory.adjust", "inventory_movement", movement.id,
                      after_data={"material": mat.name, "delta": float(data.quantity_delta), "reason": data.reason})

    return MovementResponse(
        id=movement.id,
        movement_code=movement.movement_code,
        material_name=mat.name,
        movement_type="adjustment",
        quantity=abs(data.quantity_delta),
        unit=mat.unit_of_measure,
        reason=data.reason,
        created_at=movement.created_at,
    )


async def record_wastage(
    session: AsyncSession,
    data: WastageInput,
    actor: UserContext,
) -> MovementResponse:
    _require_manager(actor)
    mat = await session.get(Material, data.material_id)
    if not mat:
        raise FactoryServiceError(400, "Material not found.")

    stock = (await session.scalars(
        select(InventoryStock).where(InventoryStock.material_id == data.material_id).limit(1)
    )).first()
    if not stock or stock.quantity < data.quantity:
        raise FactoryServiceError(400, "Insufficient stock to record wastage.")

    stock.quantity -= data.quantity

    count = (await session.scalar(select(func.count()).select_from(InventoryMovement))) or 0
    movement = InventoryMovement(
        movement_code=f"MOV-{count + 1:06d}",
        stock_id=stock.id,
        material_id=data.material_id,
        work_order_id=data.work_order_id,
        movement_type="wastage",
        quantity_delta=-data.quantity,
        unit_of_measure=mat.unit_of_measure,
        reason=data.reason,
        performed_by_user_id=actor.id,
    )
    session.add(movement)
    await session.flush()
    await write_audit(session, actor, "inventory.wastage", "inventory_movement", movement.id,
                      after_data={"material": mat.name, "qty": float(data.quantity)})

    return MovementResponse(
        id=movement.id,
        movement_code=movement.movement_code,
        material_name=mat.name,
        movement_type="wastage",
        quantity=data.quantity,
        unit=mat.unit_of_measure,
        reason=data.reason,
        created_at=movement.created_at,
    )


async def list_movements(
    session: AsyncSession,
    material_id: UUID | None = None,
    movement_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[MovementResponse]:
    query = select(InventoryMovement, Material.name).join(
        Material, InventoryMovement.material_id == Material.id, isouter=True
    ).order_by(InventoryMovement.created_at.desc())

    if material_id:
        query = query.where(InventoryMovement.material_id == material_id)
    if movement_type:
        query = query.where(InventoryMovement.movement_type == movement_type)

    query = query.offset((page - 1) * page_size).limit(page_size)
    rows = (await session.execute(query)).all()

    return [
        MovementResponse(
            id=mov.id,
            movement_code=mov.movement_code,
            material_name=mat_name or "Unknown",
            movement_type=mov.movement_type,
            quantity=abs(mov.quantity_delta),
            unit=mov.unit_of_measure,
            reason=mov.reason,
            created_at=mov.created_at,
        )
        for mov, mat_name in rows
    ]


# =============================================================================
# QC Inspections
# =============================================================================

async def create_inspection(
    session: AsyncSession,
    data: InspectionCreate,
    actor: UserContext,
) -> InspectionResponse:
    # QC inspectors and managers can create
    allowed = {"owner_admin", "factory_manager", "quality_inspector"}
    if actor.role not in allowed:
        raise FactoryServiceError(403, "Only QC inspectors and managers can create inspections.")

    wo = await session.get(WorkOrder, data.work_order_id)
    if not wo:
        raise FactoryServiceError(400, "Work order not found.")

    count = (await session.scalar(select(func.count()).select_from(QualityInspection))) or 0
    code = f"QC-{count + 1:06d}"

    inspection = QualityInspection(
        inspection_code=code,
        work_order_id=data.work_order_id,
        product_style_id=wo.product_style_id,
        inspected_by_user_id=actor.id,
        inspected_at=datetime.now(UTC),
        inspected_quantity=data.inspected_quantity,
        defect_quantity=0,
        status="in_progress",
        notes=data.notes,
    )
    session.add(inspection)
    await session.flush()
    await write_audit(session, actor, "inspection.create", "quality_inspection", inspection.id,
                      after_data={"code": code, "wo": wo.work_order_code, "qty": data.inspected_quantity})

    return InspectionResponse(
        id=inspection.id,
        inspection_code=code,
        work_order_code=wo.work_order_code,
        inspected_by=actor.display_name,
        inspected_at=inspection.inspected_at,
        inspected_quantity=inspection.inspected_quantity,
        defect_quantity=0,
        status="in_progress",
        notes=inspection.notes,
        defects=[],
    )


async def add_defect(
    session: AsyncSession,
    inspection_id: UUID,
    data: DefectInput,
    actor: UserContext,
) -> DefectResponse:
    inspection = await session.get(QualityInspection, inspection_id)
    if not inspection:
        raise FactoryServiceError(404, "Inspection not found.")
    if inspection.status not in ("in_progress",):
        raise FactoryServiceError(400, "Can only add defects to in-progress inspections.")

    defect = QualityDefect(
        inspection_id=inspection_id,
        defect_type=data.defect_type,
        quantity=data.quantity,
        severity=data.severity,
        notes=data.notes,
    )
    session.add(defect)
    inspection.defect_quantity += data.quantity
    await session.flush()

    return DefectResponse(
        id=defect.id,
        defect_type=defect.defect_type,
        quantity=defect.quantity,
        severity=defect.severity,
        notes=defect.notes,
    )


async def approve_inspection(
    session: AsyncSession,
    inspection_id: UUID,
    passed_quantity: int,
    actor: UserContext,
) -> InspectionResponse:
    allowed = {"owner_admin", "factory_manager", "quality_inspector"}
    if actor.role not in allowed:
        raise FactoryServiceError(403, "Insufficient permissions.")

    inspection = await session.get(QualityInspection, inspection_id)
    if not inspection:
        raise FactoryServiceError(404, "Inspection not found.")

    inspection.status = "passed"
    await session.flush()
    await write_audit(session, actor, "inspection.approve", "quality_inspection", inspection.id,
                      after_data={"passed_quantity": passed_quantity})

    return await _inspection_response(session, inspection)


async def fail_inspection(
    session: AsyncSession,
    inspection_id: UUID,
    failed_quantity: int,
    rework_quantity: int,
    create_rework_task: bool,
    actor: UserContext,
) -> InspectionResponse:
    allowed = {"owner_admin", "factory_manager", "quality_inspector"}
    if actor.role not in allowed:
        raise FactoryServiceError(403, "Insufficient permissions.")

    inspection = await session.get(QualityInspection, inspection_id)
    if not inspection:
        raise FactoryServiceError(404, "Inspection not found.")

    inspection.status = "failed"
    await session.flush()

    if create_rework_task and rework_quantity > 0:
        wo = await session.get(WorkOrder, inspection.work_order_id) if inspection.work_order_id else None
        wo_code = wo.work_order_code if wo else "N/A"

        board = (await session.scalars(
            select(TaskBoard).where(TaskBoard.board_type == "production").limit(1)
        )).first()

        year = datetime.now(UTC).year
        task_count = (await session.scalar(select(func.count()).select_from(Task))) or 0
        task_code = f"TASK-{year}-{task_count + 1:06d}"

        task = Task(
            task_code=task_code,
            title=f"Rework - {inspection.inspection_code} - {wo_code}",
            board_id=board.id if board else None,
            status="ready",
            priority="high",
            work_order_id=inspection.work_order_id,
            product_style_id=inspection.product_style_id,
            estimated_quantity=Decimal(str(rework_quantity)),
            completed_quantity=Decimal("0"),
            unit_of_measure="pairs",
            requires_review=True,
            version=1,
        )
        session.add(task)
        await session.flush()

    await write_audit(session, actor, "inspection.fail", "quality_inspection", inspection.id,
                      after_data={"failed": failed_quantity, "rework": rework_quantity})

    return await _inspection_response(session, inspection)


async def list_inspections(
    session: AsyncSession,
    work_order_id: UUID | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[InspectionResponse]:
    query = select(QualityInspection).order_by(QualityInspection.inspected_at.desc())
    if work_order_id:
        query = query.where(QualityInspection.work_order_id == work_order_id)
    if status:
        query = query.where(QualityInspection.status == status)
    query = query.offset((page - 1) * page_size).limit(page_size)
    inspections = list((await session.scalars(query)).all())
    return [await _inspection_response(session, i) for i in inspections]


async def _inspection_response(session: AsyncSession, insp: QualityInspection) -> InspectionResponse:
    wo = await session.get(WorkOrder, insp.work_order_id) if insp.work_order_id else None
    inspector = await session.get(User, insp.inspected_by_user_id) if insp.inspected_by_user_id else None

    defects_query = select(QualityDefect).where(QualityDefect.inspection_id == insp.id)
    defects = list((await session.scalars(defects_query)).all())

    return InspectionResponse(
        id=insp.id,
        inspection_code=insp.inspection_code,
        work_order_code=wo.work_order_code if wo else None,
        inspected_by=inspector.display_name if inspector else None,
        inspected_at=insp.inspected_at,
        inspected_quantity=insp.inspected_quantity,
        defect_quantity=insp.defect_quantity,
        status=insp.status,
        notes=insp.notes,
        defects=[
            DefectResponse(
                id=d.id,
                defect_type=d.defect_type,
                quantity=d.quantity,
                severity=d.severity,
                notes=d.notes,
            )
            for d in defects
        ],
    )



# =============================================================================
# Audit Log Read
# =============================================================================

async def list_audit_logs(
    session: AsyncSession,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[dict[str, object]]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    query = query.offset((page - 1) * page_size).limit(page_size)
    logs = list((await session.scalars(query)).all())
    return [
        {
            "id": str(log.id),
            "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "before_data": log.before_data,
            "after_data": log.after_data,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
