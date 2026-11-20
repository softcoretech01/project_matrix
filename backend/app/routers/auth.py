# backend/app/routers/auth.py
import os
import re
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import User, PasswordResetToken
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.deps import get_current_user
from backend.app.core.email_utils import send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
PORTAL_ROLE = {"admin": "Admin", "master": "Master", "worker": "Worker"}


# ---------- schemas ----------
class LoginRequest(BaseModel):
    email: str
    password: str
    portal: Optional[str] = None            # admin / master / worker


class ChangePasswordRequest(BaseModel):
    oldPassword: Optional[str] = None
    newPassword: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


# ---------- helpers ----------
def _validate_password(pw: str):
    if not pw or len(pw) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(pw) > 128:
        raise HTTPException(status_code=400, detail="Password is too long")


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _find_user(db: Session, identifier: str):
    """Resolve a login identifier that may be a username (email local-part) or full email."""
    ident = (identifier or "").strip()
    if not ident:
        return None
    u = db.query(User).filter(User.email.ilike(ident)).first()
    if u:
        return u
    # treat the identifier as a username = the part of the email before '@'
    return db.query(User).filter(User.email.ilike(ident + "@%")).first()


def _auth_payload(user: User) -> dict:
    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    d = user.to_dict()
    d["token"] = token
    d["tokenType"] = "bearer"
    return d


# ---------- routes ----------
@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = _find_user(db, req.email)
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if (user.status or "Active").lower() != "active":
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact your administrator.")

    # Portal / role enforcement
    if req.portal:
        expected = PORTAL_ROLE.get(req.portal.strip().lower())
        if expected and user.role != expected:
            raise HTTPException(
                status_code=403,
                detail=f"This account is not authorized for the {req.portal.title()} portal.",
            )

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return _auth_payload(user)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()


@router.post("/change-password")
@router.post("/password")
def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    # Verify old password unless the account still has none set
    if req.oldPassword is not None:
        if not verify_password(req.oldPassword, current_user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    _validate_password(req.newPassword)
    current_user.password = get_password_hash(req.newPassword)
    db.commit()
    return {"success": True, "message": "Password updated successfully"}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _find_user(db, req.email)

    # Always respond success (do not reveal whether the account exists)
    generic = {"success": True,
               "message": "If an account exists, a reset link has been sent."}
    if not user:
        return generic

    # Invalidate previous unused tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used == False  # noqa: E712
    ).update({PasswordResetToken.used: True})

    raw_token = secrets.token_urlsafe(32)
    prt = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(hours=1),
        used=False,
    )
    db.add(prt)
    db.commit()

    reset_link = f"{FRONTEND_URL}/?reset_token={raw_token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2>Reset your password</h2>
      <p>Hi {user.name}, we received a request to reset your Task Matrix password.</p>
      <p><a href="{reset_link}" style="background:#4f46e5;color:#fff;padding:12px 20px;
         border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <p style="color:#888;font-size:12px">{reset_link}</p>
    </div>"""
    text = f"Reset your password: {reset_link} (expires in 1 hour)"
    result = send_email(user.email, "Reset your Task Matrix password", html, text)

    resp = dict(generic)
    if result["fallback"]:
        # Dev convenience when SMTP not configured: surface the link
        resp["devResetLink"] = reset_link
        resp["emailSent"] = False
    else:
        resp["emailSent"] = True
    return resp


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    _validate_password(req.newPassword)
    token_hash = _hash_token((req.token or "").strip())
    prt = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,  # noqa: E712
    ).first()
    if not prt:
        raise HTTPException(status_code=400, detail="Invalid or already-used reset link")
    if prt.expires_at and prt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link has expired")

    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = get_password_hash(req.newPassword)
    prt.used = True
    db.commit()
    return {"success": True, "message": "Password has been reset. You can now sign in."}
