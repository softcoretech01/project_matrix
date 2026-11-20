# backend/app/core/deps.py
"""Authentication & role-based-access dependencies (real JWT, enforced)."""
from typing import List, Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import User
from backend.app.core.security import decode_access_token


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    if (user.status or "Active").lower() != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    return user


def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user but returns None instead of raising (for public-ish reads)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    payload = decode_access_token(authorization.split(" ", 1)[1].strip())
    if not payload or not payload.get("sub"):
        return None
    return db.query(User).filter(User.id == payload["sub"]).first()


def require_roles(allowed_roles: List[str]):
    """Dependency factory. Admin always allowed."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != "Admin" and current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions",
            )
        return current_user
    return role_checker


# Convenience dependencies
require_admin = require_roles(["Admin"])
require_admin_or_master = require_roles(["Admin", "Master"])
require_any = require_roles(["Admin", "Master", "Worker"])
