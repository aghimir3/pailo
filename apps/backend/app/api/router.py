from fastapi import APIRouter

from app.api.v1 import health, inventory, labels, operations, quality, reports, tasks, work_orders

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(quality.router, prefix="/quality", tags=["quality"])
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])
