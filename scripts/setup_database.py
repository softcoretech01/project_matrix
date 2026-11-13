import os
import sys
import pymysql
from dotenv import load_dotenv

# Load backend environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_env = os.path.join(BASE_DIR, "backend", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "08072005")
DB_NAME = os.getenv("DB_NAME", "projectmatrix")

sql_file = os.path.join(BASE_DIR, "database", "Task_management.sql")

def run_import():
    print("==================================================")
    print("  Techspire Portal V2 - Database Setup Script")
    print("==================================================")
    print(f"Connecting to MySQL at {DB_HOST}:{DB_PORT} as user '{DB_USER}'...")

    if not os.path.exists(sql_file):
        print(f"[ERROR] SQL file not found at: {sql_file}")
        sys.exit(1)

    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset="utf8mb4",
            client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
        )
    except Exception as e:
        print(f"[ERROR] Could not connect to MySQL: {e}")
        print("Please verify that MySQL Server 8.0 is running and credentials in backend/.env are correct.")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            print(f"Recreating clean database '{DB_NAME}'...")
            cur.execute(f"DROP DATABASE IF EXISTS `{DB_NAME}`;")
            cur.execute(f"CREATE DATABASE `{DB_NAME}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            cur.execute(f"USE `{DB_NAME}`;")

            print(f"Reading and executing '{os.path.basename(sql_file)}'...")
            with open(sql_file, "r", encoding="utf-8", errors="ignore") as f:
                sql_content = f.read()

            cur.execute(sql_content)
            conn.commit()
            print("[SUCCESS] SQL dump executed successfully!")

            # 1. Clean legacy accounts if any slipped in
            cur.execute("DELETE FROM employees WHERE email NOT IN (%s, %s, %s, %s, %s);", (
                "admin@projectmatrix.com",
                "priya@projectmatrix.com",
                "sophia@projectmatrix.com",
                "liam@projectmatrix.com",
                "emily@projectmatrix.com"
            ))
            conn.commit()

            # 2. Verify all 5 official roles exist
            team = [
                ('E006', 'EMP006', 'Admin User', 'admin@projectmatrix.com', '9876543215', 'IT Director', 'Administration', None, 0.00, 'Admin', 'Active', 'admin'),
                ('E007', 'EMP007', 'Priya', 'priya@projectmatrix.com', '9876543216', 'Frontend Developer', 'Engineering', 'E006', 0.00, 'Employee', 'Active', 'password123'),
                ('E008', 'EMP008', 'Sophia Davis', 'sophia@projectmatrix.com', '9876543217', 'Project Manager', 'Engineering', 'E006', 0.00, 'PM', 'Active', 'password123'),
                ('E009', 'EMP009', 'Liam Miller', 'liam@projectmatrix.com', '9876543218', 'Team Lead', 'Engineering', 'E006', 0.00, 'Team Lead', 'Active', 'password123'),
                ('E010', 'EMP010', 'Emily Watson', 'emily@projectmatrix.com', '9876543219', 'Executive Director', 'Management', None, 0.00, 'Management', 'Active', 'password123'),
            ]
            for eid, ecode, ename, eemail, emobile, edesig, edept, emgr, ecost, erole, estatus, epwd in team:
                cur.execute("SELECT id FROM employees WHERE email = %s;", (eemail,))
                if not cur.fetchone():
                    cur.execute("""
                        INSERT INTO employees (id, code, name, email, mobile, designation, department, managerId, costPerHour, role, status, password)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (eid, ecode, ename, eemail, emobile, edesig, edept, emgr, ecost, erole, estatus, epwd))
            conn.commit()

            # 3. Verify createdBy column in tasks table
            cur.execute("SHOW COLUMNS FROM tasks LIKE 'createdBy';")
            if not cur.fetchone():
                print("[INFO] Adding missing 'createdBy' column to tasks table...")
                cur.execute("ALTER TABLE tasks ADD COLUMN createdBy VARCHAR(100) DEFAULT 'Sophia Davis (PM)';")
                conn.commit()

            # 4. Verify all tables in database
            cur.execute("SHOW TABLES;")
            tables = [r[0] for r in cur.fetchall()]
            print(f"\n[INFO] Verified {len(tables)} tables in database '{DB_NAME}':")
            for t in sorted(tables):
                cur.execute(f"SELECT COUNT(*) FROM `{t}`;")
                cnt = cur.fetchone()[0]
                print(f"   * {t:<18}: {cnt} records")

            # 5. Verify tested project and tasks
            cur.execute("SELECT code, name, owner, status FROM projects WHERE code = 'PRJ-001';")
            proj = cur.fetchone()
            if proj:
                print(f"\n[PROJECT VERIFIED] {proj[0]}: '{proj[1]}' (Owner: {proj[2]}, Status: {proj[3]})")

            cur.execute("SELECT id, name, assignee, createdBy, status, progress FROM tasks;")
            tasks = cur.fetchall()
            print(f"[TASKS VERIFIED] {len(tasks)} tasks configured:")
            for tid, tname, tasg, tcre, tstat, tprog in tasks:
                print(f"   - {tid}: {tname} | Assignee: {tasg} | Assigned By: {tcre} | Status: {tstat} ({tprog}%)")

            print("\n[SUCCESS] Team members, projects, tasks, and 'Assigned By' tracking verified in MySQL.")

    finally:
        conn.close()

    print("\n==================================================")
    print("  Database setup & sync completed successfully!")
    print("==================================================")

if __name__ == "__main__":
    run_import()
