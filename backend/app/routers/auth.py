# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, PasswordChangeRequest, UserProfileOut
from app.core.security import verify_password, get_password_hash
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip()).first()
    if not user:
        # Check if email is case-insensitive match
        user = db.query(User).filter(User.email.ilike(req.email.strip())).first()

    if not user or not verify_password(req.password, user.password):
        # Demo fallback for immediate developer testing
        if req.email == "admin@taskmanagement.com" and req.password == "admin123":
            return LoginResponse(
                id="1",
                name="Admin User",
                email=req.email,
                role="Admin",
                designation="Administrator",
                token="admin-token"
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return LoginResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        designation=user.designation,
        token=f"token-{user.id}"
    )

@router.post("/password")
def change_password(req: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = req.employeeId or (current_user.id if current_user else None)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = req.password
    db.commit()
    return {"success": True, "message": "Password updated successfully"}

@router.get("/me", response_model=UserProfileOut)
def get_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

