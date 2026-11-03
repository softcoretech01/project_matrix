# backend/app/routers/labels.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import random

from backend.app.db.database import get_db
from backend.app.models.models import Label

router = APIRouter(prefix="/api/labels", tags=["labels"])

class LabelCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    status: Optional[str] = "Active"

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None

@router.get("")
def get_labels(db: Session = Depends(get_db)):
    labels = db.query(Label).all()
    return [l.to_dict() for l in labels]

@router.post("")
def create_label(data: LabelCreate, db: Session = Depends(get_db)):
    count = db.query(Label).count() + 1
    new_id = f"LBL-{count:02d}"
    while db.query(Label).filter(Label.id == new_id).first():
        new_id = f"LBL-{random.randint(10, 99)}"

    label = Label(
        id=new_id,
        name=data.name,
        color=data.color or "#6366f1",
        status=data.status or "Active"
    )
    db.add(label)
    db.commit()
    db.refresh(label)
    return label.to_dict()

@router.put("/{label_id}")
def update_label(label_id: str, data: LabelUpdate, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    if data.name is not None:
        label.name = data.name
    if data.color is not None:
        label.color = data.color
    if data.status is not None:
        label.status = data.status

    db.commit()
    db.refresh(label)
    return label.to_dict()

@router.delete("/{label_id}")
def delete_label(label_id: str, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
    return {"success": True, "message": "Label deleted successfully"}
