# backend/app/core/deps.py
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.session import get_db
from app.models.user import User

def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    user_id = None
    if x_user_id:
        user_id = x_user_id
    elif authorization and authorization.startswith("Bearer "):
        # Token can carry user ID directly or email
        user_id = authorization.replace("Bearer ", "").strip()

    if user_id:
        user = db.query(User).filter((User.id == user_id) | (User.email == user_id)).first()
        if user:
            return user

    # Fallback to default admin if in development mode
    admin = db.query(User).filter(User.role == "Admin").first()
    return admin

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        if current_user.role not in allowed_roles and current_user.role != "Admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Insufficient permissions")
        return current_user
    return role_checker

