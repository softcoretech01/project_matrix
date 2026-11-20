# backend/app/routers/profile.py
"""Employee-initiated profile changes (email / phone) that require Admin approval."""
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import ProfileChangeRequest, User, Notification
from backend.app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/profile", tags=["profile"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED = {"email", "phone"}


class ChangeReq(BaseModel):
    field: str
    newValue: str


class RejectReq(BaseModel):
    reason: Optional[str] = ""


@router.post("/change-request")
def create_request(body: ChangeReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = (body.field or "").strip().lower()
    if field not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only email or phone can be changed")
    new_val = (body.newValue or "").strip()
    if not new_val:
        raise HTTPException(status_code=400, detail="New value is required")
    if field == "email":
        if not EMAIL_RE.match(new_val):
            raise HTTPException(status_code=400, detail="Enter a valid email address")
        clash = db.query(User).filter(User.email.ilike(new_val), User.id != current_user.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="That email is already in use")

    old_val = current_user.email if field == "email" else (current_user.phone or "")
    if str(old_val) == new_val:
        raise HTTPException(status_code=400, detail=f"That is already your current {field}")

    # supersede any existing pending request for the same field
    db.query(ProfileChangeRequest).filter(
        ProfileChangeRequest.user_id == current_user.id,
        ProfileChangeRequest.field == field,
        ProfileChangeRequest.status == "Pending",
    ).update({ProfileChangeRequest.status: "Cancelled"}, synchronize_session=False)

    req = ProfileChangeRequest(user_id=current_user.id, field=field, old_value=str(old_val),
                               new_value=new_val, status="Pending", requested_at=datetime.utcnow())
    db.add(req)
    db.add(Notification(user_id=None, type="approval", title="Profile Change Request",
                        message=f"{current_user.name} requested to change their {field} to '{new_val}'."))
    db.commit()
    db.refresh(req)
    return req.to_dict()


@router.get("/my-requests")
def my_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(ProfileChangeRequest)
            .filter(ProfileChangeRequest.user_id == current_user.id)
            .order_by(ProfileChangeRequest.requested_at.desc()).all())
    return [r.to_dict() for r in rows]


@router.get("/change-requests")
def list_requests(status: Optional[str] = None,
                  current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    q = db.query(ProfileChangeRequest)
    if status and status not in ("All", ""):
        q = q.filter(ProfileChangeRequest.status == status)
    rows = q.order_by(ProfileChangeRequest.requested_at.desc()).all()
    return [r.to_dict() for r in rows]


@router.get("/change-requests/pending-count")
def pending_count(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    return {"count": db.query(ProfileChangeRequest).filter(ProfileChangeRequest.status == "Pending").count()}


@router.put("/change-requests/{req_id}/approve")
def approve(req_id: int, current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    r = db.query(ProfileChangeRequest).filter(ProfileChangeRequest.id == req_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    user = db.query(User).filter(User.id == r.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if r.field == "email":
        clash = db.query(User).filter(User.email.ilike(r.new_value), User.id != user.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="That email is now used by another account")
        user.email = r.new_value
    elif r.field == "phone":
        user.phone = r.new_value
    r.status = "Approved"
    r.reviewed_by = current_user.id
    r.reviewed_at = datetime.utcnow()
    db.add(Notification(user_id=r.user_id, type="approval", title="Change Approved",
                        message=f"Your {r.field} change to '{r.new_value}' was approved."))
    db.commit()
    db.refresh(r)
    return r.to_dict()


@router.put("/change-requests/{req_id}/reject")
def reject(req_id: int, body: RejectReq, current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    r = db.query(ProfileChangeRequest).filter(ProfileChangeRequest.id == req_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    r.status = "Rejected"
    r.reason = (body.reason or "").strip()
    r.reviewed_by = current_user.id
    r.reviewed_at = datetime.utcnow()
    db.add(Notification(user_id=r.user_id, type="approval", title="Change Rejected",
                        message=f"Your {r.field} change was rejected." + (f" Reason: {r.reason}" if r.reason else "")))
    db.commit()
    db.refresh(r)
    return r.to_dict()
