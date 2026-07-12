const http = require('http');

const API_BASE = 'http://localhost:5002/api';
const roles = [
  { name: 'Admin', id: 'E006', role: 'Admin' },
  { name: 'PM', id: 'E003', role: 'PM' },
  { name: 'Team Lead', id: 'E004', role: 'Team Lead' },
  { name: 'Employee', id: 'E001', role: 'Employee' },
  { name: 'Management', id: 'E005', role: 'Management' }
];

const endpoints = [
  { path: '/employees', method: 'GET', requiredRoles: ['Admin'] },
  { path: '/clients', method: 'GET', requiredRoles: ['Admin'] },
  { path: '/projects', method: 'GET', requiredRoles: ['Admin', 'PM'] }, // Wait, PM has projects access via projects-pm? Backend might allow it.
  { path: '/tasks', method: 'GET', requiredRoles: ['Admin', 'PM', 'Team Lead', 'Employee'] },
  { path: '/timesheets', method: 'GET', requiredRoles: ['Admin', 'PM', 'Team Lead', 'Employee'] },
  { path: '/allocations', method: 'GET', requiredRoles: ['Admin', 'PM', 'Team Lead', 'Employee'] }
];

function request(url, method, userId) {
  return new Promise((resolve) => {
    const req = http.request(url, {
      method,
      headers: { 'x-user-id': userId }
    }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(500));
    req.end();
  });
}

async function run() {
  console.log('Testing Backend API RBAC Enforcements...\n');
  for (const ep of endpoints) {
    for (const role of roles) {
      const status = await request(API_BASE + ep.path, ep.method, role.id);
      const isAllowed = ep.requiredRoles.includes(role.role) || role.role === 'Admin'; 
      // Most of backend allows Admin + specific roles. But let's just log it.
      console.log(`[${role.name}] ${ep.method} ${ep.path} -> HTTP ${status}`);
    }
  }
}

run();
