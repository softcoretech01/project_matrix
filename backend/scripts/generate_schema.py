"""Generate a standalone MariaDB/MySQL schema script from the SQLAlchemy models.

Run:  python backend/scripts/generate_schema.py
Output:  database/schema.sql   (CREATE DATABASE + all pm_ tables + base seed data)

The seed section mirrors backend/app/db/init_db.py (roles, the 5 default users,
clients, departments, designations, labels). Default passwords: admin123 /
master123 / worker123 — change them after first login.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # project root
sys.path.insert(0, ROOT)

from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import mysql

from backend.app.db.database import Base
import backend.app.models  # noqa: F401  (registers every table on Base.metadata)
from backend.app.core.security import get_password_hash

DB_NAME = os.getenv("DB_NAME", "projectmatrix")


def q(v):
    """SQL-quote a Python value."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def insert(table, rows):
    if not rows:
        return ""
    cols = list(rows[0].keys())
    out = [f"INSERT INTO `{table}` (" + ", ".join(f"`{c}`" for c in cols) + ") VALUES"]
    vals = [" (" + ", ".join(q(r[c]) for c in cols) + ")" for r in rows]
    return out[0] + "\n" + ",\n".join(vals) + ";\n"


def build():
    lines = []
    lines.append("-- ProjectMatrix — Task Management schema (MariaDB / MySQL)")
    lines.append("-- Generated from the SQLAlchemy models. Safe to re-run.")
    lines.append("")
    lines.append(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                 "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    lines.append(f"USE `{DB_NAME}`;")
    lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS = 0;")
    lines.append("")

    # ---- Tables (dependency-ordered) ----
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=mysql.dialect())).strip()
        # CreateTable emits "CREATE TABLE x (...)"; make it idempotent + InnoDB/utf8mb4.
        ddl = ddl.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1)
        ddl = ddl.rstrip().rstrip(";").rstrip()
        if ddl.endswith(")"):
            ddl = ddl + " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        else:
            ddl = ddl + ";"
        lines.append(ddl)
        lines.append("")

    # ---- Base seed data (mirrors init_db.py) ----
    lines.append("-- ---------- Base seed data ----------")
    lines.append(insert("pm_roles", [
        {"name": "Admin", "description": "Full application access"},
        {"name": "Master", "description": "Operational oversight and monitoring"},
        {"name": "Worker", "description": "Assigned work, timesheets, personal performance"},
    ]))
    # role_id values follow the insert order above (1=Admin, 2=Master, 3=Worker)
    adm, mst, wrk = get_password_hash("admin123"), get_password_hash("master123"), get_password_hash("worker123")
    lines.append(insert("pm_users", [
        {"id": "U-ADMIN", "code": "EMP-001", "name": "System Administrator", "email": "admin@taskmanagement.com",
         "password": adm, "role": "Admin", "role_id": 1, "designation": "System Administrator", "department": "Management", "status": "Active"},
        {"id": "U-MASTER", "code": "EMP-002", "name": "Priya Menon", "email": "master@taskmanagement.com",
         "password": mst, "role": "Master", "role_id": 2, "designation": "Operations Manager", "department": "Management", "status": "Active"},
        {"id": "U-W1", "code": "EMP-003", "name": "Ravi Kumar", "email": "ravi@taskmanagement.com",
         "password": wrk, "role": "Worker", "role_id": 3, "designation": "Senior Engineer", "department": "Engineering", "status": "Active"},
        {"id": "U-W2", "code": "EMP-004", "name": "Anita Sharma", "email": "anita@taskmanagement.com",
         "password": wrk, "role": "Worker", "role_id": 3, "designation": "Full Stack Engineer", "department": "Engineering", "status": "Active"},
        {"id": "U-W3", "code": "EMP-005", "name": "Sachin Verma", "email": "sachin@taskmanagement.com",
         "password": wrk, "role": "Worker", "role_id": 3, "designation": "UI/UX Designer", "department": "Design", "status": "Active"},
    ]))
    lines.append(insert("pm_clients", [
        {"id": "CLI-01", "name": "Acme Corp", "email": "contact@acme.com", "status": "Active"},
        {"id": "CLI-02", "name": "Global Industries", "email": "info@global.com", "status": "Active"},
    ]))
    lines.append(insert("pm_departments", [
        {"id": "DEP-01", "name": "Engineering", "status": "Active"},
        {"id": "DEP-02", "name": "Design", "status": "Active"},
        {"id": "DEP-03", "name": "Management", "status": "Active"},
    ]))
    lines.append(insert("pm_designations", [
        {"id": "DSG-01", "name": "System Administrator", "status": "Active"},
        {"id": "DSG-02", "name": "Operations Manager", "status": "Active"},
        {"id": "DSG-03", "name": "Senior Engineer", "status": "Active"},
        {"id": "DSG-04", "name": "Full Stack Engineer", "status": "Active"},
        {"id": "DSG-05", "name": "UI/UX Designer", "status": "Active"},
    ]))
    lines.append(insert("pm_labels", [
        {"id": "LBL-01", "name": "Bug", "color": "#ef4444"},
        {"id": "LBL-02", "name": "Feature", "color": "#3b82f6"},
        {"id": "LBL-03", "name": "High Priority", "color": "#f59e0b"},
        {"id": "LBL-04", "name": "Design", "color": "#8b5cf6"},
        {"id": "LBL-05", "name": "Documentation", "color": "#10b981"},
    ]))

    lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    out_dir = os.path.join(ROOT, "database")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "schema.sql")
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(build())
    print("Wrote", out_path)
    print("Tables:", len(Base.metadata.sorted_tables))
