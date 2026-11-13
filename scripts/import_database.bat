@echo off
title Techspire Portal V2 - Database Setup
echo ==================================================
echo   Techspire Portal V2 - Database Setup & Sync
echo ==================================================
cd /d "%~dp0\.."
python scripts\setup_database.py
echo.
pause

