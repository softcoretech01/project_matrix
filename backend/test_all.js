async function test() {
  const headers = { 'Content-Type': 'application/json', 'x-user-id': 'E006' };
  const BASE = 'http://localhost:5002/api';

  const endpoints = [
    { name: 'clients', payload: { name: 'Test Client', contactPerson: 'Tester', email: 'test@client.com', country: 'US' } },
    { name: 'projects', payload: { code: 'PRJ1', name: 'Test Proj', clientId: 'C001', pmId: 'E003', startDate: '2026-01-01', endDate: '2026-02-01' } },
    { name: 'modules', payload: { projectId: 'P001', name: 'Test Mod', priority: 'Medium' } },
    { name: 'task-types', payload: { name: 'Test Type' } },
    { name: 'holidays', payload: { date: '2026-10-10', name: 'Test Holiday', type: 'Public' } },
    { name: 'allocations', payload: { employeeId: 'E001', projectId: 'P001', role: 'Dev', startDate: '2026-01-01', endDate: '2026-02-01' } },
    { name: 'tasks', payload: { name: 'Test Task', projectId: 'P001', moduleId: 'M001', assignedTo: 'E001', reviewerId: 'E002', startDate: '2026-01-01', endDate: '2026-02-01' } },
    { name: 'timesheets', payload: { date: '2026-01-01', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 4, description: 'Test work' } },
    { name: 'leaves', payload: { employeeId: 'E001', startDate: '2026-01-01', endDate: '2026-01-02' } }
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nTesting POST /${ep.name}...`);
      const res = await fetch(`${BASE}/${ep.name}`, { method: 'POST', headers, body: JSON.stringify(ep.payload) });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      if (!res.ok) console.error("ERROR:", data);
      else {
        console.log(`Success! ID: ${data.id}`);
        // Test PUT
        if (ep.name !== 'holidays') {
          console.log(`Testing PUT /${ep.name}/${data.id}...`);
          const putRes = await fetch(`${BASE}/${ep.name}/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
          console.log(`PUT Status: ${putRes.status}`);
          if (!putRes.ok) {
             const putData = await putRes.json();
             console.error("PUT ERROR:", putData);
          }
        }
        
        // Test DELETE
        console.log(`Testing DELETE /${ep.name}/${data.id}...`);
        const delRes = await fetch(`${BASE}/${ep.name}/${data.id}`, { method: 'DELETE', headers });
        console.log(`DELETE Status: ${delRes.status}`);
      }
    } catch(e) {
      console.error(`Failed on ${ep.name}:`, e.message);
    }
  }
}
test();
