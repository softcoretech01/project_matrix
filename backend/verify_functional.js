// Comprehensive Functional Verification Test
// Simulates all frontend field accesses against RLS-filtered API responses
// Catches: undefined fields, NaN, TypeError, empty dropdowns, broken lookups

const BASE = 'http://localhost:5002/api';

const USERS = {
  Admin:      { id: 'E006', role: 'Admin' },
  PM:         { id: 'E003', role: 'PM' },
  TeamLead:   { id: 'E004', role: 'Team Lead' },
  Employee1:  { id: 'E001', role: 'Employee' },
  Employee2:  { id: 'E002', role: 'Employee' },
  Management: { id: 'E005', role: 'Management' }
};

let totalTests = 0, passed = 0, failed = 0;
const failures = [];

function assert(condition, msg) {
  totalTests++;
  if (condition) { passed++; } 
  else { failed++; failures.push(msg); console.error(`  ✗ ${msg}`); }
}

async function get(path, userId) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-user-id': userId } });
  return res.ok ? await res.json() : [];
}

async function runTests() {
  console.log('=== FUNCTIONAL VERIFICATION ===\n');

  for (const [roleKey, user] of Object.entries(USERS)) {
    console.log(`\n--- Testing ${roleKey} (${user.role}) ---`);
    
    const [employees, projects, clients, allocations, tasks, timesheets, leaves, modules, holidays] = await Promise.all([
      get('/employees', user.id),
      get('/projects', user.id),
      get('/clients', user.id),
      get('/allocations', user.id),
      get('/tasks', user.id),
      get('/timesheets', user.id),
      get('/leaves', user.id),
      get('/modules', user.id),
      get('/holidays', user.id)
    ]);

    // ============ DASHBOARD FIELD CHECKS ============
    
    // All dashboards need employees with: id, name, role, status
    if (employees.length > 0) {
      assert(employees[0].id !== undefined, `${roleKey}: employees.id exists`);
      assert(employees[0].name !== undefined, `${roleKey}: employees.name exists`);
      assert(employees[0].role !== undefined, `${roleKey}: employees.role exists`);
      assert(employees[0].status !== undefined, `${roleKey}: employees.status exists`);
    }

    // All dashboards need projects with: id, name, status, code
    if (projects.length > 0) {
      assert(projects[0].id !== undefined, `${roleKey}: projects.id exists`);
      assert(projects[0].name !== undefined, `${roleKey}: projects.name exists`);
      assert(projects[0].status !== undefined, `${roleKey}: projects.status exists`);
      assert(projects[0].code !== undefined, `${roleKey}: projects.code exists`);
    }

    // PM Dashboard needs: pmId, estimatedHours
    if (user.role === 'PM' || user.role === 'Team Lead') {
      if (projects.length > 0) {
        assert(projects[0].pmId !== undefined, `${roleKey}: projects.pmId exists (PM dashboard filter)`);
        assert(projects[0].estimatedHours !== undefined, `${roleKey}: projects.estimatedHours exists (PM dashboard table)`);
      }
    }

    // Management Dashboard needs: budget, billable, estimatedHours
    if (user.role === 'Management') {
      if (projects.length > 0) {
        assert(projects[0].billable !== undefined, `${roleKey}: projects.billable exists (Management billing calc)`);
        assert(projects[0].estimatedHours !== undefined, `${roleKey}: projects.estimatedHours exists (Management effort table)`);
        // CRITICAL: Management dashboard line 358: p.budget.toLocaleString()
        assert(projects[0].budget !== undefined, `${roleKey}: projects.budget exists (Management "Project Budgets vs Effort" table)`);
      }
      // Management needs timesheets with: date, hours, projectId
      if (timesheets.length > 0) {
        assert(timesheets[0].date !== undefined, `${roleKey}: timesheets.date exists`);
        assert(timesheets[0].hours !== undefined, `${roleKey}: timesheets.hours exists`);
        assert(timesheets[0].projectId !== undefined, `${roleKey}: timesheets.projectId exists`);
      }
      // Management needs clients with: status
      if (clients.length > 0) {
        assert(clients[0].status !== undefined, `${roleKey}: clients.status exists`);
      }
    }

    // Employee Dashboard needs: tasks with assignedTo, timesheets with employeeId, date, hours, status
    if (user.role === 'Employee') {
      if (tasks.length > 0) {
        assert(tasks[0].assignedTo !== undefined, `${roleKey}: tasks.assignedTo exists (Employee dashboard filter)`);
        assert(tasks[0].status !== undefined, `${roleKey}: tasks.status exists`);
        assert(tasks[0].endDate !== undefined, `${roleKey}: tasks.endDate exists`);
        assert(tasks[0].progress !== undefined, `${roleKey}: tasks.progress exists`);
      }
      if (timesheets.length > 0) {
        assert(timesheets[0].employeeId !== undefined, `${roleKey}: timesheets.employeeId exists`);
        assert(timesheets[0].date !== undefined, `${roleKey}: timesheets.date exists`);
        assert(timesheets[0].hours !== undefined, `${roleKey}: timesheets.hours exists`);
        assert(timesheets[0].status !== undefined, `${roleKey}: timesheets.status exists`);
      }
    }

    // ============ TASKS VIEW FIELD CHECKS ============
    // Tasks Create (Admin, PM): needs clients.name, projects.clientId, modules.projectId+status+name, employees.id+name+designation+role
    if (user.role === 'Admin' || user.role === 'PM') {
      if (clients.length > 0) {
        assert(clients[0].name !== undefined, `${roleKey}: clients.name exists (task create dropdown)`);
        assert(clients[0].id !== undefined, `${roleKey}: clients.id exists`);
      }
      if (projects.length > 0) {
        assert(projects[0].clientId !== undefined, `${roleKey}: projects.clientId exists (task create cascade)`);
      }
      if (modules.length > 0) {
        assert(modules[0].projectId !== undefined, `${roleKey}: modules.projectId exists (task create cascade)`);
        assert(modules[0].name !== undefined, `${roleKey}: modules.name exists`);
        assert(modules[0].status !== undefined, `${roleKey}: modules.status exists`);
      }
      if (employees.length > 0) {
        assert(employees[0].designation !== undefined, `${roleKey}: employees.designation exists (assigned employee dropdown)`);
      }
    }

    // Kanban Board (Admin, PM, TL, Employee): needs tasks.name, priority, endDate, progress, assignedTo
    if (['Admin', 'PM', 'Team Lead', 'Employee'].includes(user.role)) {
      if (tasks.length > 0) {
        assert(tasks[0].name !== undefined, `${roleKey}: tasks.name exists (kanban card)`);
        assert(tasks[0].priority !== undefined, `${roleKey}: tasks.priority exists (kanban badge)`);
        assert(tasks[0].endDate !== undefined, `${roleKey}: tasks.endDate exists (kanban due date)`);
        assert(tasks[0].progress !== undefined, `${roleKey}: tasks.progress exists (kanban progress)`);
        assert(tasks[0].status !== undefined, `${roleKey}: tasks.status exists (kanban column)`);
      }
    }

    // My Tasks (Admin, TL, Employee): tasks.assignedTo, loggedHours, estimatedHours
    if (['Admin', 'Team Lead', 'Employee'].includes(user.role)) {
      if (tasks.length > 0) {
        assert(tasks[0].loggedHours !== undefined, `${roleKey}: tasks.loggedHours exists (My Tasks table)`);
        assert(tasks[0].estimatedHours !== undefined, `${roleKey}: tasks.estimatedHours exists (My Tasks table)`);
      }
    }

    // ============ TIMESHEETS VIEW FIELD CHECKS ============
    // Daily/Weekly/History (Admin, Employee): needs allocations.employeeId+projectId, projects.id+name+status, modules.projectId+status+name, tasks.assignedTo+projectId+moduleId+name
    if (user.role === 'Admin' || user.role === 'Employee') {
      if (allocations.length > 0) {
        assert(allocations[0].employeeId !== undefined, `${roleKey}: allocations.employeeId exists (timesheet project filter)`);
        assert(allocations[0].projectId !== undefined, `${roleKey}: allocations.projectId exists`);
      }
      // Check cascading dropdowns work: allocated projects should exist in projects list
      const allocProjIds = allocations.filter(a => a.employeeId === user.id).map(a => a.projectId);
      const myActiveProjects = projects.filter(p => allocProjIds.includes(p.id) && p.status === 'Active');
      if (user.role === 'Employee') {
        assert(myActiveProjects.length > 0, `${roleKey}: Employee has at least one allocated active project for timesheet dropdown`);
      }
      // Check tasks have fields for timesheet task dropdown
      if (tasks.length > 0) {
        assert(tasks[0].projectId !== undefined, `${roleKey}: tasks.projectId exists (timesheet task cascade)`);
        assert(tasks[0].moduleId !== undefined, `${roleKey}: tasks.moduleId exists (timesheet task cascade)`);
        assert(tasks[0].name !== undefined, `${roleKey}: tasks.name exists (timesheet task dropdown label)`);
      }
      // History needs: timesheets.date, projectId, taskId, hours, description, status, comments
      if (timesheets.length > 0) {
        assert(timesheets[0].description !== undefined, `${roleKey}: timesheets.description exists (history table)`);
      }
    }

    // ============ LEAVES VIEW FIELD CHECKS ============
    // Apply (Admin, Employee): needs leaves.employeeId, type, status, startDate, endDate, comments
    if (user.role === 'Admin' || user.role === 'Employee') {
      if (leaves.length > 0) {
        assert(leaves[0].type !== undefined, `${roleKey}: leaves.type exists`);
        assert(leaves[0].status !== undefined, `${roleKey}: leaves.status exists`);
        assert(leaves[0].startDate !== undefined, `${roleKey}: leaves.startDate exists`);
        assert(leaves[0].endDate !== undefined, `${roleKey}: leaves.endDate exists`);
      }
    }
    // Approval (Admin, PM, TL): needs leaves.employeeId + comments, employees for lookup
    if (['Admin', 'PM', 'Team Lead'].includes(user.role)) {
      if (leaves.length > 0) {
        assert(leaves[0].employeeId !== undefined, `${roleKey}: leaves.employeeId exists (approval lookup)`);
        assert(leaves[0].comments !== undefined || leaves[0].comments === '', `${roleKey}: leaves.comments exists (approval display)`);
      }
    }

    // ============ APPROVALS VIEW FIELD CHECKS ============
    // Timesheet Approvals (Admin, PM, TL): needs timesheets.employeeId, description, projectId
    if (['Admin', 'PM', 'Team Lead'].includes(user.role)) {
      if (timesheets.length > 0) {
        assert(timesheets[0].employeeId !== undefined, `${roleKey}: timesheets.employeeId exists (approval employee lookup)`);
        assert(timesheets[0].description !== undefined, `${roleKey}: timesheets.description exists (approval description column)`);
      }
      // Task Review: needs tasks.assignedTo, loggedHours, estimatedHours, projectId
      if (tasks.length > 0) {
        assert(tasks[0].assignedTo !== undefined, `${roleKey}: tasks.assignedTo exists (task review assigned resource)`);
        assert(tasks[0].projectId !== undefined, `${roleKey}: tasks.projectId exists (task review scope)`);
      }
    }

    // ============ RESOURCES VIEW FIELD CHECKS ============
    // Allocation list (Admin, PM): needs allocations.role, allocation, startDate, endDate, plannedHours
    if (user.role === 'Admin' || user.role === 'PM') {
      if (allocations.length > 0) {
        assert(allocations[0].role !== undefined, `${roleKey}: allocations.role exists (allocation table)`);
        assert(allocations[0].allocation !== undefined, `${roleKey}: allocations.allocation exists`);
        assert(allocations[0].startDate !== undefined, `${roleKey}: allocations.startDate exists`);
        assert(allocations[0].endDate !== undefined, `${roleKey}: allocations.endDate exists`);
        assert(allocations[0].plannedHours !== undefined, `${roleKey}: allocations.plannedHours exists (resources table column)`);
      }
      // Planner matrix: needs employees.department, designation  
      if (employees.length > 0) {
        assert(employees[0].department !== undefined, `${roleKey}: employees.department exists (planner matrix)`);
        assert(employees[0].designation !== undefined, `${roleKey}: employees.designation exists (planner matrix)`);
      }
    }

    // ============ REPORTS VIEW FIELD CHECKS ============
    if (['Admin', 'Management', 'PM', 'Team Lead'].includes(user.role)) {
      const reportTypes = ['utilization', 'project-effort', 'planned-vs-actual', 'resource-allocation', 'missing-timesheet', 'productivity'];
      for (const rt of reportTypes) {
        const data = await get(`/reports/${rt}`, user.id);
        assert(Array.isArray(data), `${roleKey}: /reports/${rt} returns array`);
        
        if (data.length > 0) {
          // Check no undefined values in report output
          const firstRow = data[0];
          for (const [key, val] of Object.entries(firstRow)) {
            if (typeof val !== 'object') {
              assert(val !== undefined, `${roleKey}: reports/${rt}[0].${key} is not undefined`);
              assert(!Number.isNaN(val), `${roleKey}: reports/${rt}[0].${key} is not NaN`);
            }
          }
        }
      }
    }

    // ============ HEADER PROFILE SWITCHER ============
    // App.jsx line 296-298: needs employees with id, role, name for <option> display
    if (employees.length > 0) {
      assert(employees.every(e => e.id !== undefined), `${roleKey}: all employees have id (profile switcher)`);
      assert(employees.every(e => e.name !== undefined), `${roleKey}: all employees have name (profile switcher)`);
      assert(employees.every(e => e.role !== undefined), `${roleKey}: all employees have role (profile switcher)`);
    }
  }

  // ============ SUMMARY ============
  console.log('\n========================================');
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed:       ${passed} ✓`);
  console.log(`Failed:       ${failed} ✗`);
  console.log('========================================');
  
  if (failures.length > 0) {
    console.log('\n🔴 FAILURES:');
    failures.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
  } else {
    console.log('\n✅ ALL FUNCTIONAL TESTS PASSED');
  }
}

runTests().catch(e => console.error('Test runner error:', e));
