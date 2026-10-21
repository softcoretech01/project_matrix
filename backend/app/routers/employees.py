from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import random

from backend.app.db.database import get_db
from backend.app.models.models import User

router = APIRouter(prefix="/api/employees", tags=["employees"])

class EmployeeCreate(BaseModel):
    name: str
    email: str
    password: Optional[str] = "admin123"
    role: Optional[str] = "Employee"
    designation: Optional[str] = "Engineer"
    status: Optional[str] = "Active"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None

@router.get("")
def get_employees(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [u.to_dict() for u in users]

@router.post("")
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    count = db.query(User).count() + 1
    new_id = str(count)
    while db.query(User).filter(User.id == new_id).first():
        new_id = str(random.randint(10, 9999))

    user = User(
        id=new_id,
        name=data.name,
        email=data.email.strip(),
        password=data.password or "admin123",
        role=data.role or "Employee",
        designation=data.designation or "Engineer",
        status=data.status or "Active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.put("/{emp_id}")
def update_employee(emp_id: str, data: EmployeeUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == emp_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.name is not None: user.name = data.name
    if data.email is not None: user.email = data.email
    if data.role is not None: user.role = data.role
    if data.designation is not None: user.designation = data.designation
    if data.status is not None: user.status = data.status

    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.delete("/{emp_id}")
def delete_employee(emp_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == emp_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(user)
    db.commit()
    return {"message": "Employee deleted successfully"}

