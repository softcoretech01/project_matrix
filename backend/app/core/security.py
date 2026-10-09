# backend/app/core/security.py
import hashlib
import os

SECRET_KEY = os.getenv("SECRET_KEY", "projectmatrix-super-secret-key-2026")
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Support both simple sha256 and plain text comparison for legacy compatibility
    if plain_password == hashed_password:
        return True
    return get_password_hash(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

