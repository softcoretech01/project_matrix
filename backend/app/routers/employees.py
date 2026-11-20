# backend/app/routers/employees.py
import re
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import User, Role
from backend.app.core.security import get_password_hash
from backend.app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/employees", tags=["employees"])

VALID_ROLES = {"Admin", "Master", "Worker"}


class EmployeeCreate(BaseModel):
    name: str
    email: str
    password: Optional[str] = "worker123"
    role: Optional[str] = "Worker"
    designation: Optional[str] = "Team Member"
    department: Optional[str] = "Engineering"
    phone: Optional[str] = None
    code: Optional[str] = None
    status: Optional[str] = "Active"


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None


def _role_id(db: Session, role_name: str) -> Optional[int]:
    r = db.query(Role).filter(Role.name == role_name).first()
    return r.id if r else None


def _next_user_id(db: Session) -> str:
    n = db.query(User).count() + 1
    new_id = f"U-{str(n).zfill(4)}"
    while db.query(User).filter(User.id == new_id).first():
        new_id = f"U-{random.randint(1000, 999999)}"
    return new_id


@router.get("")
def get_employees(search: Optional[str] = None,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    q = db.query(User)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter((User.name.ilike(term)) | (User.email.ilike(term)) |
                     (User.designation.ilike(term)) | (User.department.ilike(term)))
    return [u.to_dict() for u in q.order_by(User.created_at.desc()).all()]


@router.get("/{employee_id}")
def get_employee(employee_id: str, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    emp = db.query(User).filter(User.id == str(employee_id)).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp.to_dict()


@router.post("")
def create_employee(data: EmployeeCreate,
                    current_user: User = Depends(require_roles(["Admin", "Master"])),
                    db: Session = Depends(get_db)):
    email = (data.email or "").strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="A valid email is required")
    if db.query(User).filter(User.email.ilike(email)).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    role = data.role if data.role in VALID_ROLES else "Worker"
    # Only Admin may create Admin/Master accounts
    if role in ("Admin", "Master") and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only an Admin can create Admin or Master accounts")

    new_id = _next_user_id(db)
    count = db.query(User).count() + 1
    user = User(
        id=new_id,
        code=data.code or f"EMP-{str(count).zfill(3)}",
        name=data.name,
        email=email,
        password=get_password_hash(data.password or "worker123"),
        role=role,
        role_id=_role_id(db, role),
        designation=data.designation or "Team Member",
        department=data.department or "Engineering",
        phone=data.phone,
        status=data.status or "Active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.put("/{employee_id}")
def update_employee(employee_id: str, data: EmployeeUpdate,
                    current_user: User = Depends(require_roles(["Admin", "Master"])),
                    db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == str(employee_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.email is not None:
        email = data.email.strip()
        clash = db.query(User).filter(User.email.ilike(email), User.id != user.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="Another user already uses this email")
        user.email = email
    if data.name is not None:
        user.name = data.name
    if data.password:
        user.password = get_password_hash(data.password)
    if data.role is not None and data.role in VALID_ROLES:
        if data.role in ("Admin", "Master") and current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Only an Admin can assign Admin or Master roles")
        user.role = data.role
        user.role_id = _role_id(db, data.role)
    if data.designation is not None:
        user.designation = data.designation
    if data.department is not None:
        user.department = data.department
    if data.phone is not None:
        user.phone = data.phone
    if data.status is not None:
        user.status = data.status

    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.delete("/{employee_id}")
def delete_employee(employee_id: str,
                    current_user: User = Depends(require_roles(["Admin"])),
                    db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == str(employee_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"success": True, "message": "Employee deleted successfully"}
