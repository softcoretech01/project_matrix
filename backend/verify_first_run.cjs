// Verification script for first-run setup
const http = require('http');

const BASE_URL = 'http://localhost:5002/api';

async function request(method, path, body, userId = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (userId) {
      options.headers['x-user-id'] = userId; // Mock auth mechanism
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("=== First-Run Production Setup Verification ===\n");
  
  // 1. Verify Admin is the only account
  console.log("1. Checking existing users (Admin context)...");
  const getEmps = await request('GET', '/employees', null, 'E006');
  if (getEmps.status !== 200) throw new Error("Failed to fetch employees as Admin");
  
  const existingUsers = getEmps.data;
  console.log(`   Found ${existingUsers.length} user(s).`);
  existingUsers.forEach(u => console.log(`   - ${u.id}: ${u.name} (${u.role})`));
  
  if (existingUsers.length !== 1 || existingUsers[0].role !== 'Admin') {
    console.error("   ❌ ERROR: Database contains non-admin users or multiple users.");
  } else {
    console.log("   ✅ SUCCESS: Only Admin account exists.");
  }

  // 2. Create Users
  console.log("\n2. Admin creating new users (PM, Team Lead, Employee, Management)...");
  
  const newUsers = [
    { code: 'EMP101', name: 'New PM', email: 'pm@test.com', mobile: '1111', designation: 'PM', department: 'PMO', managerId: '', costPerHour: 50, role: 'PM', status: 'Active', password: 'pass' },
    { code: 'EMP102', name: 'New TL', email: 'tl@test.com', mobile: '2222', designation: 'TL', department: 'Eng', managerId: '', costPerHour: 40, role: 'Team Lead', status: 'Active', password: 'pass' },
    { code: 'EMP103', name: 'New Emp', email: 'emp@test.com', mobile: '3333', designation: 'Dev', department: 'Eng', managerId: '', costPerHour: 20, role: 'Employee', status: 'Active', password: 'pass' },
    { code: 'EMP104', name: 'New Mgt', email: 'mgt@test.com', mobile: '4444', designation: 'VP', department: 'Exec', managerId: '', costPerHour: 70, role: 'Management', status: 'Active', password: 'pass' }
  ];

  const created = {};
  
  for (const u of newUsers) {
    const res = await request('POST', '/employees', u, 'E006');
    if (res.status === 201 || res.status === 200) {
      console.log(`   ✅ Created ${u.role}: ${res.data.id} - ${res.data.name}`);
      created[u.role] = res.data;
    } else {
      console.error(`   ❌ Failed to create ${u.role}:`, res.status, res.data);
    }
  }

  // 3. Login Verification (Mock Auth using x-user-id) & RBAC Check
  console.log("\n3. Testing Login and RBAC permissions for new users...");
  
  // Test PM
  let pmRes = await request('GET', '/projects', null, created['PM'].id);
  if (pmRes.status === 200) console.log(`   ✅ PM (${created['PM'].id}) successfully logged in and accessed /projects.`);
  else console.error(`   ❌ PM access failed.`);

  // Test Employee (should have restricted access or fields on projects)
  let empRes = await request('GET', '/projects', null, created['Employee'].id);
  if (empRes.status === 200) {
    console.log(`   ✅ Employee (${created['Employee'].id}) successfully logged in and accessed /projects.`);
    if (empRes.data.length > 0 && empRes.data[0].budget === undefined) {
      console.log(`      ✅ Employee RBAC enforced: sensitive fields (budget) stripped.`);
    }
  } else {
    console.error(`   ❌ Employee access failed.`);
  }

  // Test Management
  let mgtRes = await request('GET', '/reports/utilization', null, created['Management'].id);
  if (mgtRes.status === 200) console.log(`   ✅ Management (${created['Management'].id}) successfully logged in and accessed /reports.`);
  else console.error(`   ❌ Management access failed (status ${mgtRes.status}).`);

  // Employee accessing reports (should fail/403 according to RBAC)
  let empReportRes = await request('GET', '/reports/utilization', null, created['Employee'].id);
  if (empReportRes.status === 403) {
    console.log(`   ✅ Employee RBAC enforced: 403 Forbidden on /reports.`);
  } else {
    console.error(`   ❌ Employee RBAC failure: Employee could access reports! (status ${empReportRes.status})`);
  }

  console.log("\n=== Verification Complete ===");
}

run().catch(console.error);
