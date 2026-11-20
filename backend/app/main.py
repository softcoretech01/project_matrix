# backend/app/main.py
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Ensure project root and backend are importable
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
for p in (backend_dir, root_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv(os.path.join(root_dir, ".env"))

from backend.app.db.init_db import init_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.routers import (
    auth, tasks, projects, sections, labels, employees, notifications,
    search, admin, master, modules, personal, reports, dashboard, timesheets,
    idle_time, camera, performance, exports, profile, categories, links, leads,
    live,
)

UPLOAD_DIR = os.path.join(backend_dir, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ProjectMatrix Task Management API",
    version="3.0.0",
    description="Admin / Master / Worker portals — Task Management & Employee Performance Monitoring",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # using Bearer tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Public (no auth): login / forgot / reset. (/me and change-password enforce auth internally) ---
app.include_router(auth.router)

# --- Baseline-auth routers (simple CRUD, any valid token) ---
auth_any = [Depends(get_current_user)]
app.include_router(sections.router, dependencies=auth_any)
app.include_router(labels.router, dependencies=auth_any)
app.include_router(modules.router, dependencies=auth_any)
app.include_router(search.router, dependencies=auth_any)

# --- Routers that enforce their own finer RBAC per-endpoint ---
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(dashboard.router)
app.include_router(timesheets.router)
app.include_router(idle_time.router)
app.include_router(camera.router)
app.include_router(performance.router)
app.include_router(exports.router)
app.include_router(profile.router)
app.include_router(categories.router)
app.include_router(links.router)
app.include_router(leads.router)
app.include_router(live.router)
app.include_router(employees.router)
app.include_router(notifications.router)
app.include_router(personal.router)
app.include_router(admin.router)
app.include_router(reports.router)

# Master data: Admin or Master only
app.include_router(master.router, dependencies=[Depends(require_roles(["Admin", "Master"]))])


@app.get("/api/health")
def health():
    return {"status": "online", "service": "ProjectMatrix Task Management Backend",
            "version": "3.0.0", "portals": ["Admin", "Master", "Worker"]}


# --- Production: serve the built React app (clean path URLs via SPA fallback) ---
FRONTEND_DIST = os.path.join(root_dir, "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    _assets = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    from fastapi import HTTPException as _HTTPException

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        # Never let API/doc/upload paths fall through to the SPA — return a real 404
        if full_path.startswith(("api/", "uploads/", "docs", "openapi.json", "redoc")):
            raise _HTTPException(status_code=404, detail="Not Found")
        # Serve a real static file if it exists, otherwise index.html (client routing)
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"status": "online", "service": "ProjectMatrix Task Management Backend",
                "message": "Frontend not built. Run `npm run build` in frontend/ to serve the app here.",
                "docs": "/docs"}
