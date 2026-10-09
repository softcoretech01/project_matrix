# backend/app/schemas/master.py
from pydantic import BaseModel
from typing import Optional

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    status: Optional[str] = "Active"

class ClientOut(ClientCreate):
    id: str
    class Config:
        from_attributes = True

class DepartmentCreate(BaseModel):
    name: str
    status: Optional[str] = "Active"

class DepartmentOut(DepartmentCreate):
    id: str
    class Config:
        from_attributes = True

class DesignationCreate(BaseModel):
    name: str
    status: Optional[str] = "Active"

class DesignationOut(DesignationCreate):
    id: str
    class Config:
        from_attributes = True

