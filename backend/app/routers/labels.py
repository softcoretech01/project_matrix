from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import random

from backend.app.db.database import get_db
from backend.app.models.models import Label

router = APIRouter(prefix="/api/labels", tags=["labels"])

class LabelCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"

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
        color=data.color or "#6366f1"
    )
    db.add(label)
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
    return {"message": "Label deleted successfully"}

