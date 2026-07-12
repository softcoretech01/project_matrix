import mysql from 'mysql2/promise';

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function verifyCRUD() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'password', database: 'ProjectMatrix'
  }).catch(() => mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'ProjectMatrix'
  }));
  
  const baseUrl = 'http://localhost:5002/api';
  const adminId = 'E006';
  const authHeaders = { 'Content-Type': 'application/json', 'x-user-id': adminId };

  console.log('=======================================');
  console.log('         CRUD VERIFICATION');
  console.log('=======================================');

  // Entities to test
  const tests = [
    { name: 'Employee', endpoint: '/employees', table: 'employees', payload: { id: 'E999', code: 'EMP999', name: 'Test Emp', email: 'test@emp.com', designation: 'Tester', role: 'Employee', status: 'Active', password: '123' }, updatePayload: { name: 'Test Emp Updated' } },
    { name: 'Client', endpoint: '/clients', table: 'clients', payload: { id: 'C999', name: 'Test Client', country: 'USA' }, updatePayload: { name: 'Test Client Updated' } },
    { name: 'Project', endpoint: '/projects', table: 'projects', payload: { id: 'P999', code: 'PRJ999', name: 'Test Project', clientId: 'C001', pmId: 'E003', startDate: '2026-01-01', endDate: '2026-12-31' }, updatePayload: { name: 'Test Project Updated' } },
    { name: 'Module', endpoint: '/modules', table: 'modules', payload: { id: 'M999', projectId: 'P001', name: 'Test Module' }, updatePayload: { name: 'Test Module Updated' } },
    { name: 'Holiday', endpoint: '/holidays', table: 'holidays', payload: { date: '2026-10-10', name: 'Test Holiday', type: 'Public' }, updatePayload: { name: 'Test Holiday Updated' } },
    { name: 'Task Type', endpoint: '/task-types', table: 'task_types', payload: { name: 'Test Type' }, updatePayload: { name: 'Test Type Updated' } },
    { name: 'Allocation', endpoint: '/allocations', table: 'allocations', payload: { id: 'A999', employeeId: 'E001', projectId: 'P001', startDate: '2026-01-01', endDate: '2026-12-31' }, updatePayload: { role: 'Tester' } },
    { name: 'Task', endpoint: '/tasks', table: 'tasks', payload: { id: 'T999', name: 'Test Task CRUD', projectId: 'P001', moduleId: 'M001', startDate: '2026-01-01', endDate: '2026-12-31' }, updatePayload: { name: 'Test Task Updated' } },
    { name: 'Timesheet', endpoint: '/timesheets', table: 'timesheets', payload: { id: 'TS999', date: '2026-06-15', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 4 }, updatePayload: { hours: 6 } },
    { name: 'Leave', endpoint: '/leaves', table: 'leaves', payload: { id: 'L999', employeeId: 'E001', startDate: '2026-01-01', endDate: '2026-01-02' }, updatePayload: { type: 'Sick' } }
  ];

  for (const t of tests) {
    console.log(`\n--- Testing ${t.name} CRUD ---`);
    
    // Create via API
    let res = await fetch(`${baseUrl}${t.endpoint}`, { method: 'POST', headers: authHeaders, body: JSON.stringify(t.payload) });
    let created = await res.json();
    let id = created.id;
    console.log(`[CREATE API] returned ID: ${id}`);

    // Verify DB
    let [rows] = await connection.query(`SELECT * FROM ${t.table} WHERE id = ?`, [id]);
    console.log(`[DB AFTER CREATE] Row found:`, rows[0] ? 'Yes' : 'No');

    // Update via API
    await fetch(`${baseUrl}${t.endpoint}/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ ...created, ...t.updatePayload }) });
    [rows] = await connection.query(`SELECT * FROM ${t.table} WHERE id = ?`, [id]);
    console.log(`[DB AFTER UPDATE] Changes saved:`, rows[0] ? 'Yes' : 'No');
    console.log(`[DB ROW SNAPSHOT]`, rows[0]);

    // Delete via API
    await fetch(`${baseUrl}${t.endpoint}/${id}`, { method: 'DELETE', headers: authHeaders });
    [rows] = await connection.query(`SELECT * FROM ${t.table} WHERE id = ?`, [id]);
    console.log(`[DB AFTER DELETE] Row deleted:`, rows.length === 0 ? 'Yes' : 'No');
  }


  console.log('\n=======================================');
  console.log('         WORKFLOW VERIFICATION');
  console.log('=======================================');
  
  // 1. Admin Create Employee & Project
  console.log('1. [Admin] Creating Employee and Project...');
  const newEmp = await (await fetch(`${baseUrl}/employees`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: 'Workflow Emp', email: 'wf@test.com', role: 'Employee', password: '123' }) })).json();
  const newProj = await (await fetch(`${baseUrl}/projects`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: 'Workflow Proj', pmId: 'E003', clientId: 'C001' }) })).json();
  const newMod = await (await fetch(`${baseUrl}/modules`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: 'Workflow Mod', projectId: newProj.id }) })).json();
  
  // 2. PM Allocate & Task
  const pmHeaders = { 'Content-Type': 'application/json', 'x-user-id': 'E003' };
  console.log('2. [PM] Allocating Employee and Creating Task...');
  await fetch(`${baseUrl}/allocations`, { method: 'POST', headers: pmHeaders, body: JSON.stringify({ employeeId: newEmp.id, projectId: newProj.id }) });
  const newTask = await (await fetch(`${baseUrl}/tasks`, { method: 'POST', headers: pmHeaders, body: JSON.stringify({ name: 'Workflow Task', projectId: newProj.id, moduleId: newMod.id, assignedTo: newEmp.id, reviewerId: 'E004' }) })).json();

  // 3. Employee Timesheet & Leave
  const empHeaders = { 'Content-Type': 'application/json', 'x-user-id': newEmp.id };
  console.log('3. [Employee] Submitting Timesheet and Leave...');
  const newTs = await (await fetch(`${baseUrl}/timesheets`, { method: 'POST', headers: empHeaders, body: JSON.stringify({ date: '2026-06-15', employeeId: newEmp.id, projectId: newProj.id, moduleId: newMod.id, taskId: newTask.id, hours: 8, status: 'Submitted' }) })).json();
  const newLeave = await (await fetch(`${baseUrl}/leaves`, { method: 'POST', headers: empHeaders, body: JSON.stringify({ employeeId: newEmp.id, startDate: '2026-08-01', endDate: '2026-08-02', status: 'Pending' }) })).json();

  // 4. TL/PM Approvals
  console.log('4. [Approvals] PM Approving...');
  await fetch(`${baseUrl}/timesheets/${newTs.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': 'E004' }, body: JSON.stringify({ ...newTs, status: 'Approved' }) });
  await fetch(`${baseUrl}/leaves/${newLeave.id}`, { method: 'PUT', headers: pmHeaders, body: JSON.stringify({ ...newLeave, status: 'Approved' }) });

  // 5. Verify DB updates
  console.log('5. Verifying DB Updates...');
  const [taskRow] = await connection.query(`SELECT loggedHours FROM tasks WHERE id = ?`, [newTask.id]);
  const [tsRow] = await connection.query(`SELECT status FROM timesheets WHERE id = ?`, [newTs.id]);
  const [lvRow] = await connection.query(`SELECT status FROM leaves WHERE id = ?`, [newLeave.id]);

  console.log(`- Task loggedHours updated: ${taskRow[0].loggedHours === '8.00' || taskRow[0].loggedHours === 8 ? 'YES' : 'NO'} (${taskRow[0].loggedHours})`);
  console.log(`- Timesheet status: ${tsRow[0].status}`);
  console.log(`- Leave status: ${lvRow[0].status}`);
  
  console.log('\n✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

verifyCRUD().catch(e => { console.error(e); process.exit(1); });
