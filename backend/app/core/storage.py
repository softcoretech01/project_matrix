# backend/app/core/storage.py
"""Helpers for validating and saving uploaded files."""
import os
import uuid
import base64
from fastapi import UploadFile, HTTPException

# storage.py is at backend/app/core/ -> go up three levels to reach backend/
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_ROOT = os.path.join(BACKEND_DIR, "uploads")

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp"}
VIDEO_EXTS = {"webm", "mp4"}
DOC_EXTS = {"jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024       # 8 MB
MAX_DOC_BYTES = 20 * 1024 * 1024        # 20 MB
MAX_VIDEO_BYTES = 15 * 1024 * 1024      # 15 MB (short low-bitrate clips stay well under this)


def _ext(filename: str) -> str:
    return (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""


def save_upload(file: UploadFile, subdir: str, allowed=None, max_bytes=MAX_DOC_BYTES) -> dict:
    allowed = allowed or DOC_EXTS
    ext = _ext(file.filename)
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type .{ext or '?'} not allowed")
    data = file.file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="File is too large")
    folder = os.path.join(UPLOAD_ROOT, subdir)
    os.makedirs(folder, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(folder, fname), "wb") as fh:
        fh.write(data)
    return {"filename": fname, "filepath": os.path.join(subdir, fname), "size": len(data)}


def save_base64_image(data_url: str, subdir: str) -> dict:
    """Save a base64 data URL (e.g. camera capture). Returns {filename, filepath}."""
    if "," in data_url:
        header, b64 = data_url.split(",", 1)
    else:
        header, b64 = "", data_url
    ext = "png"
    if "jpeg" in header or "jpg" in header:
        ext = "jpg"
    elif "webp" in header:
        ext = "webp"
    try:
        raw = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Captured image is too large")
    folder = os.path.join(UPLOAD_ROOT, subdir)
    os.makedirs(folder, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(folder, fname), "wb") as fh:
        fh.write(raw)
    return {"filename": fname, "filepath": os.path.join(subdir, fname)}


def delete_file(subdir: str, filename: str):
    try:
        p = os.path.join(UPLOAD_ROOT, subdir, filename)
        if os.path.exists(p):
            os.remove(p)
    except Exception:
        pass
