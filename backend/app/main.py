# backend/app/main.py
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure project root and backend are in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Load environment variables
load_dotenv(os.path.join(root_dir, '.env'))

from backend.app.db.init_db import init_db
from backend.app.routers import (
    auth,
    tasks,
    projects,
    sections,
    labels,
    employees,
    notifications,
    search,
    admin,
    master,
    modules,
    personal,
    reports
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Sample Data
    init_db()
    yield

# Ensure DB is initialized on import
init_db()

app = FastAPI(
    title="ProjectMatrix Task Management API",
    version="2.5.0",
    description="FastAPI Backend for Personal, Master, and Admin Portals",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers with /api prefix built-in
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(sections.router)
app.include_router(labels.router)
app.include_router(employees.router)
app.include_router(notifications.router)
app.include_router(search.router)

# Mount additional portals with /api prefix
app.include_router(admin.router, prefix="/api")
app.include_router(master.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
app.include_router(personal.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

# Mount aliases for root access without /api
app.include_router(admin.router)
app.include_router(master.router)
app.include_router(modules.router)
app.include_router(personal.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "ProjectMatrix Task Management Backend",
        "message": "Welcome to ProjectMatrix Task Management API",
        "portals": ["Personal", "Master", "Admin"],
        "docs": "/docs"
    }
