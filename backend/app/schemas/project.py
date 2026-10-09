# backend/app/schemas/project.py
from pydantic import BaseModel
from typing import Optional, List

class ProjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    ownerId: Optional[str] = None
    status: Optional[str] = "Active"
    reviewRequired: Optional[bool] = True
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    ownerId: Optional[str] = None
    status: Optional[str] = None
    reviewRequired: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class ProjectOut(ProjectBase):
    id: str

    class Config:
        from_attributes = True

class ProjectMemberAdd(BaseModel):
    employeeId: str
    role: Optional[str] = "Member"

class ProjectMemberOut(BaseModel):
    id: str
    projectId: str
    employeeId: str
    role: str

    class Config:
        from_attributes = True

