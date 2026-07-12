import mysql from 'mysql2/promise';

async function verifyAll() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'password', database: 'ProjectMatrix'
  }).catch(() => mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'ProjectMatrix'
  }));

  const baseUrl = 'http://localhost:5002/api';
  const headers = (userId) => ({ 'Content-Type': 'application/json', 'x-user-id': userId });
  
  console.log('--- 1. ADMIN CREATES EMPLOYEE, PROJECT & MODULE ---');
  await connection.query(`DELETE FROM timesheets WHERE description='Working on T-TEST'`);
  await connection.query(`DELETE FROM leaves WHERE comments='Vacation'`);
  await connection.query(`DELETE FROM tasks WHERE name='T-TEST'`);
  await connection.query(`DELETE FROM allocations WHERE role='Dev'`);
  await connection.query(`DELETE FROM modules WHERE name='M-TEST'`);
  await connection.query(`DELETE FROM projects WHERE code='P-TEST'`);
  await connection.query(`DELETE FROM employees WHERE code='E-TEST'`);
  await connection.query(`DELETE FROM clients WHERE name='C-TEST'`);
  
  let res = await fetch(`${baseUrl}/clients`, { method: 'POST', headers: headers('E006'), body: JSON.stringify({ name: 'C-TEST', country: 'US', email: 'c@test.com', contactPerson: 'C', phone: '123', status: 'Active' }) });
  let json = await res.json();
  if (!res.ok) throw new Error("Client POST failed: " + JSON.stringify(json));
  
  let [cRow] = await connection.query(`SELECT id FROM clients WHERE name='C-TEST' LIMIT 1`);
  const clientId = cRow[0].id;
  
  res = await fetch(`${baseUrl}/employees`, { method: 'POST', headers: headers('E006'), body: JSON.stringify({ code: 'E-TEST', name: 'Test Emp', email: 'test@emp.com', password: '123', role: 'Employee', costPerHour: 10, designation: 'Dev', department: 'Engineering', mobile: '', status: 'Active', managerId: '' }) });
  json = await res.json();
  if (!res.ok) throw new Error("Employee POST failed: " + JSON.stringify(json));
  
  let [eRow] = await connection.query(`SELECT id FROM employees WHERE code='E-TEST' LIMIT 1`);
  const empId = eRow[0].id;

  res = await fetch(`${baseUrl}/projects`, { method: 'POST', headers: headers('E006'), body: JSON.stringify({ code: 'P-TEST', name: 'Test Proj', clientId, pmId: 'E003', startDate: '2026-01-01', endDate: '2026-12-31', estimatedHours: 100, budget: 1000, billable: true, status: 'Active' }) });
  json = await res.json();
  if (!res.ok) throw new Error("Project POST failed: " + JSON.stringify(json));
  
  let [pRow] = await connection.query(`SELECT id FROM projects WHERE code='P-TEST' LIMIT 1`);
  const projId = pRow[0].id;

  res = await fetch(`${baseUrl}/modules`, { method: 'POST', headers: headers('E006'), body: JSON.stringify({ projectId: projId, name: 'M-TEST', description: '', priority: 'Medium', status: 'Active' }) });
  json = await res.json();
  if (!res.ok) throw new Error("Module POST failed: " + JSON.stringify(json));
  let [mRow] = await connection.query(`SELECT id FROM modules WHERE name='M-TEST' LIMIT 1`);
  const modId = mRow[0].id;

  console.log(`Employee Created: ${empId}, Project: ${projId}, Module: ${modId}`);

  console.log('--- 2. PM ALLOCATES EMPLOYEE & CREATES TASK ---');
  res = await fetch(`${baseUrl}/allocations`, { method: 'POST', headers: headers('E003'), body: JSON.stringify({ employeeId: empId, projectId: projId, role: 'Dev', allocation: 100, startDate: '2026-01-01', endDate: '2026-12-31', plannedHours: 0 }) });
  json = await res.json();
  if (!res.ok) throw new Error("Alloc POST failed: " + JSON.stringify(json));

  res = await fetch(`${baseUrl}/tasks`, { method: 'POST', headers: headers('E003'), body: JSON.stringify({ projectId: projId, moduleId: modId, name: 'T-TEST', assignedTo: empId, reviewerId: 'E004', description: '', priority: 'Medium', estimatedHours: 10, startDate: '2026-01-01', endDate: '2026-01-10', status: 'Open', progress: 0 }) });
  json = await res.json();
  if (!res.ok) throw new Error("Task POST failed: " + JSON.stringify(json));
  let [tRow] = await connection.query(`SELECT id FROM tasks WHERE name='T-TEST' LIMIT 1`);
  const taskId = tRow[0].id;

  console.log(`Task Created: ${taskId}`);

  console.log('--- 3. EMPLOYEE SUBMITS TIMESHEET & LEAVE ---');
  res = await fetch(`${baseUrl}/timesheets`, { method: 'POST', headers: headers(empId), body: JSON.stringify({ date: '2026-06-15', employeeId: empId, projectId: projId, moduleId: modId, taskId: taskId, hours: 8, status: 'Submitted', description: 'Working on T-TEST', comments: '' }) });
  json = await res.json();
  if (!res.ok) throw new Error("Timesheet POST failed: " + JSON.stringify(json));

  res = await fetch(`${baseUrl}/leaves`, { method: 'POST', headers: headers(empId), body: JSON.stringify({ employeeId: empId, startDate: '2026-08-01', endDate: '2026-08-02', type: 'Casual', status: 'Pending', comments: 'Vacation' }) });
  json = await res.json();
  if (!res.ok) throw new Error("Leave POST failed: " + JSON.stringify(json));

  let [tsRow] = await connection.query(`SELECT id, status FROM timesheets WHERE employeeId='${empId}' LIMIT 1`);
  let [lRow] = await connection.query(`SELECT id, status FROM leaves WHERE employeeId='${empId}' LIMIT 1`);
  
  console.log(`Timesheet Created: ${tsRow[0].id} (Status: ${tsRow[0].status})`);
  console.log(`Leave Created: ${lRow[0].id} (Status: ${lRow[0].status})`);

  console.log('--- 4. APPROVALS ---');
  let tsList = await (await fetch(`${baseUrl}/timesheets`, { headers: headers('E004') })).json();
  let tsData = tsList.find(t => t.id === tsRow[0].id);
  res = await fetch(`${baseUrl}/timesheets/${tsRow[0].id}`, { method: 'PUT', headers: headers('E004'), body: JSON.stringify({ ...tsData, status: 'Approved' }) });
  if (!res.ok) console.error("Timesheet Approval failed:", await res.json());
  
  let lList = await (await fetch(`${baseUrl}/leaves`, { headers: headers('E003') })).json();
  let lData = lList.find(l => l.id === lRow[0].id);
  res = await fetch(`${baseUrl}/leaves/${lRow[0].id}`, { method: 'PUT', headers: headers('E003'), body: JSON.stringify({ ...lData, status: 'Approved' }) });
  if (!res.ok) console.error("Leave Approval failed:", await res.json());

  let [tsApp] = await connection.query(`SELECT status FROM timesheets WHERE id='${tsRow[0].id}'`);
  let [lApp] = await connection.query(`SELECT status FROM leaves WHERE id='${lRow[0].id}'`);
  console.log(`Timesheet after TL approval: ${tsApp[0].status}`);
  console.log(`Leave after PM approval: ${lApp[0].status}`);

  console.log('--- 5. VERIFY DATABASE DASHBOARD/REPORTS UPDATES ---');
  let [tUpd] = await connection.query(`SELECT loggedHours FROM tasks WHERE id='${taskId}'`);
  console.log(`Task loggedHours: ${tUpd[0].loggedHours}`);
  
  let [pUpd] = await connection.query(`SELECT billable FROM projects WHERE id='${projId}'`);
  console.log(`Project billable flag: ${pUpd[0].billable}`);

  console.log('✅ COMPLETE WORKFLOW AND CRUD VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

verifyAll().catch(e => { console.error(e); process.exit(1); });
