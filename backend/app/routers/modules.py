# backend/app/routers/modules.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import Module

router = APIRouter(prefix="/api/modules", tags=["Modules / Sections"])

class ModuleCreate(BaseModel):
    projectId: str
    name: str
    description: Optional[str] = None
    sortOrder: Optional[int] = 1

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sortOrder: Optional[int] = None

@router.get("")
def get_modules(projectId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Module)
    if projectId:
        query = query.filter(Module.project_id == projectId)
    modules = query.order_by(Module.sort_order).all()
    return [m.to_dict() for m in modules]

@router.post("")
def create_module(mod_in: ModuleCreate, db: Session = Depends(get_db)):
    count = db.query(Module).count()
    new_id = f"MOD-{str(count + 1).zfill(2)}"
    module = Module(
        id=new_id,
        project_id=mod_in.projectId,
        name=mod_in.name,
        description=mod_in.description or "",
        sort_order=mod_in.sortOrder or 1
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module.to_dict()

@router.put("/{module_id}")
def update_module(module_id: str, mod_in: ModuleUpdate, db: Session = Depends(get_db)):
    m = db.query(Module).filter(Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")

    if mod_in.name is not None:
        m.name = mod_in.name
    if mod_in.description is not None:
        m.description = mod_in.description
    if mod_in.sortOrder is not None:
        m.sort_order = mod_in.sortOrder

    db.commit()
    db.refresh(m)
    return m.to_dict()

@router.delete("/{module_id}")
def delete_module(module_id: str, db: Session = Depends(get_db)):
    m = db.query(Module).filter(Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(m)
    db.commit()
    return {"success": True, "message": "Module deleted"}
