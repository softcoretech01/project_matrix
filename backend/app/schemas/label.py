# backend/app/schemas/label.py
from pydantic import BaseModel
from typing import Optional

class LabelBase(BaseModel):
    name: str
    color: Optional[str] = "#38bdf8"
    status: Optional[str] = "Active"

class LabelCreate(LabelBase):
    pass

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None

class LabelOut(LabelBase):
    id: str

    class Config:
        from_attributes = True

