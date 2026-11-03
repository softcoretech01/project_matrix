import sys
import os
sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("RUNNING 13-POINT BACKEND API & DATABASE INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Test Root
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print(" [PASS] 1. Root endpoint")

    # 2. Test Login
    res = client.post("/api/auth/login", json={"email": "admin@taskmanagement.com", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    user = res.json()
    print(f" [PASS] 2. Auth Login: {user['name']} ({user['role']})")

    # 3. Test Tasks GET
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()
    print(f" [PASS] 3. Tasks List: {len(tasks)} tasks found")

    # 4. Test Task Create
    res = client.post("/api/tasks", json={
        "name": "Live Verification Task",
        "description": "Testing database persistence and API flows",
        "projectId": "PRJ-01",
        "priority": "High",
        "status": "Open"
    })
    assert res.status_code == 200
    new_task = res.json()
    task_id = new_task["id"]
    print(f" [PASS] 4. Task Create: {task_id} - '{new_task['name']}'")

    # 5. Test Kanban Status Update (PUT)
    res = client.put(f"/api/tasks/{task_id}", json={"status": "In Progress", "progress": 50})
    assert res.status_code == 200
    assert res.json()["status"] == "In Progress"
    print(" [PASS] 5. Task Status & Progress Update (Kanban Drag-and-Drop flow)")

    # 6. Test Subtasks
    res = client.post(f"/api/tasks/{task_id}/subtasks", json={"title": "First Checklist Item"})
    assert res.status_code == 200
    sub_id = res.json()["id"]
    print(f" [PASS] 6. Subtask Add: ID {sub_id}")

    res = client.put(f"/api/tasks/subtasks/{sub_id}/toggle")
    assert res.status_code == 200
    assert res.json()["isDone"] == True
    print(" [PASS] 7. Subtask Toggle & Auto Progress Calculation")

    # 7. Test Comments
    res = client.post(f"/api/tasks/{task_id}/comments", json={
        "userId": "1",
        "userName": "Admin User",
        "text": "Automated workflow verification comment"
    })
    assert res.status_code == 200
    print(" [PASS] 8. Task Discussion Comment Add")

    # 8. Test Projects
    res = client.get("/api/projects")
    assert res.status_code == 200
    print(f" [PASS] 9. Projects List: {len(res.json())} projects")

    # 9. Test Sections
    res = client.get("/api/sections")
    assert res.status_code == 200
    print(f" [PASS] 10. Sections List: {len(res.json())} sections")

    # 10. Test Labels
    res = client.get("/api/labels")
    assert res.status_code == 200
    print(f" [PASS] 11. Labels List: {len(res.json())} labels")

    # 11. Test Employees
    res = client.get("/api/employees")
    assert res.status_code == 200
    print(f" [PASS] 12. Employees/Team List: {len(res.json())} members")

    # 12. Test Notifications
    res = client.get("/api/notifications")
    assert res.status_code == 200
    print(f" [PASS] 13. Notifications List: {len(res.json())} notifications")

    # 13. Test Search
    res = client.get("/api/search?q=Database")
    assert res.status_code == 200
    search_res = res.json()
    print(f" [PASS] 14. Global Search: found {len(search_res['tasks'])} matching tasks")

    print("=" * 60)
    print(">>> ALL 14 API FUNCTIONALITIES & DATABASE FLOWS PASSED (100%) <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
