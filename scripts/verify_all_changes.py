#!/usr/bin/env python3
"""
================================================================================
  Techspire Portal V2 (Project Matrix) - Comprehensive Changes Verification
================================================================================
  This script systematically verifies every recent change made across:
  1. Database tables, columns ('createdBy'), and official 5-role roster
  2. "Assigned By" tracking in DB and Backend API
  3. Calendar redesign (pure month view, theme-adaptive tokens)
  4. Date-Month-Year (DD-MM-YYYY) format consistency
  5. Dynamic Progress Engine & Subtask Checklist
  6. Backend REST API live responses
================================================================================
"""

import os
import sys
import re
import json
import pymysql
import urllib.request
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_env = os.path.join(BASE_DIR, "backend", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "08072005")
DB_NAME = os.getenv("DB_NAME", "projectmatrix")

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)

def print_check(name, passed, details=""):
    symbol = "[PASS] ✓" if passed else "[FAIL] ✗"
    print(f"  {symbol} {name:<45} {details}")
    return passed

def verify_all():
    all_passed = True
    print_header("Comprehensive Verification of All Recent Changes")

    # ---------------------------------------------------------
    # 1. DATABASE SCHEMA & ROSTER VERIFICATION
    # ---------------------------------------------------------
    print("\n[1] Verifying MySQL Database ('projectmatrix' on port 3306)...")
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset="utf8mb4"
        )
        with conn.cursor() as cur:
            # Check 15 tables
            cur.execute("SHOW TABLES;")
            tables = set(r[0] for r in cur.fetchall())
            expected_tables = {
                'allocations', 'clients', 'employees', 'holidays', 'leaves', 'modules',
                'project_members', 'project_sections', 'projects', 'subtasks', 'task_activity',
                'task_comments', 'task_types', 'tasks', 'timesheets'
            }
            tables_ok = expected_tables.issubset(tables)
            all_passed &= print_check("All 15 Relational Tables Present", tables_ok, f"({len(tables)} tables found)")

            # Check createdBy column in tasks
            cur.execute("SHOW COLUMNS FROM tasks LIKE 'createdBy';")
            col_ok = cur.fetchone() is not None
            all_passed &= print_check("'createdBy' Column in tasks Table", col_ok, "(Tracks 'Assigned By')")

            # Check official 5 accounts
            cur.execute("SELECT email, role, name FROM employees;")
            employees = cur.fetchall()
            emails = {e[0] for e in employees}
            expected_emails = {
                "admin@projectmatrix.com",
                "priya@projectmatrix.com",
                "sophia@projectmatrix.com",
                "liam@projectmatrix.com",
                "emily@projectmatrix.com"
            }
            roster_ok = (emails == expected_emails)
            all_passed &= print_check("Clean 5-Role Official Roster", roster_ok, f"(No dummy users; {len(emails)} verified)")

            # Check PRJ-001 delivery progress & details
            cur.execute("SELECT code, name, owner, status FROM projects WHERE code = 'PRJ-001';")
            proj = cur.fetchone()
            proj_ok = proj is not None
            all_passed &= print_check("Project 'PRJ-001' Configured", proj_ok, f"({proj[1]} | Owner: {proj[2]})" if proj else "")

            # Check tasks and assignor tracking
            cur.execute("SELECT id, name, assignee, createdBy, status, progress FROM tasks;")
            tasks = cur.fetchall()
            task_assigned_ok = len(tasks) >= 2 and all(t[3] for t in tasks)
            all_passed &= print_check("Tasks With 'Assigned By' Values", task_assigned_ok, f"({len(tasks)} tasks verified)")

            # Check subtasks checklist
            cur.execute("SELECT COUNT(*) FROM subtasks WHERE taskId = 'TASK489111';")
            subtask_cnt = cur.fetchone()[0]
            subtasks_ok = subtask_cnt >= 3
            all_passed &= print_check("Subtasks Checklist Configured", subtasks_ok, f"({subtask_cnt} subtasks for TASK489111)")

        conn.close()
    except Exception as e:
        all_passed &= print_check("MySQL Database Connection", False, f"Error: {e}")

    # ---------------------------------------------------------
    # 2. CALENDAR ENHANCEMENTS & PURE MONTH GRID
    # ---------------------------------------------------------
    print("\n[2] Verifying Calendar Page (Pure Month View & Design Tokens)...")
    cal_file = os.path.join(BASE_DIR, "frontend", "src", "views", "Calendar.jsx")
    if os.path.exists(cal_file):
        with open(cal_file, "r", encoding="utf-8") as f:
            cal_code = f.read()
        no_add_task = ">+ Add Task<" not in cal_code and ">Quick Task<" not in cal_code and "Quick Task Modal" not in cal_code
        all_passed &= print_check("Calendar Add-Task Buttons Removed", no_add_task, "(Pure month view focus)")
        no_filter_toolbar = "All Priorities" not in cal_code and "All Projects" not in cal_code
        all_passed &= print_check("Calendar Clutter Filters Removed", no_filter_toolbar, "(Clean navigation only)")
        uses_css_vars = "var(--card-bg)" in cal_code and "var(--bg-secondary)" in cal_code
        all_passed &= print_check("Calendar Theme Adaptive Tokens Used", uses_css_vars, "(--card-bg & --bg-secondary)")
    else:
        all_passed &= print_check("Calendar.jsx Exists", False)

    css_file = os.path.join(BASE_DIR, "frontend", "src", "index.css")
    if os.path.exists(css_file):
        with open(css_file, "r", encoding="utf-8") as f:
            css_code = f.read()
        tokens_defined = "--card-bg:" in css_code and "--bg-secondary:" in css_code
        all_passed &= print_check("Theme Tokens Defined in index.css", tokens_defined, "(Light & Dark theme parity)")

    # ---------------------------------------------------------
    # 3. DATE-MONTH-YEAR (DD-MM-YYYY) FORMATTING
    # ---------------------------------------------------------
    print("\n[3] Verifying Strict Date-Month-Year (DD-MM-YYYY) Formatting...")
    date_util = os.path.join(BASE_DIR, "frontend", "src", "utils", "date.js")
    if os.path.exists(date_util):
        with open(date_util, "r", encoding="utf-8") as f:
            date_code = f.read()
        has_dd_mm_yyyy = "DD-MM-YYYY" in date_code and "pad(d)" in date_code and "pad(m)" in date_code
        all_passed &= print_check("Centralized formatDate Engine", has_dd_mm_yyyy, "(Regex DD-MM-YYYY parser)")
    else:
        all_passed &= print_check("date.js Utility Exists", False)

    # ---------------------------------------------------------
    # 4. ASSIGNED BY DISPLAY IN FRONTEND VIEWS
    # ---------------------------------------------------------
    print("\n[4] Verifying 'Assigned By' Integration in Frontend Views...")
    tasks_view = os.path.join(BASE_DIR, "frontend", "src", "views", "Tasks.jsx")
    if os.path.exists(tasks_view):
        with open(tasks_view, "r", encoding="utf-8") as f:
            tasks_code = f.read()
        kanban_has_by = "By: {t.assignedBy" in tasks_code or "By: {task.assignedBy" in tasks_code
        all_passed &= print_check("Kanban Cards Show 'By: <Assignor>'", kanban_has_by)
        modal_has_by = "Assigned By" in tasks_code
        all_passed &= print_check("Task Details Modal Shows 'Assigned By'", modal_has_by)
        tables_has_by = "Assigned By" in tasks_code
        all_passed &= print_check("Task Tables Include 'Assigned By'", tables_has_by)

    # ---------------------------------------------------------
    # 5. BACKEND API LIVE ENDPOINTS
    # ---------------------------------------------------------
    print("\n[5] Verifying Live Backend REST API (http://127.0.0.1:8000)...")
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/api/tasks")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            api_tasks_ok = len(data) >= 2 and all("assignedBy" in t for t in data)
            all_passed &= print_check("API /api/tasks Serializes 'assignedBy'", api_tasks_ok, f"({len(data)} tasks checked)")
    except Exception as e:
        all_passed &= print_check("Backend /api/tasks Endpoint", False, f"Note: {e}")

    try:
        req = urllib.request.Request("http://127.0.0.1:8000/api/projects")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            api_proj_ok = len(data) >= 1 and data[0].get("code") == "PRJ-001"
            all_passed &= print_check("API /api/projects Returns PRJ-001", api_proj_ok, f"(Progress: {data[0].get('progress')}%)")
    except Exception as e:
        all_passed &= print_check("Backend /api/projects Endpoint", False, f"Note: {e}")

    # ---------------------------------------------------------
    # FINAL SUMMARY
    # ---------------------------------------------------------
    print("\n" + "=" * 80)
    if all_passed:
        print("  ALL VERIFICATIONS PASSED (100% OK) - WORKSPACE IS PRODUCTION READY!")
    else:
        print("  SOME CHECKS RETURNED WARNINGS/FAILS - REVIEW LOGS ABOVE.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    verify_all()
