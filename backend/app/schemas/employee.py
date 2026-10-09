# backend/app/schemas/employee.py
from pydantic import BaseModel
from typing import Optional

class EmployeeBase(BaseModel):
    name: str
    email: str
    role: Optional[str] = "Employee"
    designation: Optional[str] = "Engineer"
    department: Optional[str] = "Engineering"
    status: Optional[str] = "Active"
    code: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    password: Optional[str] = "password123"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    code: Optional[str] = None
    password: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: str

    class Config:
        from_attributes = True

