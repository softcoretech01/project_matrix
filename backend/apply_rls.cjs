const fs = require('fs');
const path = require('path');

const routesDir = 'd:/ProjectMatrix/backend/routes';

const updates = {
  'employees.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getEmployees();
    let filtered = list;
    if (req.user.role === 'PM') {
      const allocs = await DB.getAllocations();
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      const allocatedEmpIds = allocs.filter(a => pmProjs.includes(a.projectId)).map(a => a.employeeId);
      filtered = list.filter(e => e.managerId === req.user.id || e.id === req.user.id || allocatedEmpIds.includes(e.id));
    } else if (req.user.role === 'Team Lead') {
      filtered = list.filter(e => e.managerId === req.user.id || e.id === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(e => e.id === req.user.id);
    }
    
    if (req.user.role !== 'Admin') {
      filtered = filtered.map(e => ({ id: e.id, name: e.name, designation: e.designation, role: e.role, status: e.status, department: e.department }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'clients.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getClients();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.clientId);
      filtered = list.filter(c => pmProjs.includes(c.id));
    } else if (req.user.role === 'Team Lead' || req.user.role === 'Employee') {
      const allocs = (await DB.getAllocations()).filter(a => a.employeeId === req.user.id).map(a => a.projectId);
      const userProjs = (await DB.getProjects()).filter(p => allocs.includes(p.id)).map(p => p.clientId);
      filtered = list.filter(c => userProjs.includes(c.id));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'projects.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getProjects();
    let filtered = list;
    if (req.user.role === 'PM') {
      filtered = list.filter(p => p.pmId === req.user.id);
    } else if (req.user.role === 'Team Lead' || req.user.role === 'Employee') {
      const allocs = (await DB.getAllocations()).filter(a => a.employeeId === req.user.id).map(a => a.projectId);
      filtered = list.filter(p => allocs.includes(p.id));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'allocations.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getAllocations();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      filtered = list.filter(a => pmProjs.includes(a.projectId));
    } else if (req.user.role === 'Team Lead') {
      const myTeam = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      filtered = list.filter(a => myTeam.includes(a.employeeId) || a.employeeId === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(a => a.employeeId === req.user.id);
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'tasks.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getTasks();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      filtered = list.filter(t => pmProjs.includes(t.projectId));
    } else if (req.user.role === 'Team Lead') {
      const myTeam = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      filtered = list.filter(t => myTeam.includes(t.assignedTo) || t.assignedTo === req.user.id || t.reviewerId === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(t => t.assignedTo === req.user.id);
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'timesheets.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee', 'Management'), async (req, res) => {
  try {
    const list = await DB.getTimesheets();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      filtered = list.filter(ts => pmProjs.includes(ts.projectId));
    } else if (req.user.role === 'Team Lead') {
      const myTeam = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      filtered = list.filter(ts => myTeam.includes(ts.employeeId) || ts.employeeId === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(ts => ts.employeeId === req.user.id);
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'modules.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getModules();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      filtered = list.filter(m => pmProjs.includes(m.projectId));
    } else if (req.user.role === 'Team Lead' || req.user.role === 'Employee') {
      const allocs = (await DB.getAllocations()).filter(a => a.employeeId === req.user.id).map(a => a.projectId);
      filtered = list.filter(m => allocs.includes(m.projectId));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'leaves.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getLeaves();
    let filtered = list;
    if (req.user.role === 'PM' || req.user.role === 'Team Lead') {
      const myTeam = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      filtered = list.filter(l => myTeam.includes(l.employeeId) || l.employeeId === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(l => l.employeeId === req.user.id);
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});`,

  'holidays.js': `
router.get('/', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getHolidays();
    res.json(list);
  } catch (err) {
    handleError(res, err);
  }
});`
};

Object.keys(updates).forEach(file => {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the exact router.get('/', ... ) block.
  // We match from router.get('/', up to the end of the block (which is before router.post or module.exports etc)
  const blockRegex = /router\.get\('\/',[\s\S]*?\}\);/;
  
  content = content.replace(blockRegex, updates[file].trim());
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + file);
});
