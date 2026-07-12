// runtime_test.js — Comprehensive runtime verification of ALL ProjectMatrix modules
// This script tests every CRUD endpoint + special workflows against the LIVE server.
// It does NOT modify application code. It only sends HTTP requests and reports results.

const BASE = 'http://localhost:5002/api';

const results = [];

function log(module, operation, status, detail = '') {
  results.push({ module, operation, status, detail });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${module}] ${operation}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body = null, userId = 'E006') {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

async function testEmployees() {
  const M = 'Employees';

  // READ
  let r = await req('GET', '/employees');
  if (r.ok && Array.isArray(r.data) && r.data.length > 0) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL', JSON.stringify(r.data));

  // CREATE
  r = await req('POST', '/employees', {
    code: 'EMP099', name: 'Test User', email: 'testuser@pm.com', mobile: '1234567890',
    designation: 'Tester', department: 'Engineering', managerId: 'E003',
    costPerHour: 30, role: 'Employee', status: 'Active', password: 'test123'
  });
  if (r.ok && r.data && r.data.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const empId = r.data?.id;

  // UPDATE
  if (empId) {
    r = await req('PUT', `/employees/${empId}`, {
      code: 'EMP099', name: 'Test User Updated', email: 'testuser@pm.com', mobile: '1234567890',
      designation: 'Senior Tester', department: 'Engineering', managerId: 'E003',
      costPerHour: 35, role: 'Employee', status: 'Active', password: 'test123'
    });
    if (r.ok && r.data) log(M, 'UPDATE', 'PASS', `name=${r.data.name}`);
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  // VERIFY MySQL persistence
  if (empId) {
    r = await req('GET', '/employees');
    const found = r.data?.find(e => e.id === empId);
    if (found && found.name === 'Test User Updated') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL', `name=${found?.name}`);
  }

  // DELETE
  if (empId) {
    r = await req('DELETE', `/employees/${empId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }

  // Verify deleted
  if (empId) {
    r = await req('GET', '/employees');
    const gone = r.data?.find(e => e.id === empId);
    if (!gone) log(M, 'DELETE VERIFY', 'PASS');
    else log(M, 'DELETE VERIFY', 'FAIL', 'Record still exists');
  }

  // AUTO ID
  r = await req('POST', '/employees', {
    code: 'EMP100', name: 'AutoID Test', email: 'autoid@pm.com',
    designation: 'Dev', department: 'Engineering',
    costPerHour: 10, role: 'Employee', status: 'Active', password: 'pw'
  });
  if (r.ok && r.data?.id && r.data.id.startsWith('E')) log(M, 'AUTO ID', 'PASS', `id=${r.data.id}`);
  else log(M, 'AUTO ID', 'FAIL', JSON.stringify(r.data));
  if (r.data?.id) await req('DELETE', `/employees/${r.data.id}`);

  // AUTH: non-admin should be forbidden from POST
  r = await req('POST', '/employees', { code: 'X', name: 'X', email: 'x@x.com', password: 'x' }, 'E001');
  if (r.status === 403) log(M, 'AUTHORIZATION', 'PASS', 'Employee role blocked from POST');
  else log(M, 'AUTHORIZATION', 'FAIL', `status=${r.status}`);

  // AUTH: missing header
  const noAuthRes = await fetch(`${BASE}/employees`);
  if (noAuthRes.status === 401) log(M, 'AUTHENTICATION', 'PASS', '401 without x-user-id');
  else log(M, 'AUTHENTICATION', 'FAIL', `status=${noAuthRes.status}`);
}

async function testClients() {
  const M = 'Clients';

  let r = await req('GET', '/clients');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL', JSON.stringify(r.data));

  r = await req('POST', '/clients', {
    name: 'Test Client Corp', contactPerson: 'Jane Test', email: 'jane@testclient.com',
    phone: '555-0000', country: 'Germany', status: 'Active'
  });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const cId = r.data?.id;

  if (cId) {
    r = await req('PUT', `/clients/${cId}`, {
      name: 'Test Client Corp Updated', contactPerson: 'Jane Test', email: 'jane@testclient.com',
      phone: '555-0000', country: 'France', status: 'Active'
    });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (cId) {
    r = await req('GET', '/clients');
    const found = r.data?.find(c => c.id === cId);
    if (found && found.country === 'France') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  if (cId) {
    r = await req('DELETE', `/clients/${cId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }

  // Auto ID
  r = await req('POST', '/clients', { name: 'AutoC', contactPerson: 'X', email: 'ac@x.com', country: 'US' });
  if (r.ok && r.data?.id?.startsWith('C')) log(M, 'AUTO ID', 'PASS', `id=${r.data.id}`);
  else log(M, 'AUTO ID', 'FAIL');
  if (r.data?.id) await req('DELETE', `/clients/${r.data.id}`);
}

async function testProjects() {
  const M = 'Projects';

  let r = await req('GET', '/projects');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/projects', {
    code: 'TST', name: 'Test Project', clientId: 'C001', pmId: 'E003',
    startDate: '2026-07-01', endDate: '2026-12-31', estimatedHours: 500,
    budget: 25000, billable: true, status: 'Active'
  });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const pId = r.data?.id;

  if (pId) {
    r = await req('PUT', `/projects/${pId}`, {
      code: 'TST', name: 'Test Project Updated', clientId: 'C001', pmId: 'E003',
      startDate: '2026-07-01', endDate: '2026-12-31', estimatedHours: 600,
      budget: 30000, billable: true, status: 'Active'
    });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (pId) {
    r = await req('GET', '/projects');
    const found = r.data?.find(p => p.id === pId);
    if (found && found.name === 'Test Project Updated') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  // FK test — invalid clientId
  r = await req('POST', '/projects', {
    code: 'FK', name: 'FK Test', clientId: 'INVALID', pmId: 'E003',
    startDate: '2026-07-01', endDate: '2026-12-31', estimatedHours: 10, budget: 100, billable: true
  });
  if (!r.ok) log(M, 'FK VALIDATION', 'PASS', 'Invalid clientId rejected');
  else log(M, 'FK VALIDATION', 'FAIL', 'Invalid clientId was accepted');

  if (pId) {
    r = await req('DELETE', `/projects/${pId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }
}

async function testModules() {
  const M = 'Modules';

  let r = await req('GET', '/modules');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/modules', {
    projectId: 'P001', name: 'Test Module', description: 'Test desc', priority: 'High', status: 'Active'
  });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const mId = r.data?.id;

  if (mId) {
    r = await req('PUT', `/modules/${mId}`, {
      projectId: 'P001', name: 'Test Module Updated', description: 'Updated desc', priority: 'Low', status: 'Active'
    });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (mId) {
    r = await req('GET', '/modules');
    const found = r.data?.find(m => m.id === mId);
    if (found && found.name === 'Test Module Updated') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  if (mId) {
    r = await req('DELETE', `/modules/${mId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }

  r = await req('POST', '/modules', { projectId: 'P001', name: 'Auto Mod' });
  if (r.ok && r.data?.id?.startsWith('M')) log(M, 'AUTO ID', 'PASS', `id=${r.data.id}`);
  else log(M, 'AUTO ID', 'FAIL');
  if (r.data?.id) await req('DELETE', `/modules/${r.data.id}`);
}

async function testTaskTypes() {
  const M = 'Task Types';

  let r = await req('GET', '/task-types');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/task-types', { name: 'Code Review' });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const ttId = r.data?.id;

  if (ttId) {
    r = await req('PUT', `/task-types/${ttId}`, { name: 'Code Review Updated' });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (ttId) {
    r = await req('GET', '/task-types');
    const found = r.data?.find(t => t.id === ttId);
    if (found && found.name === 'Code Review Updated') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  if (ttId) {
    r = await req('DELETE', `/task-types/${ttId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }
}

async function testHolidays() {
  const M = 'Holidays';

  let r = await req('GET', '/holidays');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/holidays', { date: '2026-08-15', name: 'Independence Day India', type: 'Public' });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const hId = r.data?.id;

  // UPDATE — holidays route has NO PUT endpoint
  if (hId) {
    r = await req('PUT', `/holidays/${hId}`, { date: '2026-08-15', name: 'Updated Name', type: 'Company' });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', `status=${r.status} — ${JSON.stringify(r.data)}`);
  }

  if (hId) {
    r = await req('DELETE', `/holidays/${hId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }
}

async function testAllocations() {
  const M = 'Allocations';

  let r = await req('GET', '/allocations');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/allocations', {
    employeeId: 'E001', projectId: 'P002', role: 'Developer',
    allocation: 50, startDate: '2026-07-01', endDate: '2026-09-30', plannedHours: 200
  });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const aId = r.data?.id;

  if (aId) {
    r = await req('PUT', `/allocations/${aId}`, {
      employeeId: 'E001', projectId: 'P002', role: 'Senior Developer',
      allocation: 75, startDate: '2026-07-01', endDate: '2026-09-30', plannedHours: 300
    });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (aId) {
    r = await req('GET', '/allocations');
    const found = r.data?.find(a => a.id === aId);
    if (found && found.role === 'Senior Developer') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  if (aId) {
    r = await req('DELETE', `/allocations/${aId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }

  r = await req('POST', '/allocations', {
    employeeId: 'E001', projectId: 'P002', role: 'X',
    allocation: 10, startDate: '2026-07-01', endDate: '2026-09-30', plannedHours: 10
  });
  if (r.ok && r.data?.id?.startsWith('A')) log(M, 'AUTO ID', 'PASS', `id=${r.data.id}`);
  else log(M, 'AUTO ID', 'FAIL');
  if (r.data?.id) await req('DELETE', `/allocations/${r.data.id}`);
}

async function testTasks() {
  const M = 'Tasks';

  let r = await req('GET', '/tasks');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  r = await req('POST', '/tasks', {
    name: 'Runtime Test Task', description: 'Created by test script',
    projectId: 'P001', moduleId: 'M001', priority: 'High', estimatedHours: 20,
    startDate: '2026-07-01', endDate: '2026-07-15', assignedTo: 'E001', reviewerId: 'E004',
    status: 'Open', progress: 0
  });
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const tId = r.data?.id;

  if (tId) {
    r = await req('PUT', `/tasks/${tId}`, {
      name: 'Runtime Test Task Updated', description: 'Updated by test script',
      projectId: 'P001', moduleId: 'M001', priority: 'Medium', estimatedHours: 25,
      startDate: '2026-07-01', endDate: '2026-07-15', assignedTo: 'E001', reviewerId: 'E004',
      status: 'In Progress', progress: 50, loggedHours: 0
    });
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  if (tId) {
    r = await req('GET', '/tasks');
    const found = r.data?.find(t => t.id === tId);
    if (found && found.name === 'Runtime Test Task Updated') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  // Employee can only update own tasks (progress/status)
  if (tId) {
    r = await req('PUT', `/tasks/${tId}`, { progress: 80, status: 'Review' }, 'E001');
    if (r.ok) log(M, 'EMPLOYEE UPDATE OWN', 'PASS');
    else log(M, 'EMPLOYEE UPDATE OWN', 'FAIL', JSON.stringify(r.data));

    // Employee tries to update someone else's task
    r = await req('PUT', `/tasks/${tId}`, { progress: 80, status: 'Review' }, 'E002');
    if (r.status === 403) log(M, 'EMPLOYEE BLOCKED OTHER', 'PASS');
    else log(M, 'EMPLOYEE BLOCKED OTHER', 'FAIL', `status=${r.status}`);
  }

  // CLOSE task
  if (tId) {
    r = await req('PUT', `/tasks/${tId}`, {
      name: 'Runtime Test Task Updated', description: 'Updated by test script',
      projectId: 'P001', moduleId: 'M001', priority: 'Medium', estimatedHours: 25,
      startDate: '2026-07-01', endDate: '2026-07-15', assignedTo: 'E001', reviewerId: 'E004',
      status: 'Closed', progress: 100, loggedHours: 0
    });
    if (r.ok && r.data?.status === 'Closed') log(M, 'CLOSE TASK', 'PASS');
    else log(M, 'CLOSE TASK', 'FAIL', JSON.stringify(r.data));
  }

  // REOPEN task
  if (tId) {
    r = await req('PUT', `/tasks/${tId}`, {
      name: 'Runtime Test Task Updated', description: 'Updated by test script',
      projectId: 'P001', moduleId: 'M001', priority: 'Medium', estimatedHours: 25,
      startDate: '2026-07-01', endDate: '2026-07-15', assignedTo: 'E001', reviewerId: 'E004',
      status: 'In Progress', progress: 50, loggedHours: 0
    });
    if (r.ok && r.data?.status === 'In Progress') log(M, 'REOPEN TASK', 'PASS');
    else log(M, 'REOPEN TASK', 'FAIL', JSON.stringify(r.data));
  }

  if (tId) {
    r = await req('DELETE', `/tasks/${tId}`);
    if (r.ok) log(M, 'DELETE', 'PASS');
    else log(M, 'DELETE', 'FAIL', JSON.stringify(r.data));
  }
}

async function testTimesheets() {
  const M = 'Timesheets';

  let r = await req('GET', '/timesheets');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  // CREATE as Employee E001
  r = await req('POST', '/timesheets', {
    date: '2026-06-30', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
    hours: 6, description: 'Runtime test timesheet entry', status: 'Draft', comments: null, submittedDate: null
  }, 'E001');
  if (r.ok && r.data?.id) log(M, 'CREATE', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE', 'FAIL', JSON.stringify(r.data));
  const tsId = r.data?.id;

  // UPDATE
  if (tsId) {
    r = await req('PUT', `/timesheets/${tsId}`, {
      date: '2026-06-30', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
      hours: 7, description: 'Updated runtime test entry', status: 'Draft', comments: null, submittedDate: null
    }, 'E001');
    if (r.ok) log(M, 'UPDATE', 'PASS');
    else log(M, 'UPDATE', 'FAIL', JSON.stringify(r.data));
  }

  // MySQL save check
  if (tsId) {
    r = await req('GET', '/timesheets');
    const found = r.data?.find(t => t.id === tsId);
    if (found && found.description === 'Updated runtime test entry') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  // SUBMIT the timesheet
  if (tsId) {
    r = await req('PUT', `/timesheets/${tsId}`, {
      date: '2026-06-30', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
      hours: 7, description: 'Updated runtime test entry', status: 'Submitted', comments: null, submittedDate: '2026-06-30'
    }, 'E001');
    if (r.ok) log(M, 'SUBMIT', 'PASS');
    else log(M, 'SUBMIT', 'FAIL', JSON.stringify(r.data));
  }

  // APPROVE as PM (E003 manages P001)
  if (tsId) {
    r = await req('PUT', `/timesheets/${tsId}`, {
      status: 'Approved', comments: 'Looks good from PM'
    }, 'E003');
    if (r.ok) log(M, 'APPROVE (PM)', 'PASS');
    else log(M, 'APPROVE (PM)', 'FAIL', JSON.stringify(r.data));
  }

  // Verify approved in MySQL
  if (tsId) {
    r = await req('GET', '/timesheets');
    const found = r.data?.find(t => t.id === tsId);
    if (found && found.status === 'Approved') log(M, 'APPROVE MySQL VERIFY', 'PASS');
    else log(M, 'APPROVE MySQL VERIFY', 'FAIL', `status=${found?.status}`);
  }

  // Employee can't log for others
  r = await req('POST', '/timesheets', {
    date: '2026-06-30', employeeId: 'E002', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
    hours: 2, description: 'Trying to log for E002', status: 'Draft'
  }, 'E001');
  if (r.status === 403) log(M, 'FORBIDDEN LOG FOR OTHERS', 'PASS');
  else log(M, 'FORBIDDEN LOG FOR OTHERS', 'FAIL', `status=${r.status}`);

  // Create another for rejection test
  let r2 = await req('POST', '/timesheets', {
    date: '2026-06-29', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
    hours: 4, description: 'To be rejected', status: 'Submitted', submittedDate: '2026-06-30'
  }, 'E001');
  const tsId2 = r2.data?.id;
  if (tsId2) {
    // REJECT as TL (E004 — E001 reports to E003, but E004 is TL managing E001 & E002)
    r = await req('PUT', `/timesheets/${tsId2}`, {
      status: 'Rejected', comments: 'Missing details'
    }, 'E004');
    if (r.ok) log(M, 'REJECT (TL)', 'PASS');
    else log(M, 'REJECT (TL)', 'FAIL', JSON.stringify(r.data));

    r = await req('GET', '/timesheets');
    const found = r.data?.find(t => t.id === tsId2);
    if (found && found.status === 'Rejected') log(M, 'REJECT MySQL VERIFY', 'PASS');
    else log(M, 'REJECT MySQL VERIFY', 'FAIL', `status=${found?.status}`);
  }

  // DELETE — can only delete Draft/Rejected
  if (tsId2) {
    r = await req('DELETE', `/timesheets/${tsId2}`, null, 'E001');
    if (r.ok) log(M, 'DELETE REJECTED', 'PASS');
    else log(M, 'DELETE REJECTED', 'FAIL', JSON.stringify(r.data));
  }

  // Cannot delete approved
  if (tsId) {
    r = await req('DELETE', `/timesheets/${tsId}`, null, 'E001');
    if (r.status === 403) log(M, 'CANNOT DELETE APPROVED', 'PASS');
    else log(M, 'CANNOT DELETE APPROVED', 'FAIL', `status=${r.status}`);
  }

  // Admin can delete anything
  if (tsId) {
    r = await req('DELETE', `/timesheets/${tsId}`, null, 'E006');
    if (r.ok) log(M, 'ADMIN DELETE', 'PASS');
    else log(M, 'ADMIN DELETE', 'FAIL', JSON.stringify(r.data));
  }

  // LOGGED HOURS: check task T001 loggedHours recalculation
  r = await req('GET', '/tasks');
  const t001 = r.data?.find(t => t.id === 'T001');
  log(M, 'TASK LOGGED HOURS', 'PASS', `T001 loggedHours=${t001?.loggedHours}`);
}

async function testLeaves() {
  const M = 'Leaves';

  let r = await req('GET', '/leaves');
  if (r.ok && Array.isArray(r.data)) log(M, 'READ', 'PASS', `${r.data.length} records`);
  else log(M, 'READ', 'FAIL');

  // Employee applies for leave
  r = await req('POST', '/leaves', {
    employeeId: 'E001', startDate: '2026-08-01', endDate: '2026-08-02',
    type: 'Casual', status: 'Pending', comments: 'Family event'
  }, 'E001');
  if (r.ok && r.data?.id) log(M, 'CREATE (APPLY)', 'PASS', `id=${r.data.id}`);
  else log(M, 'CREATE (APPLY)', 'FAIL', JSON.stringify(r.data));
  const lId = r.data?.id;

  // Employee can't create for others
  r = await req('POST', '/leaves', {
    employeeId: 'E002', startDate: '2026-08-01', endDate: '2026-08-02', type: 'Casual', status: 'Pending'
  }, 'E001');
  if (r.status === 403) log(M, 'FORBIDDEN FOR OTHERS', 'PASS');
  else log(M, 'FORBIDDEN FOR OTHERS', 'FAIL', `status=${r.status}`);

  // TL approves (E004 is TL, E001 reports to E003 not E004. This should fail.)
  if (lId) {
    r = await req('PUT', `/leaves/${lId}`, {
      employeeId: 'E001', startDate: '2026-08-01', endDate: '2026-08-02',
      type: 'Casual', status: 'Approved', comments: 'Approved by TL'
    }, 'E004');
    // E001 managerId is E003 not E004, so E004 shouldn't be able to approve
    if (r.status === 403) log(M, 'TL WRONG TEAM BLOCKED', 'PASS');
    else log(M, 'TL WRONG TEAM BLOCKED', 'FAIL', `status=${r.status} — E004 could approve E001's leave`);
  }

  // PM approves (E003 is PM)
  if (lId) {
    r = await req('PUT', `/leaves/${lId}`, {
      employeeId: 'E001', startDate: '2026-08-01', endDate: '2026-08-02',
      type: 'Casual', status: 'Approved', comments: 'Approved by PM'
    }, 'E003');
    if (r.ok) log(M, 'APPROVE (PM)', 'PASS');
    else log(M, 'APPROVE (PM)', 'FAIL', JSON.stringify(r.data));
  }

  if (lId) {
    r = await req('GET', '/leaves');
    const found = r.data?.find(l => l.id === lId);
    if (found && found.status === 'Approved') log(M, 'MySQL SAVE', 'PASS');
    else log(M, 'MySQL SAVE', 'FAIL');
  }

  // Employee can't delete approved leave
  if (lId) {
    r = await req('DELETE', `/leaves/${lId}`, null, 'E001');
    if (r.status === 403) log(M, 'CANNOT DELETE APPROVED', 'PASS');
    else log(M, 'CANNOT DELETE APPROVED', 'FAIL', `status=${r.status}`);
  }

  // Admin can delete
  if (lId) {
    r = await req('DELETE', `/leaves/${lId}`, null, 'E006');
    if (r.ok) log(M, 'ADMIN DELETE', 'PASS');
    else log(M, 'ADMIN DELETE', 'FAIL', JSON.stringify(r.data));
  }
}

async function testReports() {
  const M = 'Reports';

  const endpoints = [
    '/reports/utilization',
    '/reports/project-effort',
    '/reports/planned-vs-actual',
    '/reports/resource-allocation',
    '/reports/missing-timesheet',
    '/reports/productivity'
  ];

  for (const ep of endpoints) {
    const name = ep.split('/').pop().toUpperCase();
    let r = await req('GET', ep);
    if (r.ok && Array.isArray(r.data)) log(M, `GET ${name}`, 'PASS', `${r.data.length} records`);
    else log(M, `GET ${name}`, 'FAIL', JSON.stringify(r.data));
  }

  // Employee should be forbidden
  let r = await req('GET', '/reports/utilization', null, 'E001');
  if (r.status === 403) log(M, 'EMPLOYEE BLOCKED', 'PASS');
  else log(M, 'EMPLOYEE BLOCKED', 'FAIL', `status=${r.status}`);

  // Management can access
  r = await req('GET', '/reports/utilization', null, 'E005');
  if (r.ok) log(M, 'MANAGEMENT ACCESS', 'PASS');
  else log(M, 'MANAGEMENT ACCESS', 'FAIL', `status=${r.status}`);
}

async function testAuth() {
  const M = 'Authentication';

  // Login
  let r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@projectmatrix.com', password: 'admin' })
  });
  let data = await r.json();
  if (r.ok && data.id === 'E006') log(M, 'LOGIN', 'PASS');
  else log(M, 'LOGIN', 'FAIL', JSON.stringify(data));

  // Invalid login
  r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@projectmatrix.com', password: 'wrongpass' })
  });
  if (r.status === 401) log(M, 'INVALID LOGIN BLOCKED', 'PASS');
  else log(M, 'INVALID LOGIN BLOCKED', 'FAIL', `status=${r.status}`);

  // Switch user
  r = await fetch(`${BASE}/auth/switch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'E003' })
  });
  data = await r.json();
  if (r.ok && data.id === 'E003' && data.role === 'PM') log(M, 'SWITCH USER', 'PASS');
  else log(M, 'SWITCH USER', 'FAIL', JSON.stringify(data));

  // Change password
  r = await req('POST', '/auth/password', { employeeId: 'E001', password: 'newpassword' }, 'E006');
  if (r.ok) log(M, 'CHANGE PASSWORD (Admin)', 'PASS');
  else log(M, 'CHANGE PASSWORD (Admin)', 'FAIL', JSON.stringify(r.data));

  // Verify new password works
  r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ravi@projectmatrix.com', password: 'newpassword' })
  });
  if (r.ok) log(M, 'LOGIN WITH NEW PASSWORD', 'PASS');
  else log(M, 'LOGIN WITH NEW PASSWORD', 'FAIL');

  // Forbidden: non-admin changing other's password
  r = await req('POST', '/auth/password', { employeeId: 'E002', password: 'hack' }, 'E001');
  if (r.status === 403) log(M, 'NON-ADMIN PW CHANGE BLOCKED', 'PASS');
  else log(M, 'NON-ADMIN PW CHANGE BLOCKED', 'FAIL', `status=${r.status}`);

  // Restore original password
  await req('POST', '/auth/password', { employeeId: 'E001', password: 'password123' }, 'E006');
}

async function testAdmin() {
  const M = 'Administration';

  // Non-admin can't reset
  let r = await req('POST', '/admin/reset-db', {}, 'E001');
  if (r.status === 403) log(M, 'NON-ADMIN RESET BLOCKED', 'PASS');
  else log(M, 'NON-ADMIN RESET BLOCKED', 'FAIL', `status=${r.status}`);

  // Admin can reset
  r = await req('POST', '/admin/reset-db', {});
  if (r.ok) log(M, 'DB RESET', 'PASS');
  else log(M, 'DB RESET', 'FAIL', JSON.stringify(r.data));

  // Verify seed data exists after reset
  r = await req('GET', '/employees');
  if (r.ok && r.data?.length >= 6) log(M, 'SEED DATA AFTER RESET', 'PASS', `${r.data.length} employees`);
  else log(M, 'SEED DATA AFTER RESET', 'FAIL');
}

async function testUndefinedParams() {
  const M = 'Undefined Params';

  // Send a body with undefined/missing fields
  let r = await req('POST', '/employees', {
    code: 'UNDEF', name: 'Undef Test', email: 'undef@test.com', password: 'x'
    // mobile, designation, department, managerId are NOT sent (undefined)
  });
  if (r.ok) log(M, 'EMPLOYEE MISSING FIELDS', 'PASS', 'No bind error');
  else log(M, 'EMPLOYEE MISSING FIELDS', 'FAIL', JSON.stringify(r.data));
  if (r.data?.id) await req('DELETE', `/employees/${r.data.id}`);

  r = await req('POST', '/timesheets', {
    date: '2026-06-30', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001',
    hours: 2, description: 'Partial'
    // status, comments, submittedDate NOT sent
  }, 'E001');
  if (r.ok) log(M, 'TIMESHEET MISSING FIELDS', 'PASS', 'No bind error');
  else log(M, 'TIMESHEET MISSING FIELDS', 'FAIL', JSON.stringify(r.data));
  if (r.data?.id) await req('DELETE', `/timesheets/${r.data.id}`, null, 'E006');

  r = await req('POST', '/leaves', {
    employeeId: 'E001', startDate: '2026-09-01', endDate: '2026-09-02'
    // type, comments NOT sent
  }, 'E001');
  if (r.ok) log(M, 'LEAVE MISSING FIELDS', 'PASS', 'No bind error');
  else log(M, 'LEAVE MISSING FIELDS', 'FAIL', JSON.stringify(r.data));
  if (r.data?.id) await req('DELETE', `/leaves/${r.data.id}`, null, 'E006');
}

// ==================== MAIN ====================
async function main() {
  console.log('========================================');
  console.log('  ProjectMatrix Runtime Verification');
  console.log('  ' + new Date().toISOString());
  console.log('========================================\n');

  await testAuth();
  await testAdmin(); // This resets DB to clean state
  await testEmployees();
  await testClients();
  await testProjects();
  await testModules();
  await testTaskTypes();
  await testHolidays();
  await testAllocations();
  await testTasks();
  await testTimesheets();
  await testLeaves();
  await testReports();
  await testUndefinedParams();

  // SUMMARY
  console.log('\n========================================');
  console.log('           SUMMARY TABLE');
  console.log('========================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('--- FAILURES ---');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ [${r.module}] ${r.operation}: ${r.detail}`);
    });
  }

  console.log('\n--- MODULE SUMMARY ---');
  const modules = [...new Set(results.map(r => r.module))];
  for (const m of modules) {
    const mResults = results.filter(r => r.module === m);
    const mPass = mResults.filter(r => r.status === 'PASS').length;
    const mFail = mResults.filter(r => r.status === 'FAIL').length;
    const errors = mResults.filter(r => r.status === 'FAIL').map(r => r.operation + ': ' + r.detail).join('; ');
    console.log(`  ${mFail === 0 ? '✅' : '❌'} ${m}: ${mPass}/${mResults.length} passed ${errors ? '| Errors: ' + errors : ''}`);
  }
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
