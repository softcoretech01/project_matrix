# backend/app/routers/idle_time.py
from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import IdleTimeLog, Notification, User
from backend.app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/idle-time", tags=["idle-time"])

ALERT_THRESHOLD_SECONDS = 15 * 60   # 15 minutes


class IdleLog(BaseModel):
    idleStart: str
    idleEnd: Optional[str] = None
    durationSeconds: int
    reason: Optional[str] = "idle"     # idle / break


def _parse(dt: str):
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


@router.post("")
def log_idle(body: IdleLog, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start = _parse(body.idleStart) or datetime.utcnow()
    end = _parse(body.idleEnd)
    log = IdleTimeLog(
        user_id=current_user.id,
        log_date=start.strftime("%Y-%m-%d"),
        idle_start=start, idle_end=end,
        duration_seconds=max(0, int(body.durationSeconds)),
        reason=body.reason or "idle",
        notified=False,
    )
    # One alert per qualifying session (dedupe handled by per-session POST)
    if log.duration_seconds >= ALERT_THRESHOLD_SECONDS and (body.reason or "idle") != "break":
        total_m = log.duration_seconds // 60
        h, m = divmod(total_m, 60)
        dur = f"{h}h {m}m" if h else f"{m} min"
        st = start.strftime("%I:%M %p").lstrip("0")
        window = f"from {st} to {end.strftime('%I:%M %p').lstrip('0')}" if end else f"starting {st}"
        db.add(Notification(
            user_id=None, type="idle", title="Idle-Time Alert",
            message=f"{current_user.name} was idle for {dur} ({window}) on {log.log_date}.",
        ))
        log.notified = True
    db.add(log)
    db.commit()
    db.refresh(log)
    return log.to_dict()


@router.get("")
def list_idle(userId: Optional[str] = None, date: Optional[str] = None, search: Optional[str] = None,
              current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    q = db.query(IdleTimeLog)
    if userId:
        q = q.filter(IdleTimeLog.user_id == userId)
    if date:
        q = q.filter(IdleTimeLog.log_date == date)
    logs = q.order_by(IdleTimeLog.idle_start.desc()).limit(500).all()
    # attach login time from the user record
    users = {u.id: u for u in db.query(User).all()}
    out = []
    for l in logs:
        d = l.to_dict()
        u = users.get(l.user_id)
        if u:
            if search and search.lower() not in (u.name or "").lower():
                continue
            d["loginTime"] = u.last_login.isoformat() if u.last_login else None
            d["lastActive"] = l.idle_start.isoformat() if l.idle_start else None
        out.append(d)
    return out


@router.get("/summary")
def idle_summary(period: str = "daily",
                 current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    """Per-employee idle totals, grouped daily or monthly."""
    logs = db.query(IdleTimeLog).all()
    users = {u.id: u.name for u in db.query(User).all()}
    buckets = defaultdict(lambda: defaultdict(int))   # employee -> bucket -> seconds
    for l in logs:
        if not l.log_date:
            continue
        key = l.log_date if period == "daily" else l.log_date[:7]
        buckets[l.user_id][key] += (l.duration_seconds or 0)
    result = []
    for uid, periods in buckets.items():
        for bucket, secs in sorted(periods.items()):
            result.append({
                "employeeName": users.get(uid, uid), "period": bucket,
                "totalMinutes": round(secs / 60, 1), "sessions": None,
            })
    return result
