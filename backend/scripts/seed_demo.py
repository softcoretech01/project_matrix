"""Seed realistic, interconnected DEMO data for a live presentation.

Reuses the 3 seeded workers (Ravi = Lead Management, Anita = Digital Marketing,
Sachin = Operations & Site Visits). Every created row uses a `DEMO-` id/code
prefix so it is easy to identify and remove (see unseed_demo.py). Purely
additive — existing data is never modified.

Run:  python backend/scripts/seed_demo.py
Undo: python backend/scripts/unseed_demo.py
"""
import os
import sys
import json
import random
from datetime import date, datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)

from backend.app.db.database import SessionLocal
from backend.app.models.models import (
    Project, ProjectMember, Task, Lead, Timesheet, Notification,
)
from backend.scripts.unseed_demo import unseed

random.seed(42)  # reproducible demo

TODAY = date.today()
def d(offset):            # date string offset days from today
    return (TODAY + timedelta(days=offset)).isoformat()
def dt(offset_days, hour=10, minute=0):
    return datetime.combine(TODAY + timedelta(days=offset_days), datetime.min.time()).replace(hour=hour, minute=minute)

OWNER = "U-MASTER"
RAVI, ANITA, SACHIN = "U-W1", "U-W2", "U-W3"

# ---- People / places used across leads, visits, docs (realistic, dummy) ----
NAMES = [
    "Arun Kumar", "Priya Sharma", "Rahul Nair", "Divya Raj", "Karthik S", "Meena Krishnan",
    "Vijay Anand", "Sneha Reddy", "Suresh Babu", "Ananya Iyer", "Mohan Das", "Keerthana M",
    "Praveen Kumar", "Lakshmi Devi", "Nithin Joseph", "Aishwarya P", "Gokul Raj", "Farah Khan",
    "Dinesh Kumar", "Harini S", "Manoj Pillai", "Revathi Nair", "Sanjay Verma", "Deepa Menon",
    "Ramesh Gupta", "Kavya Suresh", "Arjun Mehta", "Pooja Rao", "Vignesh T", "Nandini K",
    "Imran Ali", "Shruti Jain", "Balaji R", "Anjali Nair", "Hari Prasad", "Swathi Reddy",
]
LOCATIONS = ["Whitefield", "Indiranagar", "HSR Layout", "Electronic City", "Koramangala",
             "Hebbal", "JP Nagar", "Marathahalli", "Yelahanka", "Sarjapur Road"]
SOURCES = ["Website", "Facebook Ad", "Instagram Ad", "Google Ad", "Referral", "Walk-in", "99acres"]


def phone(i):
    return f"90000{str(10000 + i)[-5:]}"


def main():
    db = SessionLocal()
    try:
        print("Clearing any previous demo data…", unseed(db))

        # ---------- Projects ----------
        projects = [
            Project(id="DEMO-PRJ-LEAD", code="DEMO-PRJ-LEAD", name="Green Valley Residency — Lead Generation",
                    description="Lead sourcing, calling and conversion for the Green Valley Residency launch.",
                    owner_id=OWNER, priority="High", status="In Progress", progress=55,
                    review_required=True, start_date=d(-40), end_date=d(20)),
            Project(id="DEMO-PRJ-MKT", code="DEMO-PRJ-MKT", name="Skyline Towers — Digital Marketing",
                    description="Facebook, Instagram and Google ad campaigns driving enquiries for Skyline Towers.",
                    owner_id=OWNER, priority="Medium", status="In Progress", progress=40,
                    review_required=True, start_date=d(-30), end_date=d(30)),
            Project(id="DEMO-PRJ-OPS", code="DEMO-PRJ-OPS", name="Lake View Estates — Site Visits & Verification",
                    description="Field site visits, client meetings and legal document verification for Lake View Estates.",
                    owner_id=OWNER, priority="High", status="In Progress", progress=60,
                    review_required=True, start_date=d(-45), end_date=d(15)),
        ]
        db.add_all(projects)
        db.add_all([
            ProjectMember(id="DEMO-MEM-1", project_id="DEMO-PRJ-LEAD", employee_id=RAVI, role="Lead Executive"),
            ProjectMember(id="DEMO-MEM-2", project_id="DEMO-PRJ-MKT", employee_id=ANITA, role="Marketing Specialist"),
            ProjectMember(id="DEMO-MEM-3", project_id="DEMO-PRJ-OPS", employee_id=SACHIN, role="Field Officer"),
            ProjectMember(id="DEMO-MEM-4", project_id="DEMO-PRJ-LEAD", employee_id=SACHIN, role="Support"),
        ])
        db.flush()

        # ---------- Tasks ----------
        # (id, name, project, assignee, category, status, priority, start_off, end_off, est_hours, progress, custom)
        def ctr(clicks, impr): return round(clicks / impr * 100, 2) if impr else 0
        def cpl(budget, leads): return round(budget / leads) if leads else 0

        tasks = [
            # Ravi — Lead Management (sales + calling)
            ("DEMO-TSK-101", "Q4 Lead Outreach — Green Valley", "DEMO-PRJ-LEAD", RAVI, "sales", "In Progress", "High", -20, 5, 40, 60, {}),
            ("DEMO-TSK-102", "Follow-up calls — Interested buyers", "DEMO-PRJ-LEAD", RAVI, "calling", "Follow-up", "High", -12, 3, 18, 45,
             {"clientName": "Priya Sharma", "phone": phone(2), "outcome": "Callback", "callbackDate": d(2)}),
            ("DEMO-TSK-103", "Cold calling — new enquiries", "DEMO-PRJ-LEAD", RAVI, "calling", "Connected", "Medium", -18, -6, 16, 100,
             {"clientName": "Arun Kumar", "phone": phone(1), "outcome": "Interested"}),
            ("DEMO-TSK-104", "Weekend walk-in follow-ups", "DEMO-PRJ-LEAD", RAVI, "sales", "To Do", "Medium", 1, 8, 12, 0, {}),
            ("DEMO-TSK-105", "Re-engage cold leads", "DEMO-PRJ-LEAD", RAVI, "calling", "To Call", "Low", -10, -2, 10, 10,
             {"clientName": "Suresh Babu", "phone": phone(9), "outcome": "No Answer"}),  # overdue (end past, not done)
            ("DEMO-TSK-106", "Close hot leads — booking", "DEMO-PRJ-LEAD", RAVI, "sales", "Completed", "High", -25, -3, 20, 100, {}),

            # Anita — Digital Marketing (marketing)
            ("DEMO-TSK-201", "Facebook Ads — Green Valley Launch", "DEMO-PRJ-MKT", ANITA, "marketing", "Published", "High", -28, -4, 14, 100,
             {"channel": "Facebook", "budget": 45000, "impressions": 120000, "clicks": 3600, "leads": 180,
              "ctr": ctr(3600, 120000), "cpl": cpl(45000, 180), "goal": "200 leads",
              "campaignUrl": "https://facebook.com/ads/greenvalley"}),
            ("DEMO-TSK-202", "Instagram Ads — Skyline Towers", "DEMO-PRJ-MKT", ANITA, "marketing", "In Progress", "Medium", -20, 6, 16, 55,
             {"channel": "Instagram", "budget": 30000, "impressions": 85000, "clicks": 2550, "leads": 95,
              "ctr": ctr(2550, 85000), "cpl": cpl(30000, 95), "goal": "120 leads",
              "campaignUrl": "https://instagram.com/ads/skyline"}),
            ("DEMO-TSK-203", "Google Ads — Lake View Estates", "DEMO-PRJ-MKT", ANITA, "marketing", "In Progress", "High", -15, 10, 18, 40,
             {"channel": "Google Ads", "budget": 60000, "impressions": 40000, "clicks": 3200, "leads": 160,
              "ctr": ctr(3200, 40000), "cpl": cpl(60000, 160), "goal": "150 leads",
              "campaignUrl": "https://ads.google.com/lakeview"}),
            ("DEMO-TSK-204", "Retargeting — site visitors", "DEMO-PRJ-MKT", ANITA, "marketing", "Planned", "Medium", 2, 12, 10, 0,
             {"channel": "Facebook", "budget": 20000, "impressions": 0, "clicks": 0, "leads": 0, "ctr": 0, "cpl": 0, "goal": "Re-engage"}),
            ("DEMO-TSK-205", "Monthly performance report", "DEMO-PRJ-MKT", ANITA, "marketing", "Reporting", "Low", -5, 4, 6, 70,
             {"channel": "Email", "budget": 0, "goal": "Campaign ROI report"}),
            ("DEMO-TSK-206", "Festive creatives — Diwali offer", "DEMO-PRJ-MKT", ANITA, "marketing", "Scheduled", "Medium", -8, -1, 8, 30,
             {"channel": "Instagram", "budget": 15000, "goal": "Festive push"}),  # overdue

            # Sachin — Operations & Site Visits (sitevisit + docverify)
            ("DEMO-TSK-301", "Site visit — Green Valley Plot 24", "DEMO-PRJ-OPS", SACHIN, "sitevisit", "Report Submitted", "High", -14, -8, 6, 100,
             {"siteAddress": "Plot 24, Green Valley, Whitefield", "mapLink": "https://maps.google.com/?q=green+valley",
              "visitDate": d(-10), "clientName": "Rahul Nair", "outcome": "Interested"}),
            ("DEMO-TSK-302", "Site visit — Skyline Towers 7B", "DEMO-PRJ-OPS", SACHIN, "sitevisit", "Visited", "Medium", -6, 2, 5, 60,
             {"siteAddress": "Flat 7B, Skyline Towers, Hebbal", "mapLink": "https://maps.google.com/?q=skyline+towers",
              "visitDate": d(-2), "clientName": "Divya Raj", "outcome": "Negotiating"}),
            ("DEMO-TSK-303", "Site visit — Lake View Villa 3", "DEMO-PRJ-OPS", SACHIN, "sitevisit", "Scheduled", "Medium", 1, 5, 5, 0,
             {"siteAddress": "Villa 3, Lake View Estates, Sarjapur Road", "mapLink": "https://maps.google.com/?q=lake+view",
              "visitDate": d(3), "clientName": "Karthik S", "outcome": ""}),
            ("DEMO-TSK-304", "Document verification — Sale deed GV-24", "DEMO-PRJ-OPS", SACHIN, "docverify", "Verified", "High", -12, -6, 8, 100,
             {"documentType": "Agreement", "referenceNo": "GV-24-SD-2026", "result": "Valid"}),
            ("DEMO-TSK-305", "Document verification — ID proof batch", "DEMO-PRJ-OPS", SACHIN, "docverify", "In Review", "Medium", -4, 4, 6, 50,
             {"documentType": "ID Proof", "referenceNo": "IDB-118", "result": "Needs Clarification"}),
            ("DEMO-TSK-306", "Legal verification — Lake View title", "DEMO-PRJ-OPS", SACHIN, "docverify", "Pending", "High", -9, -2, 10, 20,
             {"documentType": "Agreement", "referenceNo": "LV-TITLE-07", "result": "Invalid"}),  # overdue
        ]
        DONE = {"Completed", "Connected", "Closed", "Published", "Done", "Report Submitted", "Verified"}
        for (tid, name, pid, who, cat, status, prio, so, eo, est, prog, custom) in tasks:
            completed_at = dt(eo, 16, 30) if status in DONE else None
            db.add(Task(
                id=tid, code=tid, name=name, description="", project_id=pid, assigned_to=who,
                reviewer_id=OWNER, created_by=OWNER, priority=prio, status=status,
                progress=(100 if status in DONE else prog), start_date=d(so), end_date=d(eo),
                estimated_hours=est, category=cat, custom_data=json.dumps(custom), completed_at=completed_at,
            ))
        db.flush()

        # ---------- Leads on Ravi's sales task ----------
        funnel = (["Converted"] * 6 + ["Interested"] * 7 + ["Contacted"] * 10 + ["New"] * 9 + ["Lost"] * 4)
        random.shuffle(funnel)
        companies = ["", "Self", "TechMahindra", "Infosys", "Wipro", "Self", "", "Flipkart", "Self"]
        for i, nm in enumerate(NAMES):
            st = funnel[i % len(funnel)]
            src = SOURCES[i % len(SOURCES)]
            note = {
                "New": "Fresh enquiry, to be called.",
                "Contacted": f"Spoke with client; next follow-up {d(random.randint(1, 5))}.",
                "Interested": f"Interested in 2BHK; site visit planned {d(random.randint(1, 4))}.",
                "Converted": "Booked — token advance received.",
                "Lost": "Budget mismatch; not proceeding.",
            }[st]
            db.add(Lead(task_id="DEMO-TSK-101", name=nm, email=nm.lower().replace(" ", ".") + "@example.com",
                        phone=phone(i), company=companies[i % len(companies)], status=st, source=src,
                        notes=note, created_at=dt(-random.randint(1, 25), 11, 0)))

        # ---------- Timesheets: last 30 days, skip Sundays, ~2 leave days each ----------
        worker_tasks = {
            RAVI: ["DEMO-TSK-101", "DEMO-TSK-102", "DEMO-TSK-103"],
            ANITA: ["DEMO-TSK-201", "DEMO-TSK-202", "DEMO-TSK-203"],
            SACHIN: ["DEMO-TSK-301", "DEMO-TSK-304", "DEMO-TSK-305"],
        }
        worker_project = {RAVI: "DEMO-PRJ-LEAD", ANITA: "DEMO-PRJ-MKT", SACHIN: "DEMO-PRJ-OPS"}
        remarks_by = {
            RAVI: ["Called 20+ leads, 5 interested.", "Follow-ups with hot leads; 1 booking.",
                   "Cold-calling new enquiries.", "Updated CRM; scheduled 3 site visits."],
            ANITA: ["Optimised Facebook campaign; CTR up.", "Created Instagram creatives.",
                    "Reviewed Google Ads keywords.", "Prepared weekly performance report."],
            SACHIN: ["Site visit at Green Valley; client interested.", "Document verification — sale deed.",
                     "Client meeting + property inspection.", "Legal verification follow-up."],
        }
        ts_count = 0
        for who in (RAVI, ANITA, SACHIN):
            leaves = {random.randint(2, 28), random.randint(2, 28)}
            n = 0
            for back in range(1, 31):
                dd = TODAY - timedelta(days=back)
                if dd.weekday() == 6:            # skip Sundays
                    continue
                if back in leaves:                # a couple of leave days
                    continue
                n += 1
                short = random.random() < 0.15     # ~15% short days
                start_h = 9
                end_h, end_m = (13, 30) if short else (random.choice([17, 18]), random.choice([0, 30]))
                hours = round((end_h + end_m / 60) - start_h, 2)
                status = "Approved" if back > 7 else ("Pending" if random.random() < 0.2 else "Submitted")
                db.add(Timesheet(
                    id=f"DEMO-TS-{who[-2:]}-{n:02d}", code=f"DEMO-TS-{who[-2:]}-{n:02d}",
                    user_id=who, project_id=worker_project[who], task_id=random.choice(worker_tasks[who]),
                    work_date=dd.isoformat(), from_time="09:00 AM",
                    to_time=f"{(end_h-12) if end_h>12 else end_h}:{end_m:02d} PM",
                    total_hours=hours, status=status, remarks=random.choice(remarks_by[who]),
                    created_at=dt(-back, 18, 0),
                ))
                ts_count += 1

        # ---------- Notifications (recent activity) ----------
        notifs = [
            (RAVI, "task", "Task Completed", "Ravi Kumar closed 'Close hot leads — booking'.", "DEMO-TSK-106", -3),
            (ANITA, "task", "Campaign Published", "Anita Sharma published 'Facebook Ads — Green Valley Launch'.", "DEMO-TSK-201", -4),
            (SACHIN, "task", "Report Submitted", "Sachin Verma submitted the site visit report for Green Valley Plot 24.", "DEMO-TSK-301", -8),
            (None, "task", "New Leads Imported", "36 new leads added to 'Q4 Lead Outreach — Green Valley'.", "DEMO-TSK-101", -2),
            (SACHIN, "task", "Document Verified", "Sale deed GV-24 verified as Valid.", "DEMO-TSK-304", -6),
            (ANITA, "task", "Task Status Updated", "Anita Sharma set 'Google Ads — Lake View Estates' to In Progress.", "DEMO-TSK-203", -1),
            (RAVI, "task", "Follow-up Due", "Follow-up calls with interested buyers due soon.", "DEMO-TSK-102", -1),
            (SACHIN, "task", "Site Visit Scheduled", "Lake View Villa 3 visit scheduled.", "DEMO-TSK-303", 0),
        ]
        for (uid, typ, title, msg, tid, off) in notifs:
            db.add(Notification(user_id=uid, type=typ, title=title, message=msg, task_id=tid,
                                is_read=False, created_at=dt(off, 10, 0)))

        db.commit()

        print("Seeded demo data:")
        print(f"  projects : {db.query(Project).filter(Project.id.like('DEMO-%')).count()}")
        print(f"  tasks    : {db.query(Task).filter(Task.id.like('DEMO-%')).count()}")
        print(f"  leads    : {db.query(Lead).filter(Lead.task_id.like('DEMO-%')).count()}")
        print(f"  timesheets: {ts_count}")
        print(f"  notifications: {len(notifs)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
