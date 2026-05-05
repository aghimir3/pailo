"""Employee management API endpoints for Pailo."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import Employee
from app.modules.factory.service import MANAGER_ROLES


router = APIRouter()


class EmployeeRecord(BaseModel):
    id: str
    employee_code: str
    full_name: str
    phone: str | None = None
    department: str | None = None
    job_title: str | None = None
    wage_type: str | None = None
    wage_rate_npr: Decimal | None = None
    start_date: str | None = None
    status: str
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None


class EmployeeCreateRequest(BaseModel):
    full_name: str
    phone: str | None = None
    department: str | None = None
    job_title: str | None = None
    wage_type: str | None = None
    wage_rate_npr: Decimal | None = None
    start_date: date | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None


class EmployeeUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    department: str | None = None
    job_title: str | None = None
    wage_type: str | None = None
    wage_rate_npr: Decimal | None = None
    start_date: date | None = None
    status: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None


def _employee_to_record(e: Employee) -> EmployeeRecord:
    return EmployeeRecord(
        id=str(e.id),
        employee_code=e.employee_code,
        full_name=e.full_name,
        phone=e.phone,
        department=e.department,
        job_title=e.job_title,
        wage_type=e.wage_type,
        wage_rate_npr=e.wage_rate_npr,
        start_date=e.start_date.isoformat() if e.start_date else None,
        status=e.status,
        address=e.address,
        emergency_contact_name=e.emergency_contact_name,
        emergency_contact_phone=e.emergency_contact_phone,
        notes=e.notes,
    )


async def _next_employee_code(session: DbSession) -> str:
    count = await session.scalar(select(func.count()).select_from(Employee))
    return f"EMP-{int(count or 0) + 1:04d}"


@router.get("", response_model=list[EmployeeRecord])
async def list_employees(session: DbSession, user: CurrentUser) -> list[EmployeeRecord]:
    """List all employees. Manager roles only."""
    if user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    employees = list(
        (await session.scalars(select(Employee).order_by(Employee.full_name))).all()
    )
    return [_employee_to_record(e) for e in employees]


@router.get("/{employee_id}", response_model=EmployeeRecord)
async def get_employee(
    employee_id: str, session: DbSession, user: CurrentUser
) -> EmployeeRecord:
    """Get a single employee. Manager roles only."""
    if user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    employee = await session.get(Employee, UUID(employee_id))
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _employee_to_record(employee)


@router.post("", response_model=EmployeeRecord, status_code=201)
async def create_employee(
    payload: EmployeeCreateRequest, session: DbSession, user: CurrentUser
) -> EmployeeRecord:
    """Create a new employee. Only owner_admin."""
    if user.role != "owner_admin":
        raise HTTPException(status_code=403, detail="Only owner_admin can create employees")

    full_name = payload.full_name.strip()
    if len(full_name) < 2:
        raise HTTPException(status_code=422, detail="Full name must be at least 2 characters")

    employee = Employee(
        employee_code=await _next_employee_code(session),
        full_name=full_name,
        phone=payload.phone.strip() if payload.phone else None,
        department=payload.department.strip() if payload.department else None,
        job_title=payload.job_title.strip() if payload.job_title else None,
        wage_type=payload.wage_type,
        wage_rate_npr=payload.wage_rate_npr,
        start_date=payload.start_date,
        address=payload.address.strip() if payload.address else None,
        emergency_contact_name=(
            payload.emergency_contact_name.strip() if payload.emergency_contact_name else None
        ),
        emergency_contact_phone=(
            payload.emergency_contact_phone.strip() if payload.emergency_contact_phone else None
        ),
        notes=payload.notes.strip() if payload.notes else None,
        status="active",
    )
    session.add(employee)
    await session.commit()
    await session.refresh(employee)
    return _employee_to_record(employee)


@router.patch("/{employee_id}", response_model=EmployeeRecord)
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    session: DbSession,
    user: CurrentUser,
) -> EmployeeRecord:
    """Update an employee's info. Manager roles."""
    if user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    employee = await session.get(Employee, UUID(employee_id))
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.full_name is not None:
        name = payload.full_name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=422, detail="Full name must be at least 2 characters")
        employee.full_name = name
    if "phone" in payload.model_fields_set:
        employee.phone = payload.phone.strip() if payload.phone else None
    if "department" in payload.model_fields_set:
        employee.department = payload.department.strip() if payload.department else None
    if "job_title" in payload.model_fields_set:
        employee.job_title = payload.job_title.strip() if payload.job_title else None
    if "wage_type" in payload.model_fields_set:
        employee.wage_type = payload.wage_type
    if "wage_rate_npr" in payload.model_fields_set:
        employee.wage_rate_npr = payload.wage_rate_npr
    if "start_date" in payload.model_fields_set:
        employee.start_date = payload.start_date
    if "status" in payload.model_fields_set and payload.status is not None:
        if payload.status not in ("active", "inactive", "probation"):
            raise HTTPException(
                status_code=400, detail="Status must be 'active', 'inactive', or 'probation'"
            )
        employee.status = payload.status
    if "address" in payload.model_fields_set:
        employee.address = payload.address.strip() if payload.address else None
    if "emergency_contact_name" in payload.model_fields_set:
        employee.emergency_contact_name = (
            payload.emergency_contact_name.strip() if payload.emergency_contact_name else None
        )
    if "emergency_contact_phone" in payload.model_fields_set:
        employee.emergency_contact_phone = (
            payload.emergency_contact_phone.strip() if payload.emergency_contact_phone else None
        )
    if "notes" in payload.model_fields_set:
        employee.notes = payload.notes.strip() if payload.notes else None

    await session.commit()
    await session.refresh(employee)
    return _employee_to_record(employee)


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: str, session: DbSession, user: CurrentUser
) -> None:
    """Soft-delete an employee (set status=inactive). Only owner_admin."""
    if user.role != "owner_admin":
        raise HTTPException(status_code=403, detail="Only owner_admin can delete employees")

    employee = await session.get(Employee, UUID(employee_id))
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.status = "inactive"
    await session.commit()
