from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.db.database import get_db
from backend.app.models.models import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("")
def get_notifications(userId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Notification)
    if userId:
        query = query.filter((Notification.user_id == userId) | (Notification.user_id == ""))
    notifications = query.order_by(Notification.created_at.desc()).limit(30).all()
    return [n.to_dict() for n in notifications]

@router.put("/read-all")
def mark_all_read(userId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Notification)
    if userId:
        query = query.filter(Notification.user_id == userId)
    query.update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}

