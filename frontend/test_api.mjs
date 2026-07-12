// Comprehensive API verification script
const BASE = 'http://localhost:5002/api';

async function testAPI(label, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const body = await res.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    const count = Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' ? 'obj' : 'text');
    console.log(`${res.status === 200 || res.status === 201 ? '✅' : '❌'} [${res.status}] ${label} → ${count} items`);
    if (res.status >= 400) {
      console.log(`   Error: ${typeof parsed === 'object' ? JSON.stringify(parsed) : parsed}`);
    }
    return { status: res.status, data: parsed };
  } catch (err) {
    console.log(`❌ [ERR] ${label} → ${err.message}`);
    return { status: 0, data: null };
  }
}

const headers = { 'x-user-id': 'E006', 'Content-Type': 'application/json' };
const authHeaders = { 'x-user-id': 'E006' };

(async () => {
  console.log('=== LOGIN TEST ===');
  await testAPI('POST /auth/login (admin)', `${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@projectmatrix.com', password: 'admin' })
  });

  console.log('\n=== GET ENDPOINTS (Admin) ===');
  await testAPI('GET /employees', `${BASE}/employees`, { headers: authHeaders });
  await testAPI('GET /clients', `${BASE}/clients`, { headers: authHeaders });
  await testAPI('GET /projects', `${BASE}/projects`, { headers: authHeaders });
  await testAPI('GET /modules', `${BASE}/modules`, { headers: authHeaders });
  await testAPI('GET /task-types', `${BASE}/task-types`, { headers: authHeaders });
  await testAPI('GET /holidays', `${BASE}/holidays`, { headers: authHeaders });
  await testAPI('GET /allocations', `${BASE}/allocations`, { headers: authHeaders });
  await testAPI('GET /tasks', `${BASE}/tasks`, { headers: authHeaders });
  await testAPI('GET /timesheets', `${BASE}/timesheets`, { headers: authHeaders });
  await testAPI('GET /leaves', `${BASE}/leaves`, { headers: authHeaders });

  console.log('\n=== REPORTS (Admin) ===');
  const reportTypes = ['employee-utilization', 'project-effort', 'planned-vs-actual', 'resource-allocation', 'missing-timesheets', 'team-productivity'];
  for (const rt of reportTypes) {
    await testAPI(`GET /reports/${rt}`, `${BASE}/reports/${rt}`, { headers: authHeaders });
  }

  console.log('\n=== GET ENDPOINTS (PM - E003) ===');
  const pmHeaders = { 'x-user-id': 'E003' };
  await testAPI('GET /employees (PM)', `${BASE}/employees`, { headers: pmHeaders });
  await testAPI('GET /projects (PM)', `${BASE}/projects`, { headers: pmHeaders });
  await testAPI('GET /tasks (PM)', `${BASE}/tasks`, { headers: pmHeaders });
  await testAPI('GET /timesheets (PM)', `${BASE}/timesheets`, { headers: pmHeaders });

  console.log('\n=== GET ENDPOINTS (Employee - E001) ===');
  const empHeaders = { 'x-user-id': 'E001' };
  await testAPI('GET /employees (Emp)', `${BASE}/employees`, { headers: empHeaders });
  await testAPI('GET /projects (Emp)', `${BASE}/projects`, { headers: empHeaders });
  await testAPI('GET /tasks (Emp)', `${BASE}/tasks`, { headers: empHeaders });
  await testAPI('GET /timesheets (Emp)', `${BASE}/timesheets`, { headers: empHeaders });
  await testAPI('GET /allocations (Emp)', `${BASE}/allocations`, { headers: empHeaders });

  console.log('\n=== GET ENDPOINTS (Team Lead - E004) ===');
  const tlHeaders = { 'x-user-id': 'E004' };
  await testAPI('GET /employees (TL)', `${BASE}/employees`, { headers: tlHeaders });
  await testAPI('GET /tasks (TL)', `${BASE}/tasks`, { headers: tlHeaders });
  await testAPI('GET /timesheets (TL)', `${BASE}/timesheets`, { headers: tlHeaders });

  console.log('\n=== GET ENDPOINTS (Management - E005) ===');
  const mgtHeaders = { 'x-user-id': 'E005' };
  await testAPI('GET /employees (Mgt)', `${BASE}/employees`, { headers: mgtHeaders });
  await testAPI('GET /projects (Mgt)', `${BASE}/projects`, { headers: mgtHeaders });
  await testAPI('GET /timesheets (Mgt)', `${BASE}/timesheets`, { headers: mgtHeaders });

  console.log('\n=== DONE ===');
})();
