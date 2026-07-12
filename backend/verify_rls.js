// Row-Level Security Verification Test
// Tests all GET endpoints for all 5 roles
// Verifies: no 403, correct filtering, no data leakage

const BASE = 'http://localhost:5002/api';

const USERS = {
  Admin:      { id: 'E006', name: 'Admin User',    role: 'Admin' },
  PM:         { id: 'E003', name: 'Sophia Patel',   role: 'PM' },
  TeamLead:   { id: 'E004', name: "Liam O'Connor",  role: 'Team Lead' },
  Employee1:  { id: 'E001', name: 'Ravi Sharma',    role: 'Employee' },
  Employee2:  { id: 'E002', name: 'Kumar Gupta',    role: 'Employee' },
  Management: { id: 'E005', name: 'Emily Chen',     role: 'Management' }
};

const ENDPOINTS = [
  // Core data endpoints
  { path: '/employees',   label: 'Employees' },
  { path: '/projects',    label: 'Projects' },
  { path: '/clients',     label: 'Clients' },
  { path: '/modules',     label: 'Modules' },
  { path: '/allocations', label: 'Allocations' },
  { path: '/tasks',       label: 'Tasks' },
  { path: '/timesheets',  label: 'Timesheets' },
  { path: '/leaves',      label: 'Leaves' },
  { path: '/holidays',    label: 'Holidays' },
  // Report endpoints
  { path: '/reports/utilization',        label: 'Report: Utilization' },
  { path: '/reports/project-effort',     label: 'Report: Project Effort' },
  { path: '/reports/planned-vs-actual',  label: 'Report: Planned vs Actual' },
  { path: '/reports/resource-allocation',label: 'Report: Resource Allocation' },
  { path: '/reports/missing-timesheet',  label: 'Report: Missing Timesheet' },
  { path: '/reports/productivity',       label: 'Report: Productivity' },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function fetchJSON(url, userId) {
  const res = await fetch(url, { headers: { 'x-user-id': userId } });
  return { status: res.status, data: res.ok ? await res.json() : null, statusText: res.statusText };
}

function assert(condition, msg) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    failures.push(msg);
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('=== Row-Level Security Verification ===\n');

  // ---- Phase 1: No 403 on any GET endpoint for any role ----
  console.log('--- Phase 1: No 403 errors during normal navigation ---');
  // Reports endpoints are NOT accessible to Employee role (no menu item in UI)
  const reportPaths = ['/reports/utilization', '/reports/project-effort', '/reports/planned-vs-actual',
    '/reports/resource-allocation', '/reports/missing-timesheet', '/reports/productivity'];
  
  for (const [roleKey, user] of Object.entries(USERS)) {
    for (const ep of ENDPOINTS) {
      const { status } = await fetchJSON(`${BASE}${ep.path}`, user.id);
      const isReportEp = reportPaths.includes(ep.path);
      const isEmployee = user.role === 'Employee';
      
      if (isReportEp && isEmployee) {
        // Employee should get 403 on reports — this is CORRECT (no UI access)
        assert(status === 403, `${roleKey} should get 403 on ${ep.label} (reports not in Employee menu)`);
      } else {
        assert(status !== 403, `${roleKey} (${user.role}) should not get 403 on ${ep.label} (got ${status})`);
        assert(status === 200, `${roleKey} (${user.role}) should get 200 on ${ep.label} (got ${status})`);
      }
    }
  }

  // ---- Phase 2: Row-level data isolation ----
  console.log('\n--- Phase 2: Row-level data isolation ---');

  // Admin sees all data
  const adminEmps = (await fetchJSON(`${BASE}/employees`, USERS.Admin.id)).data;
  assert(adminEmps.length >= 6, `Admin should see all 6 employees (got ${adminEmps.length})`);
  assert(adminEmps[0].email !== undefined, 'Admin should see sensitive fields like email');
  assert(adminEmps[0].costPerHour !== undefined, 'Admin should see costPerHour');

  // PM: sees only managed-project employees and self
  const pmEmps = (await fetchJSON(`${BASE}/employees`, USERS.PM.id)).data;
  assert(pmEmps.length > 0, `PM should see some employees (got ${pmEmps.length})`);
  assert(pmEmps[0].email === undefined, 'PM should NOT see email field');
  assert(pmEmps[0].costPerHour === undefined, 'PM should NOT see costPerHour');

  const pmProjects = (await fetchJSON(`${BASE}/projects`, USERS.PM.id)).data;
  assert(pmProjects.length > 0, `PM should see managed projects (got ${pmProjects.length})`);
  assert(pmProjects.every(p => p.pmId === USERS.PM.id), 'PM should only see projects where they are PM');

  const pmTasks = (await fetchJSON(`${BASE}/tasks`, USERS.PM.id)).data;
  assert(pmTasks.length > 0, `PM should see tasks for managed projects`);
  const pmProjIds = pmProjects.map(p => p.id);
  assert(pmTasks.every(t => pmProjIds.includes(t.projectId)), 'PM tasks should only be from managed projects');

  // Team Lead: sees own team and self
  const tlEmps = (await fetchJSON(`${BASE}/employees`, USERS.TeamLead.id)).data;
  assert(tlEmps.length > 0, `Team Lead should see team employees`);
  assert(tlEmps.some(e => e.id === USERS.TeamLead.id), 'Team Lead should see self');
  assert(tlEmps[0].email === undefined, 'Team Lead should NOT see email field');

  const tlTasks = (await fetchJSON(`${BASE}/tasks`, USERS.TeamLead.id)).data;
  assert(tlTasks.length > 0, `Team Lead should see team tasks`);

  const tlTimesheets = (await fetchJSON(`${BASE}/timesheets`, USERS.TeamLead.id)).data;
  assert(tlTimesheets.length >= 0, `Team Lead timesheets query should succeed`);

  // Employee: sees only own data
  const emp1Emps = (await fetchJSON(`${BASE}/employees`, USERS.Employee1.id)).data;
  assert(emp1Emps.length === 1, `Employee should see only self (got ${emp1Emps.length})`);
  assert(emp1Emps[0].id === USERS.Employee1.id, 'Employee should only see own record');
  assert(emp1Emps[0].email === undefined, 'Employee should NOT see email field');

  const emp1Tasks = (await fetchJSON(`${BASE}/tasks`, USERS.Employee1.id)).data;
  assert(emp1Tasks.every(t => t.assignedTo === USERS.Employee1.id), 'Employee should only see own tasks');

  const emp1TS = (await fetchJSON(`${BASE}/timesheets`, USERS.Employee1.id)).data;
  assert(emp1TS.every(ts => ts.employeeId === USERS.Employee1.id), 'Employee should only see own timesheets');

  const emp1Leaves = (await fetchJSON(`${BASE}/leaves`, USERS.Employee1.id)).data;
  assert(emp1Leaves.every(l => l.employeeId === USERS.Employee1.id), 'Employee should only see own leaves');

  const emp1Allocs = (await fetchJSON(`${BASE}/allocations`, USERS.Employee1.id)).data;
  assert(emp1Allocs.every(a => a.employeeId === USERS.Employee1.id), 'Employee should only see own allocations');

  // Management: sees all data but summary fields only
  const mgtEmps = (await fetchJSON(`${BASE}/employees`, USERS.Management.id)).data;
  assert(mgtEmps.length >= 6, `Management should see all employees (got ${mgtEmps.length})`);
  assert(mgtEmps[0].email === undefined, 'Management should NOT see email field');
  assert(mgtEmps[0].costPerHour === undefined, 'Management should NOT see costPerHour');

  const mgtProjects = (await fetchJSON(`${BASE}/projects`, USERS.Management.id)).data;
  assert(mgtProjects.length >= 3, `Management should see all projects (got ${mgtProjects.length})`);
  assert(mgtProjects[0].budget === undefined, 'Management should NOT see budget field');

  const mgtTasks = (await fetchJSON(`${BASE}/tasks`, USERS.Management.id)).data;
  assert(mgtTasks.length >= 4, `Management should see all tasks (got ${mgtTasks.length})`);
  assert(mgtTasks[0].assignedTo === undefined, 'Management should NOT see assignedTo field');
  assert(mgtTasks[0].description === undefined, 'Management should NOT see description field');

  const mgtTS = (await fetchJSON(`${BASE}/timesheets`, USERS.Management.id)).data;
  assert(mgtTS.length >= 1, `Management should see all timesheets`);
  assert(mgtTS[0].description === undefined, 'Management should NOT see timesheet description');
  assert(mgtTS[0].comments === undefined, 'Management should NOT see timesheet comments');

  const mgtClients = (await fetchJSON(`${BASE}/clients`, USERS.Management.id)).data;
  assert(mgtClients.length >= 3, `Management should see all clients (got ${mgtClients.length})`);
  assert(mgtClients[0].email === undefined, 'Management should NOT see client email');
  assert(mgtClients[0].phone === undefined, 'Management should NOT see client phone');

  const mgtAllocs = (await fetchJSON(`${BASE}/allocations`, USERS.Management.id)).data;
  assert(mgtAllocs.length >= 1, `Management should see all allocations`);
  assert(mgtAllocs[0].plannedHours === undefined, 'Management should NOT see plannedHours');

  const mgtLeaves = (await fetchJSON(`${BASE}/leaves`, USERS.Management.id)).data;
  assert(mgtLeaves.length >= 1, `Management should see all leaves`);
  assert(mgtLeaves[0].comments === undefined, 'Management should NOT see leave comments');

  // ---- Phase 3: Reports RLS ----
  console.log('\n--- Phase 3: Reports row-level filtering ---');

  // PM should only see reports for their managed projects/employees
  const pmUtil = (await fetchJSON(`${BASE}/reports/utilization`, USERS.PM.id)).data;
  assert(pmUtil.length > 0, `PM should see utilization report data`);
  // PM manages P001 and P002 (pmId=E003), employees allocated: E001, E002, E004
  const pmAllocedEmpIds = ['E001', 'E002', 'E004'];
  const pmUtilEmpIds = pmUtil.map(r => r.employeeId);
  assert(pmUtilEmpIds.every(id => pmAllocedEmpIds.includes(id) || id === USERS.PM.id), 
    'PM utilization report should only contain managed-project employees');

  const pmEffort = (await fetchJSON(`${BASE}/reports/project-effort`, USERS.PM.id)).data;
  assert(pmEffort.length > 0, `PM should see project effort data`);
  assert(pmEffort.every(r => pmProjIds.includes(r.projectId)), 'PM project effort should only contain managed projects');

  // Team Lead should only see their team in reports
  const tlUtil = (await fetchJSON(`${BASE}/reports/utilization`, USERS.TeamLead.id)).data;
  assert(tlUtil.length > 0, `Team Lead should see utilization report data`);
  // TL (E004) manages E001, E002 (managerId=E004)
  const tlTeamIds = ['E001', 'E002', 'E004'];
  assert(tlUtil.every(r => tlTeamIds.includes(r.employeeId)), 
    'Team Lead utilization should only show own team');

  // Management sees all data
  const mgtUtil = (await fetchJSON(`${BASE}/reports/utilization`, USERS.Management.id)).data;
  const adminUtil = (await fetchJSON(`${BASE}/reports/utilization`, USERS.Admin.id)).data;
  assert(mgtUtil.length === adminUtil.length, `Management should see same utilization count as Admin (${mgtUtil.length} vs ${adminUtil.length})`);

  // ---- Phase 4: No blank pages (all dashboard endpoints return data) ----
  console.log('\n--- Phase 4: Dashboard data completeness ---');
  const dashboardEndpoints = ['/employees', '/projects', '/clients', '/allocations', '/tasks', '/timesheets'];
  for (const [roleKey, user] of Object.entries(USERS)) {
    let hasData = 0;
    for (const ep of dashboardEndpoints) {
      const { data } = await fetchJSON(`${BASE}${ep}`, user.id);
      if (data && data.length > 0) hasData++;
    }
    assert(hasData > 0, `${roleKey} dashboard should have data from at least one endpoint (has ${hasData})`);
  }

  // ---- Summary ----
  console.log('\n========================================');
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests} ✓`);
  console.log(`Failed:       ${failedTests} ✗`);
  console.log('========================================');
  
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
  } else {
    console.log('\n✅ ALL TESTS PASSED — Row-Level Security verified!');
  }
}

runTests().catch(e => console.error('Test runner error:', e));
