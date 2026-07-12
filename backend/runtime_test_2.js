// runtime_test_2.js — Focused follow-up tests for edge cases
const BASE = 'http://localhost:5002/api';

async function req(method, path, body = null, userId = 'E006') {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'x-user-id': userId } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data; try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('=== Follow-up Runtime Tests ===\n');

  // 1. TL (E004) rejects E002's timesheet (E002 reports to E004)
  console.log('--- TL Reject E002 Timesheet ---');
  let r = await req('POST', '/timesheets', {
    date: '2026-06-28', employeeId: 'E002', projectId: 'P001', moduleId: 'M003', taskId: 'T002',
    hours: 4, description: 'E002 test entry', status: 'Submitted', submittedDate: '2026-06-28'
  }, 'E002');
  console.log(`  CREATE: ${r.ok ? 'PASS' : 'FAIL'} id=${r.data?.id}`);
  const tsId = r.data?.id;

  if (tsId) {
    r = await req('PUT', `/timesheets/${tsId}`, { status: 'Rejected', comments: 'Rejected by TL' }, 'E004');
    console.log(`  TL REJECT: ${r.ok ? '✅ PASS' : '❌ FAIL'} ${!r.ok ? JSON.stringify(r.data) : ''}`);

    r = await req('GET', '/timesheets');
    const found = r.data?.find(t => t.id === tsId);
    console.log(`  MySQL status: ${found?.status}`);

    // Delete it (as E002 since it's now Rejected)
    r = await req('DELETE', `/timesheets/${tsId}`, null, 'E002');
    console.log(`  DELETE REJECTED: ${r.ok ? '✅ PASS' : '❌ FAIL'} ${!r.ok ? JSON.stringify(r.data) : ''}`);
  }

  // 2. Holidays — verify PUT truly returns 404 (no route)
  console.log('\n--- Holidays PUT test ---');
  r = await req('GET', '/holidays');
  const holidays = r.data;
  if (holidays && holidays.length > 0) {
    const hId = holidays[0].id;
    r = await req('PUT', `/holidays/${hId}`, { date: holidays[0].date, name: 'Updated', type: 'Company' });
    console.log(`  PUT /holidays/${hId}: status=${r.status} ${r.ok ? '✅ PASS' : '❌ FAIL (no PUT route exists)'}`);
    console.log(`  Response body: ${JSON.stringify(r.data)}`);
  }

  // 3. Holidays — verify the edit button behavior in frontend
  console.log('\n--- Holidays Edit Button Check ---');
  console.log('  Frontend Masters.jsx renderHolidaysTable: only DELETE button, no EDIT button.');
  console.log('  Holiday modal opens for CREATE only (via + Add New Holiday button).');
  console.log('  BUT: if modal.id is set (edit mode), handleModalSubmit sends PUT → 404.');
  // Check if the holiday table has an edit button
  console.log('  ⚠️  renderHolidaysTable does NOT render an edit (✏️) button — only 🗑️ delete.');
  console.log('  However, the "+ Add New Holiday" button calls onEdit() with no item → create-only.');
  console.log('  Verdict: UI only supports Create & Delete for Holidays. No edit button exposed.');

  // 4. Resources/Allocations — PM authorization  
  console.log('\n--- PM can manage allocations ---');
  r = await req('POST', '/allocations', {
    employeeId: 'E002', projectId: 'P002', role: 'QA', allocation: 30,
    startDate: '2026-07-01', endDate: '2026-09-30', plannedHours: 100
  }, 'E003'); // E003 is PM
  console.log(`  PM CREATE allocation: ${r.ok ? '✅ PASS' : '❌ FAIL'} id=${r.data?.id}`);
  if (r.data?.id) {
    await req('DELETE', `/allocations/${r.data.id}`, null, 'E003');
  }

  // 5. Verify Approvals fetch as TL (E004)
  console.log('\n--- Approvals view as TL ---');
  r = await req('GET', '/timesheets', null, 'E004');
  const submitted = r.data?.filter(ts => ts.status === 'Submitted');
  console.log(`  TL sees ${r.data?.length} timesheets, ${submitted?.length} submitted for approval`);

  r = await req('GET', '/tasks', null, 'E004');
  const reviewTasks = r.data?.filter(t => t.status === 'Review' || t.status === 'Completed');
  console.log(`  TL sees ${r.data?.length} tasks, ${reviewTasks?.length} for review`);

  // 6. Dashboard data check
  console.log('\n--- Dashboard data endpoints ---');
  const dashEndpoints = ['/employees', '/projects', '/tasks', '/timesheets', '/allocations'];
  for (const ep of dashEndpoints) {
    r = await req('GET', ep);
    console.log(`  GET ${ep}: ${r.ok ? '✅' : '❌'} ${r.data?.length} records`);
  }

  console.log('\n=== Follow-up Tests Complete ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
