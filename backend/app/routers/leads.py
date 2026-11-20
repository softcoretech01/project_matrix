# backend/app/routers/leads.py
"""Lead contacts attached to a task via Excel bulk-import (Sales & Lead Management)."""
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

from backend.app.db.database import get_db
from backend.app.models.models import Lead, Task, User
from backend.app.core.deps import get_current_user

router = APIRouter(prefix="/api/leads", tags=["leads"])
VALID_STATUS = {"New", "Contacted", "Interested", "Converted", "Lost"}
COLUMNS = ["Name", "Email", "Phone", "Company", "Status", "Source", "Notes"]
HEADER_MAP = {
    "name": "name", "full name": "name", "lead name": "name", "contact name": "name",
    "email": "email", "email address": "email", "e-mail": "email",
    "phone": "phone", "mobile": "phone", "contact": "phone", "phone number": "phone",
    "company": "company", "organization": "company", "organisation": "company",
    "status": "status", "stage": "status",
    "source": "source", "lead source": "source",
    "notes": "notes", "remarks": "notes", "comment": "notes", "comments": "notes",
}


class StatusIn(BaseModel):
    status: str


def _can_access(task: Task, user: User) -> bool:
    return user.role in ("Admin", "Master") or task.assigned_to == user.id


@router.get("")
def list_leads(taskId: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == taskId).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _can_access(task, current_user):
        raise HTTPException(status_code=403, detail="Not permitted")
    leads = db.query(Lead).filter(Lead.task_id == taskId).order_by(Lead.id).all()
    return [l.to_dict() for l in leads]


@router.post("/upload")
def upload_leads(taskId: str, file: UploadFile = File(...),
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == taskId).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _can_access(task, current_user):
        raise HTTPException(status_code=403, detail="Not permitted")
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Please upload an .xlsx file")
    try:
        wb = load_workbook(io.BytesIO(file.file.read()), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the Excel file")
    rows = list(wb.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="The file is empty")

    headers = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
    col_field = {i: HEADER_MAP[h] for i, h in enumerate(headers) if h in HEADER_MAP}
    if "name" not in col_field.values():
        raise HTTPException(status_code=400,
                            detail="This file doesn't match the leads template (a 'Name' column is required). "
                                   "Please download the Template and use it.")

    imported, skipped = 0, 0
    for row in rows[1:]:
        rec = {}
        for i, field in col_field.items():
            if i < len(row) and row[i] is not None:
                rec[field] = str(row[i]).strip()
        name = rec.get("name", "").strip()
        if not name:
            skipped += 1
            continue
        status = rec.get("status", "New")
        status = status if status in VALID_STATUS else "New"
        db.add(Lead(task_id=taskId, name=name, email=rec.get("email", ""), phone=rec.get("phone", ""),
                    company=rec.get("company", ""), status=status, source=rec.get("source", "Excel Import"),
                    notes=rec.get("notes", "")))
        imported += 1
    db.commit()
    return {"success": True, "imported": imported, "skipped": skipped}


@router.get("/template")
def template(current_user: User = Depends(get_current_user)):
    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"
    ws.append(COLUMNS)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="059669")
    ws.append(["Jane Doe", "jane@acme.com", "9876543210", "Acme Corp", "New", "Website", "Interested in demo"])
    ws.append(["John Smith", "john@globex.com", "9988776655", "Globex", "Contacted", "Referral", "Call back next week"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(content=buf.read(),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="Leads_Template.xlsx"'})


@router.get("/export")
def export_leads(taskId: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == taskId).first()
    if not task or not _can_access(task, current_user):
        raise HTTPException(status_code=404, detail="Task not found")
    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"
    ws.append(COLUMNS)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="4F46E5")
    for l in db.query(Lead).filter(Lead.task_id == taskId).order_by(Lead.id).all():
        ws.append([l.name, l.email, l.phone, l.company, l.status, l.source, l.notes])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(content=buf.read(),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="Leads_{date.today().isoformat()}.xlsx"'})


@router.put("/{lead_id}/status")
def update_status(lead_id: int, body: StatusIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    task = db.query(Task).filter(Task.id == lead.task_id).first()
    if task and not _can_access(task, current_user):
        raise HTTPException(status_code=403, detail="Not permitted")
    if body.status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail="Invalid status")
    lead.status = body.status
    db.commit()
    return lead.to_dict()


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    task = db.query(Task).filter(Task.id == lead.task_id).first()
    if task and not _can_access(task, current_user):
        raise HTTPException(status_code=403, detail="Not permitted")
    db.delete(lead)
    db.commit()
    return {"success": True}
