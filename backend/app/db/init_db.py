from app.db.database import engine, Base, SessionLocal
from app.models.models import Task, Project, Employee, Subtask, TaskComment, ProjectMember, ProjectSection
from sqlalchemy import text, inspect

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[init_db] Note: Table creation notice: {e}")

    # Sync missing columns to database tables if needed
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            for table_name, table in Base.metadata.tables.items():
                if inspector.has_table(table_name):
                    existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
                    for col in table.columns:
                        if col.name not in existing_cols:
                            col_type = col.type.compile(engine.dialect)
                            try:
                                conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `{col.name}` {col_type}"))
                                conn.commit()
                            except Exception as err:
                                pass
    except Exception as e:
        pass
    
    try:
        db = SessionLocal()
        try:
            # Clean any legacy accounts
            db.query(Employee).filter(Employee.email.notin_([
                "admin@projectmatrix.com",
                "priya@projectmatrix.com",
                "sophia@projectmatrix.com",
                "liam@projectmatrix.com",
                "emily@projectmatrix.com"
            ])).delete(synchronize_session=False)
            db.commit()

            # Ensure official accounts exist
            official_users = [
                ("E006", "Admin User", "admin@projectmatrix.com", "Admin", "IT Director"),
                ("E007", "Priya", "priya@projectmatrix.com", "Employee", "Frontend Developer"),
                ("E008", "Sophia Davis", "sophia@projectmatrix.com", "PM", "Project Manager"),
                ("E009", "Liam Miller", "liam@projectmatrix.com", "Team Lead", "Team Lead"),
                ("E010", "Emily Watson", "emily@projectmatrix.com", "Management", "Executive Director"),
            ]
            for uid, uname, uemail, urole, udesig in official_users:
                existing = db.query(Employee).filter(Employee.email == uemail).first()
                if not existing:
                    emp = Employee(id=uid, name=uname, email=uemail, role=urole, designation=udesig)
                    db.add(emp)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[init_db] Seed note: {e}")
