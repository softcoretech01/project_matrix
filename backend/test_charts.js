import mysql from 'mysql2/promise';

async function testCharts() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'password', database: 'ProjectMatrix'
  }).catch(() => mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'ProjectMatrix'
  }));

  const baseUrl = 'http://localhost:5002/api';
  const headers = (userId) => ({ 'Content-Type': 'application/json', 'x-user-id': userId });
  
  console.log('--- 1. Creating a New Task (Task Status Chart) ---');
  let [pRow] = await connection.query(`SELECT id FROM projects LIMIT 1`);
  let [mRow] = await connection.query(`SELECT id FROM modules LIMIT 1`);
  let [eRow] = await connection.query(`SELECT id FROM employees LIMIT 1`);
  
  const projId = pRow[0].id;
  const modId = mRow[0].id;
  const empId = eRow[0].id;

  let res = await fetch(`${baseUrl}/tasks`, { 
    method: 'POST', 
    headers: headers('E003'), 
    body: JSON.stringify({ 
      projectId: projId, moduleId: modId, name: 'Chart Live Test Task', 
      assignedTo: empId, reviewerId: 'E004', description: '', priority: 'High', 
      estimatedHours: 5, startDate: '2026-07-06', endDate: '2026-07-10', 
      status: 'Open', progress: 0 
    }) 
  });
  let json = await res.json();
  if (!res.ok) console.error("Task POST failed:", json);
  else console.log(`✅ Created Task: ${json.id} with status 'Open' -> (Mapped to Pending in Chart)`);

  console.log('--- 2. Creating a New Timesheet (Timesheet Chart & Productivity Chart) ---');
  res = await fetch(`${baseUrl}/timesheets`, { 
    method: 'POST', 
    headers: headers(empId), 
    body: JSON.stringify({ 
      date: '2026-07-06', employeeId: empId, projectId: projId, moduleId: modId, taskId: json.id, 
      hours: 4, status: 'Submitted', description: 'Testing Live Charts', comments: '' 
    }) 
  });
  let tsJson = await res.json();
  if (!res.ok) console.error("Timesheet POST failed:", tsJson);
  else console.log(`✅ Created Timesheet: ${tsJson.id} with status 'Submitted', Hours: 4 for July (Productivity Chart)`);

  console.log('\n✅ Data injected successfully. The charts on the dashboard will now reflect these live values!');
  process.exit(0);
}

testCharts().catch(console.error);
