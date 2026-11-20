# backend/app/routers/live.py
"""Consent-based live camera/mic viewing (Admin/Master -> Worker) over WebRTC.

This module is only a *signaling relay* plus an ICE-server config endpoint. No
media passes through the server: the browsers connect peer-to-peer via WebRTC.
A worker must explicitly accept each request, so nothing starts covertly.
"""
import os
import uuid
from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.db.database import get_db, SessionLocal
from backend.app.models.models import User, CameraActivityLog
from backend.app.core.security import decode_access_token
from backend.app.core.deps import get_current_user

router = APIRouter(prefix="/api/live", tags=["live"])

# Single-process in-memory registry of connected clients: user_id -> info.
# Fine for one uvicorn worker; a multi-worker deployment would need a shared bus.
_clients: Dict[str, dict] = {}

INITIATOR_ROLES = {"Admin", "Master"}
# Messages a worker (non-initiator) is allowed to send.
RESPONDER_TYPES = {"accept", "reject", "offer", "answer", "ice", "end", "capture-done"}
RELAY_TYPES = {"reject", "offer", "answer", "ice", "end", "capture-done"}
# Admin/Master -> worker initiations (role-checked, relayed with sender identity).
INITIATE_TYPES = {"request", "capture"}


def _ice_servers():
    servers = [{"urls": "stun:stun.l.google.com:19302"}]
    turn_url = os.getenv("TURN_URL")
    if turn_url:
        entry = {"urls": turn_url}
        if os.getenv("TURN_USER"):
            entry["username"] = os.getenv("TURN_USER")
        if os.getenv("TURN_PASS"):
            entry["credential"] = os.getenv("TURN_PASS")
        servers.append(entry)
    return servers


@router.get("/config")
def live_config(current_user: User = Depends(get_current_user)):
    """ICE servers for the browser RTCPeerConnection."""
    return {"iceServers": _ice_servers()}


async def _send(user_id: str, message: dict) -> bool:
    info = _clients.get(user_id)
    if not info:
        return False
    try:
        await info["ws"].send_json(message)
        return True
    except Exception:
        return False


def _audit_live_view(worker_id: str, admin_id: str):
    """Record that a live view of `worker_id` was granted (no media stored)."""
    db: Session = SessionLocal()
    try:
        db.add(CameraActivityLog(
            user_id=worker_id,
            activity_type="live-view",
            filepath=f"viewed_by={admin_id}",
            captured_at=datetime.utcnow(),
        ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@router.websocket("/ws")
async def live_ws(websocket: WebSocket, token: Optional[str] = None):
    # --- authenticate via ?token=<jwt> (WebSockets can't send Authorization headers easily) ---
    payload = decode_access_token(token or "")
    if not payload or not payload.get("sub"):
        await websocket.close(code=4401)
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload["sub"]).first()
    finally:
        db.close()
    if not user or (user.status or "Active").lower() != "active":
        await websocket.close(code=4401)
        return

    uid, role, name = user.id, user.role, user.name
    await websocket.accept()
    _clients[uid] = {"ws": websocket, "role": role, "name": name}

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")
            target = msg.get("to")

            if mtype in INITIATE_TYPES:
                # Only Admin/Master may initiate, and only for a different user.
                if role not in INITIATOR_ROLES or not target or target == uid:
                    await _send(uid, {"type": "error", "reason": "not-permitted"})
                    continue
                session_id = msg.get("sessionId") or uuid.uuid4().hex
                out_type = "incoming" if mtype == "request" else "capture"
                out = {"type": out_type, "from": uid, "fromName": name,
                       "fromRole": role, "sessionId": session_id}
                if mtype == "capture":
                    out["mode"] = msg.get("mode", "photo")   # photo | video
                delivered = await _send(target, out)
                if not delivered:
                    await _send(uid, {"type": "unavailable", "to": target, "sessionId": session_id})

            elif mtype == "accept":
                # Worker granted the view -> notify admin and write an audit row.
                if target:
                    _audit_live_view(worker_id=uid, admin_id=target)
                    await _send(target, {"type": "accept", "from": uid,
                                         "fromName": name, "sessionId": msg.get("sessionId")})

            elif mtype in RELAY_TYPES:
                if target:
                    out = {k: v for k, v in msg.items() if k != "to"}
                    out["from"] = uid
                    await _send(target, out)
            # unknown types are ignored
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        # Only remove if this socket is still the registered one for the user.
        if _clients.get(uid, {}).get("ws") is websocket:
            _clients.pop(uid, None)
