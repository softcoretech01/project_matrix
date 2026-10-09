# backend/app/routers/modules.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.module import Module
from app.schemas.module import ModuleCreate, ModuleUpdate, ModuleOut

router = APIRouter(prefix="/modules", tags=["Modules / Sections"])

@router.get("", response_model=List[ModuleOut])
def get_modules(projectId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Module)
    if projectId:
        query = query.filter(Module.project_id == projectId)
    modules = query.order_by(Module.sort_order).all()
    return [
        ModuleOut(
            id=m.id,
            projectId=m.project_id,
            name=m.name,
            description=m.description,
            sortOrder=m.sort_order
        )
        for m in modules
    ]

@router.post("", response_model=ModuleOut)
def create_module(mod_in: ModuleCreate, db: Session = Depends(get_db)):
    count = db.query(Module).count()
    new_id = f"MOD-{str(count + 1).zfill(2)}"
    module = Module(
        id=new_id,
        project_id=mod_in.projectId,
        name=mod_in.name,
        description=mod_in.description,
        sort_order=mod_in.sortOrder or 1
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return ModuleOut(
        id=module.id,
        projectId=module.project_id,
        name=module.name,
        description=module.description,
        sortOrder=module.sort_order
    )

@router.put("/{module_id}", response_model=ModuleOut)
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
    if mod_in.projectId is not None:
        m.project_id = mod_in.projectId

    db.commit()
    db.refresh(m)
    return ModuleOut(
        id=m.id,
        projectId=m.project_id,
        name=m.name,
        description=m.description,
        sortOrder=m.sort_order
    )

@router.delete("/{module_id}")
def delete_module(module_id: str, db: Session = Depends(get_db)):
    m = db.query(Module).filter(Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(m)
    db.commit()
    return {"success": True, "message": "Module deleted"}

