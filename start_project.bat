@echo off
title Techspire Portal V2 - Project Matrix Launcher
echo ==================================================
echo   Starting Techspire Portal V2 (Project Matrix)
echo ==================================================
cd /d "%~dp0"

echo [1/2] Starting Backend API Server (FastAPI on http://127.0.0.1:8000)...
start "Project Matrix - Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Vite Server (React on http://localhost:5173)...
start "Project Matrix - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==================================================
echo   Both Backend & Frontend servers started!
echo   Frontend : http://localhost:5173
echo   Backend  : http://127.0.0.1:8000
echo   API Docs : http://127.0.0.1:8000/docs
echo ==================================================
pause

