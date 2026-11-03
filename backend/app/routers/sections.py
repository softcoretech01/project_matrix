from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import random

from backend.app.db.database import get_db
from backend.app.models.models import Section

router = APIRouter(prefix="/api/sections", tags=["sections"])

class SectionCreate(BaseModel):
    projectId: str
    name: str
    sortOrder: Optional[int] = 0

@router.get("")
def get_sections(projectId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Section)
    if projectId:
        query = query.filter(Section.project_id == projectId)
    sections = query.order_by(Section.sort_order.asc()).all()
    return [s.to_dict() for s in sections]

@router.post("")
def create_section(data: SectionCreate, db: Session = Depends(get_db)):
    count = db.query(Section).count() + 1
    new_id = f"SEC-{count:02d}"
    while db.query(Section).filter(Section.id == new_id).first():
        new_id = f"SEC-{random.randint(10, 99)}"

    section = Section(
        id=new_id,
        project_id=data.projectId,
        name=data.name,
        sort_order=data.sortOrder or 0
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section.to_dict()

@router.delete("/{section_id}")
def delete_section(section_id: str, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()
    return {"message": "Section deleted successfully"}

