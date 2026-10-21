from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.db.database import get_db
from backend.app.models.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class PasswordChangeRequest(BaseModel):
    user_id: str
    new_password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip()).first()
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.status != "Active":
        raise HTTPException(status_code=403, detail="Account is deactivated")
        
    return user.to_dict()

@router.post("/change-password")
def change_password(req: PasswordChangeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password = req.new_password
    db.commit()
    return {"message": "Password updated successfully"}

