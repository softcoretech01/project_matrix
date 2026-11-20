from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import Notification, User
from backend.app.core.deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _visible(query, user: User):
    # Admin sees everyone's + broadcast; others see their own + broadcast
    if user.role == "Admin":
        return query
    return query.filter((Notification.user_id == user.id) | (Notification.user_id.is_(None)))


@router.get("")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = _visible(db.query(Notification), current_user)
    items = q.order_by(Notification.created_at.desc()).limit(50).all()
    return [n.to_dict() for n in items]


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = _visible(db.query(Notification).filter(Notification.is_read == False), current_user)  # noqa: E712
    return {"count": q.count()}


@router.put("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _visible(db.query(Notification), current_user).update({Notification.is_read: True},
                                                          synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


@router.put("/{notification_id}/read")
def mark_read(notification_id: int, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "ok"}
