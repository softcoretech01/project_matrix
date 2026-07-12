async function verifyTimesheetFix() {
  const baseUrl = 'http://localhost:5002/api';
  const headers = (userId) => ({ 'Content-Type': 'application/json', 'x-user-id': userId });
  
  try {
    const empId = 'E001';
    console.log(`--- Verifying Data Fetched for Employee (${empId}) ---`);
    
    // Simulate what Timesheets.jsx fetchData does now with headers
    let res = await fetch(`${baseUrl}/allocations`, { headers: headers(empId) });
    let allocs = await res.json();
    console.log("Allocations count:", Array.isArray(allocs) ? allocs.length : allocs);
    
    res = await fetch(`${baseUrl}/projects`, { headers: headers(empId) });
    let projs = await res.json();
    console.log("Projects count:", Array.isArray(projs) ? projs.length : projs);
    
    res = await fetch(`${baseUrl}/modules`, { headers: headers(empId) });
    let mods = await res.json();
    console.log("Modules count:", Array.isArray(mods) ? mods.length : mods);
    
    res = await fetch(`${baseUrl}/tasks`, { headers: headers(empId) });
    let tasks = await res.json();
    console.log("Tasks count:", Array.isArray(tasks) ? tasks.length : tasks);
    
    // Simulate Timesheets.jsx logic for Dropdowns
    const allocatedProjIds = allocs.filter(a => a.employeeId === empId).map(a => a.projectId);
    const myActiveProjects = projs.filter(p => allocatedProjIds.includes(p.id) && p.status === 'Active');
    
    console.log("\n--- UI Dropdown Verification ---");
    console.log(`Project Dropdown Populated: ${myActiveProjects.length > 0} (Found ${myActiveProjects.length} active projects)`);
    if (myActiveProjects.length > 0) {
      const defaultProjId = myActiveProjects[0].id;
      const matchingMods = mods.filter(m => m.projectId === defaultProjId && m.status === 'Active');
      console.log(`Module Dropdown Populated for Project ${defaultProjId}: ${matchingMods.length > 0} (Found ${matchingMods.length})`);
      
      if (matchingMods.length > 0) {
        const defaultModId = matchingMods[0].id;
        const myTasks = tasks.filter(t => t.assignedTo === empId);
        const matchingTasks = myTasks.filter(t => t.projectId === defaultProjId && t.moduleId === defaultModId);
        console.log(`Task Dropdown Populated for Module ${defaultModId}: ${matchingTasks.length > 0} (Found ${matchingTasks.length})`);
      }
    }
    
    // 1. Employee submits a Timesheet
    console.log("\n--- Submitting Timesheet (Employee) ---");
    const payload = {
      date: '2026-07-08',
      employeeId: empId,
      projectId: myActiveProjects[0].id,
      moduleId: mods.find(m => m.projectId === myActiveProjects[0].id).id,
      taskId: tasks.find(t => t.assignedTo === empId).id,
      hours: 4.5,
      description: 'Testing the timesheet UI',
      status: 'Draft'
    };
    let postRes = await fetch(`${baseUrl}/timesheets`, { 
      method: 'POST', 
      headers: headers(empId), 
      body: JSON.stringify(payload) 
    });
    let ts = await postRes.json();
    console.log("Timesheet Created successfully:", ts.id, ts.status);
    
    // Employee updates to 'Submitted'
    console.log("\n--- Employee Updating to Submitted ---");
    let putRes = await fetch(`${baseUrl}/timesheets/${ts.id}`, { 
      method: 'PUT', 
      headers: headers(empId), 
      body: JSON.stringify({ ...payload, status: 'Submitted', submittedDate: '2026-07-08' }) 
    });
    ts = await putRes.json();
    console.log("Timesheet updated to:", ts.status);
    
    // 2. PM Approval
    console.log("\n--- PM Approving Timesheet ---");
    let pmPut = await fetch(`${baseUrl}/timesheets/${ts.id}`, { 
      method: 'PUT', 
      headers: headers('E003'), 
      body: JSON.stringify({ ...ts, status: 'Approved', comments: 'Looks good' }) 
    });
    let pmTs = await pmPut.json();
    console.log("Timesheet final status by PM:", pmTs.status);
    
  } catch(e) {
    console.error("Test Error:", e);
  }
}

verifyTimesheetFix();
