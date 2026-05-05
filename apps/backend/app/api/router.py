from fastapi import APIRouter

from app.api.v1 import admin, auth, catalog, employees, health, inventory, labels, operations, partners, quality, reports, settings, styles, suppliers, tasks, users, work_orders

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
