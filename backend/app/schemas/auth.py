# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    designation: Optional[str] = None
    token: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    employeeId: Optional[str] = None
    oldPassword: Optional[str] = None
    password: str

class UserProfileOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    designation: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "Active"

