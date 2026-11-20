# backend/app/routers/camera.py
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import CameraActivityLog, User
from backend.app.core.deps import get_current_user, require_roles
from backend.app.core.storage import save_base64_image, save_upload, VIDEO_EXTS, MAX_VIDEO_BYTES

router = APIRouter(prefix="/api/camera", tags=["camera"])


class CameraCapture(BaseModel):
    image: str                       # base64 data URL
    taskId: Optional[str] = ""
    projectId: Optional[str] = ""
    activityType: Optional[str] = "capture"


@router.post("")
def capture(body: CameraCapture, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = save_base64_image(body.image, "camera")
    log = CameraActivityLog(
        user_id=current_user.id, project_id=body.projectId or None, task_id=body.taskId or None,
        filename=saved["filename"], filepath=saved["filepath"],
        activity_type=body.activityType or "capture", captured_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log.to_dict()


@router.post("/video")
def capture_video(file: UploadFile = File(...), taskId: str = Form(""), projectId: str = Form(""),
                  activityType: str = Form("video-capture"),
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = save_upload(file, "camera", allowed=VIDEO_EXTS, max_bytes=MAX_VIDEO_BYTES)
    log = CameraActivityLog(
        user_id=current_user.id, project_id=projectId or None, task_id=taskId or None,
        filename=saved["filename"], filepath=saved["filepath"],
        activity_type=activityType or "video-capture", captured_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log.to_dict()


@router.get("")
def list_logs(userId: Optional[str] = None, date: Optional[str] = None, search: Optional[str] = None,
              current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    q = db.query(CameraActivityLog)
    if userId:
        q = q.filter(CameraActivityLog.user_id == userId)
    if date:
        q = q.filter(CameraActivityLog.captured_at >= f"{date} 00:00:00",
                     CameraActivityLog.captured_at <= f"{date} 23:59:59")
    logs = q.order_by(CameraActivityLog.captured_at.desc()).limit(500).all()
    out = [l.to_dict() for l in logs]
    if search:
        s = search.lower()
        out = [d for d in out if s in (d["employeeName"] or "").lower()
               or s in (d["taskId"] or "").lower() or s in (d["projectId"] or "").lower()]
    return out
