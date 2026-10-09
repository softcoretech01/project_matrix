# backend/test_api_suite.py
import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:5001/api"

def make_request(path, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            try:
                return response.status, json.loads(res_body) if res_body else {}
            except Exception:
                return response.status, {"raw": res_body}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body) if err_body else {}
        except Exception:
            return e.code, {"raw": err_body}

def run_tests():
    print("=" * 60)
    print("Starting End-to-End API Test Suite for ProjectMatrix")
    print("=" * 60)
    
    passed = 0
    failed = 0

    def assert_test(name, condition, extra=""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {name}")
            passed += 1
        else:
            print(f"  [FAIL] {name} - {extra}")
            failed += 1

    # 1. Auth Login Test
    status_code, body = make_request("/auth/login", method="POST", data={
        "email": "admin@taskmanagement.com",
        "password": "admin123"
    })
    assert_test("POST /auth/login - Admin Login", status_code == 200 and body.get("role") == "Admin", f"Got {status_code}: {body}")
    token = body.get("token")
    auth_headers = {"Authorization": f"Bearer {token}", "x-user-id": body.get("id", "1")}

    # 2. Employees Endpoint Test
    status_code, emps = make_request("/employees", headers=auth_headers)
    assert_test("GET /employees - List Employees", status_code == 200 and len(emps) >= 5, f"Got {status_code}: {emps}")

    # 3. Projects Endpoint Test
    status_code, projs = make_request("/projects", headers=auth_headers)
    assert_test("GET /projects - List Projects", status_code == 200 and len(projs) >= 2, f"Got {status_code}: {projs}")

    # 4. Create New Project Test
    status_code, new_proj = make_request("/projects", method="POST", data={
        "name": "Automated Test Project",
        "code": "ATP-01",
        "description": "Created during automated verification",
        "ownerId": "2",
        "status": "Active",
        "reviewRequired": True
    }, headers=auth_headers)
    assert_test("POST /projects - Create Project", status_code == 200 and new_proj.get("name") == "Automated Test Project", f"Got {status_code}: {new_proj}")
    proj_id = new_proj.get("id")

    # 5. Modules / Sections Test
    status_code, mods = make_request(f"/modules?projectId=PRJ-01", headers=auth_headers)
    assert_test("GET /modules - List Project Sections", status_code == 200 and len(mods) >= 1, f"Got {status_code}: {mods}")

    # 6. Tasks List Test
    status_code, tasks = make_request("/tasks", headers=auth_headers)
    assert_test("GET /tasks - List All Tasks", status_code == 200 and len(tasks) >= 3, f"Got {status_code}: {tasks}")

    # 7. Create Task & Subtask Test
    status_code, new_task = make_request("/tasks", method="POST", data={
        "name": "Integration Test Task",
        "description": "Verifying subtasks and status transition",
        "projectId": proj_id or "PRJ-01",
        "priority": "High",
        "status": "Open",
        "progress": 0,
        "assignedTo": "3"
    }, headers=auth_headers)
    assert_test("POST /tasks - Create New Task", status_code == 200 and new_task.get("name") == "Integration Test Task", f"Got {status_code}: {new_task}")
    task_id = new_task.get("id")

    # 8. Add Subtask Test
    if task_id:
        status_code, new_sub = make_request(f"/personal/tasks/{task_id}/subtasks", method="POST", data={
            "title": "Subtask Unit 1",
            "isDone": False,
            "sortOrder": 1
        }, headers=auth_headers)
        assert_test("POST /personal/tasks/:id/subtasks - Add Subtask", status_code == 200 and new_sub.get("title") == "Subtask Unit 1", f"Got {status_code}: {new_sub}")

    # 9. Update Task Status Test (State Machine Transition)
    if task_id:
        status_code, updated_task = make_request(f"/tasks/{task_id}", method="PUT", data={
            "status": "In Progress",
            "progress": 50
        }, headers=auth_headers)
        assert_test("PUT /tasks/:id - Move to In Progress (50%)", status_code == 200 and updated_task.get("status") == "In Progress" and updated_task.get("progress") == 50, f"Got {status_code}: {updated_task}")

    # 10. Labels Test
    status_code, labels = make_request("/labels", headers=auth_headers)
    assert_test("GET /labels - List Color Tags", status_code == 200 and len(labels) >= 5, f"Got {status_code}: {labels}")

    # 11. Admin Portal Diagnostics Test
    status_code, diag = make_request("/admin/diagnostics", headers=auth_headers)
    assert_test("GET /admin/diagnostics - Health & Counts", status_code == 200 and diag.get("databaseConnected") is True, f"Got {status_code}: {diag}")

    # 12. Admin Roles Distribution Test
    status_code, roles_data = make_request("/admin/roles", headers=auth_headers)
    assert_test("GET /admin/roles - RBAC Summary", status_code == 200 and "roles" in roles_data, f"Got {status_code}: {roles_data}")

    # 13. Reports Effort Test
    status_code, effort_rep = make_request("/reports/effort", headers=auth_headers)
    assert_test("GET /reports/effort - Executive Effort Analytics", status_code == 200 and len(effort_rep) >= 1, f"Got {status_code}: {effort_rep}")

    # 14. Master Portal Clients Test
    status_code, clients = make_request("/masters/clients", headers=auth_headers)
    assert_test("GET /masters/clients - Master Clients List", status_code == 200 and len(clients) >= 2, f"Got {status_code}: {clients}")

    print("=" * 60)
    print(f"Test Results: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
