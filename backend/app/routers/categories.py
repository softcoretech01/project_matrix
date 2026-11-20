# backend/app/routers/categories.py
from fastapi import APIRouter, Depends
from backend.app.core.deps import get_current_user
from backend.app.core.work_categories import WORK_CATEGORIES
from backend.app.models.models import User

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
def list_categories(current_user: User = Depends(get_current_user)):
    return WORK_CATEGORIES
