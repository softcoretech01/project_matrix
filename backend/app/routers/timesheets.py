# backend/app/routers/timesheets.py
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import (
    Timesheet, TimesheetAttachment, Task, Project, User, Notification, CameraActivityLog,
)
from backend.app.core.deps import get_current_user
from backend.app.core.storage import save_upload, save_base64_image, delete_file, IMAGE_EXTS, DOC_EXTS

router = APIRouter(prefix="/api/timesheets", tags=["timesheets"])

MAX_IMAGES = 5
MAX_DOCS = 5
IMAGE_SOURCES = ("upload", "camera")
MAX_REMARK_WORDS = 3000


class TimesheetCreate(BaseModel):
    projectId: Optional[str] = ""
    taskId: Optional[str] = ""
    workDate: Optional[str] = ""
    fromTime: Optional[str] = ""
    toTime: Optional[str] = ""
    totalHours: Optional[float] = None
    remarks: Optional[str] = ""


class StatusUpdate(BaseModel):
    status: str


class CameraCapture(BaseModel):
    image: str          # base64 data URL
    taskId: Optional[str] = ""
    projectId: Optional[str] = ""


def _parse_time(s: str):
    s = (s or "").strip()
    for fmt in ("%I:%M %p", "%H:%M", "%I:%M%p"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _compute_hours(from_time: str, to_time: str, fallback):
    a, b = _parse_time(from_time), _parse_time(to_time)
    if a and b:
        diff = (b - a).total_seconds() / 3600.0
        if diff < 0:
            diff += 24
        return round(diff, 2)
    return fallback or 0


def _word_count(text: str) -> int:
    return len((text or "").split())


@router.get("")
def list_timesheets(userId: Optional[str] = None, projectId: Optional[str] = None,
                    taskId: Optional[str] = None, dateFrom: Optional[str] = None,
                    dateTo: Optional[str] = None, search: Optional[str] = None,
                    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Timesheet)
    if current_user.role == "Worker":
        q = q.filter(Timesheet.user_id == current_user.id)
    elif userId:
        q = q.filter(Timesheet.user_id == userId)
    if projectId:
        q = q.filter(Timesheet.project_id == projectId)
    if taskId:
        q = q.filter(Timesheet.task_id == taskId)
    if dateFrom:
        q = q.filter(Timesheet.work_date >= dateFrom)
    if dateTo:
        q = q.filter(Timesheet.work_date <= dateTo)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter((Timesheet.remarks.ilike(term)) | (Timesheet.id.ilike(term)))
    items = q.order_by(Timesheet.work_date.desc(), Timesheet.created_at.desc()).all()
    return [t.to_dict() for t in items]


@router.post("")
def create_timesheet(data: TimesheetCreate, current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    if _word_count(data.remarks) > MAX_REMARK_WORDS:
        raise HTTPException(status_code=400, detail=f"Remarks exceed {MAX_REMARK_WORDS} words")
    if not data.taskId and not data.projectId:
        raise HTTPException(status_code=400, detail="Select a task or project")

    n = db.query(Timesheet).count() + 1
    new_id = f"TS-{n:04d}"
    while db.query(Timesheet).filter(Timesheet.id == new_id).first():
        new_id = f"TS-{random.randint(1000, 999999)}"

    # Derive project from task if not provided
    project_id = data.projectId or ""
    if data.taskId and not project_id:
        task = db.query(Task).filter(Task.id == data.taskId).first()
        if task:
            project_id = task.project_id or ""

    ts = Timesheet(
        id=new_id, code=new_id, user_id=current_user.id, project_id=project_id or None,
        task_id=data.taskId or None, work_date=data.workDate or datetime.utcnow().strftime("%Y-%m-%d"),
        from_time=data.fromTime or "", to_time=data.toTime or "",
        total_hours=_compute_hours(data.fromTime, data.toTime, data.totalHours),
        remarks=data.remarks or "", status="Submitted",
    )
    db.add(ts)
    # notify reviewer/admins
    db.add(Notification(user_id=None, type="timesheet", title="Timesheet Submitted",
                        message=f"{current_user.name} submitted a timesheet ({ts.total_hours}h)."))
    db.commit()
    db.refresh(ts)
    return ts.to_dict()


@router.get("/{ts_id}")
def get_timesheet(ts_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if current_user.role == "Worker" and ts.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not permitted")
    return ts.to_dict()


@router.put("/{ts_id}/status")
def update_status(ts_id: str, body: StatusUpdate,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Only Admin/Master can review timesheets")
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    ts.status = body.status
    db.add(Notification(user_id=ts.user_id, type="timesheet", title="Timesheet " + body.status,
                        message=f"Your timesheet {ts.id} was {body.status.lower()}."))
    db.commit()
    return ts.to_dict()


@router.delete("/{ts_id}")
def delete_timesheet(ts_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if current_user.role == "Worker" and ts.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not permitted")
    for a in ts.attachments:
        delete_file("timesheets", a.filename)
    db.delete(ts)
    db.commit()
    return {"success": True}


# ---------- images ----------
@router.post("/{ts_id}/images")
def upload_image(ts_id: str, file: UploadFile = File(...),
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if db.query(TimesheetAttachment).filter(TimesheetAttachment.timesheet_id == ts_id,
                                             TimesheetAttachment.source.in_(IMAGE_SOURCES)).count() >= MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_IMAGES} images per timesheet")
    saved = save_upload(file, "timesheets", allowed=IMAGE_EXTS)
    att = TimesheetAttachment(timesheet_id=ts_id, filename=saved["filename"],
                              filepath=saved["filepath"], source="upload")
    db.add(att)
    db.commit()
    db.refresh(att)
    return att.to_dict()


@router.post("/{ts_id}/camera")
def capture_camera(ts_id: str, body: CameraCapture,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if db.query(TimesheetAttachment).filter(TimesheetAttachment.timesheet_id == ts_id,
                                             TimesheetAttachment.source.in_(IMAGE_SOURCES)).count() >= MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_IMAGES} images per timesheet")
    saved = save_base64_image(body.image, "timesheets")
    att = TimesheetAttachment(timesheet_id=ts_id, filename=saved["filename"],
                              filepath=saved["filepath"], source="camera")
    db.add(att)
    # also log camera activity
    db.add(CameraActivityLog(user_id=current_user.id, project_id=ts.project_id, task_id=ts.task_id,
                             timesheet_id=ts_id, filename=saved["filename"], filepath=saved["filepath"],
                             activity_type="timesheet-capture", captured_at=datetime.utcnow()))
    db.commit()
    db.refresh(att)
    return att.to_dict()


# ---------- documents (Excel / PDF / Word / CSV …) ----------
@router.post("/{ts_id}/files")
def upload_document(ts_id: str, file: UploadFile = File(...),
                    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if db.query(TimesheetAttachment).filter(TimesheetAttachment.timesheet_id == ts_id,
                                            TimesheetAttachment.source == "file").count() >= MAX_DOCS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_DOCS} files per timesheet")
    saved = save_upload(file, "timesheets", allowed=DOC_EXTS)
    att = TimesheetAttachment(timesheet_id=ts_id, filename=saved["filename"],
                              filepath=saved["filepath"], source="file",
                              original_name=file.filename or saved["filename"])
    db.add(att)
    db.commit()
    db.refresh(att)
    return att.to_dict()


@router.delete("/images/{image_id}")
def delete_image(image_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(TimesheetAttachment).filter(TimesheetAttachment.id == image_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Image not found")
    delete_file("timesheets", att.filename)
    db.delete(att)
    db.commit()
    return {"success": True}
