from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.models import models
from app.routers import api

from app.db.init_db import init_db

# Create database tables & initialize seed data
init_db()

app = FastAPI(title="Project Matrix API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api.router)

@app.get("/")
def root():
    return {"message": "Project Matrix Backend is running successfully!"}
