# backend/app/routers/employees.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/employees", tags=["Employees / Users"])

@router.get("", response_model=List[EmployeeOut])
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(User).all()
    return employees

@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(User).filter(User.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@router.post("", response_model=EmployeeOut)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == emp_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    count = db.query(User).count()
    new_id = str(count + 1)
    new_code = emp_in.code or f"EMP-{str(count + 1).padStart(3, '0')}" if hasattr(str, 'padStart') else f"EMP-{str(count + 1).zfill(3)}"

    user = User(
        id=new_id,
        code=new_code,
        name=emp_in.name,
        email=emp_in.email,
        password=emp_in.password or "password123",
        role=emp_in.role or "Employee",
        designation=emp_in.designation or "Engineer",
        department=emp_in.department or "Engineering",
        status=emp_in.status or "Active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: str, emp_in: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(User).filter(User.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if emp_in.name is not None:
        emp.name = emp_in.name
    if emp_in.email is not None:
        emp.email = emp_in.email
    if emp_in.role is not None:
        emp.role = emp_in.role
    if emp_in.designation is not None:
        emp.designation = emp_in.designation
    if emp_in.department is not None:
        emp.department = emp_in.department
    if emp_in.status is not None:
        emp.status = emp_in.status
    if emp_in.password is not None:
        emp.password = emp_in.password

    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{employee_id}")
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(User).filter(User.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"success": True, "message": "Employee deleted"}

