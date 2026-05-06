from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    catalog,
    costing,
    cycle_counts,
    employees,
    health,
    inventory,
    labels,
    operations,
    partners,
    production,
    productivity,
    purchasing,
    quality,
    reports,
    sales,
    settings,
    styles,
    suppliers,
    tasks,
    users,
    work_orders,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(quality.router, prefix="/quality", tags=["quality"])
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(partners.router, prefix="/partners", tags=["partners"])
api_router.include_router(styles.router, prefix="/styles", tags=["styles"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(purchasing.router, prefix="/purchasing", tags=["purchasing"])
api_router.include_router(costing.router, prefix="/costing", tags=["costing"])
api_router.include_router(production.router, prefix="/production", tags=["production"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(cycle_counts.router, prefix="/inventory-ext", tags=["inventory-ext"])
api_router.include_router(productivity.router, prefix="/productivity", tags=["productivity"])
