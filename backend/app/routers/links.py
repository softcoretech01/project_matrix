# backend/app/routers/links.py
"""External URL / link attachments for projects, tasks and timesheets."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import ResourceLink, User
from backend.app.core.deps import get_current_user

router = APIRouter(prefix="/api/links", tags=["links"])
PARENTS = {"project", "task", "timesheet"}


class LinkIn(BaseModel):
    parentType: str
    parentId: str
    url: str
    label: Optional[str] = ""
    linkType: Optional[str] = None


def detect_type(url: str) -> str:
    u = (url or "").lower()
    if any(x in u for x in ("github.com", "gitlab.com", "bitbucket.org")):
        return "github"
    if "figma.com" in u:
        return "figma"
    if any(x in u for x in ("drive.google.com", "docs.google.com", "sheets.google", "slides.google")):
        return "drive"
    if any(x in u for x in ("maps.google", "google.com/maps", "goo.gl/maps", "maps.app.goo.gl")):
        return "maps"
    if any(x in u for x in ("swagger", "postman", "apidoc", "/api-docs", "readme.io")):
        return "api"
    if any(x in u for x in ("notion.so", "confluence", "docs.")):
        return "docs"
    return "other"


@router.get("")
def list_links(parentType: str, parentId: str,
               current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    links = (db.query(ResourceLink)
             .filter(ResourceLink.parent_type == parentType, ResourceLink.parent_id == parentId)
             .order_by(ResourceLink.created_at.desc()).all())
    return [l.to_dict() for l in links]


@router.post("")
def add_link(body: LinkIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.parentType not in PARENTS:
        raise HTTPException(status_code=400, detail="Invalid parent type")
    url = (body.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    link = ResourceLink(parent_type=body.parentType, parent_id=body.parentId, url=url,
                        link_type=(body.linkType or detect_type(url)),
                        label=(body.label or "").strip(), added_by=current_user.id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link.to_dict()


@router.delete("/{link_id}")
def delete_link(link_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(ResourceLink).filter(ResourceLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return {"success": True}
