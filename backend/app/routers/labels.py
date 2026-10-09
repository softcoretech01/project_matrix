# backend/app/routers/labels.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.label import Label
from app.schemas.label import LabelCreate, LabelUpdate, LabelOut

router = APIRouter(prefix="/labels", tags=["Labels / Task Types"])

@router.get("", response_model=List[LabelOut])
def get_labels(db: Session = Depends(get_db)):
    return db.query(Label).all()

@router.post("", response_model=LabelOut)
def create_label(lbl_in: LabelCreate, db: Session = Depends(get_db)):
    count = db.query(Label).count()
    new_id = f"LBL-{str(count + 1).zfill(2)}"
    label = Label(
        id=new_id,
        name=lbl_in.name,
        color=lbl_in.color or "#38bdf8",
        status=lbl_in.status or "Active"
    )
    db.add(label)
    db.commit()
    db.refresh(label)
    return label

@router.put("/{label_id}", response_model=LabelOut)
def update_label(label_id: str, lbl_in: LabelUpdate, db: Session = Depends(get_db)):
    lbl = db.query(Label).filter(Label.id == label_id).first()
    if not lbl:
        raise HTTPException(status_code=404, detail="Label not found")

    if lbl_in.name is not None:
        lbl.name = lbl_in.name
    if lbl_in.color is not None:
        lbl.color = lbl_in.color
    if lbl_in.status is not None:
        lbl.status = lbl_in.status

    db.commit()
    db.refresh(lbl)
    return lbl

@router.delete("/{label_id}")
def delete_label(label_id: str, db: Session = Depends(get_db)):
    lbl = db.query(Label).filter(Label.id == label_id).first()
    if not lbl:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(lbl)
    db.commit()
    return {"success": True, "message": "Label deleted"}

