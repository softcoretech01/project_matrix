# backend/app/schemas/module.py
from pydantic import BaseModel
from typing import Optional

class ModuleBase(BaseModel):
    projectId: str
    name: str
    description: Optional[str] = None
    sortOrder: Optional[int] = 1

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    projectId: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sortOrder: Optional[int] = None

class ModuleOut(ModuleBase):
    id: str

    class Config:
        from_attributes = True

