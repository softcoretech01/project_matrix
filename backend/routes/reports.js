import express from 'express';
import { DB } from '../db.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

const handleError = (res, err) => {
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
};

// --- RLS Helpers ---

// Get project IDs the current user is allowed to see
async function getVisibleProjectIds(user) {
  if (user.role === 'Admin' || user.role === 'Management') return null; // null = no filter
  if (user.role === 'PM') {
    const projects = await DB.getProjects();
    return projects.filter(p => p.pmId === user.id).map(p => p.id);
  }
  if (user.role === 'Team Lead' || user.role === 'Employee') {
    const allocs = await DB.getAllocations();
    return allocs.filter(a => a.employeeId === user.id).map(a => a.projectId);
  }
  return [];
}

// Get employee IDs the current user is allowed to see in reports
async function getVisibleEmployeeIds(user) {
  if (user.role === 'Admin' || user.role === 'Management') return null; // null = no filter
  if (user.role === 'PM') {
    const allocs = await DB.getAllocations();
    const projIds = await getVisibleProjectIds(user);
    const empIds = new Set(allocs.filter(a => projIds.includes(a.projectId)).map(a => a.employeeId));
    empIds.add(user.id);
    return [...empIds];
  }
  if (user.role === 'Team Lead') {
    const employees = await DB.getEmployees();
    const teamIds = employees.filter(e => e.managerId === user.id).map(e => e.id);
    teamIds.push(user.id);
    return teamIds;
  }
  return [user.id];
}


// GET /utilization
router.get('/utilization', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const timesheets = await DB.getTimesheets();
    const visibleEmpIds = await getVisibleEmployeeIds(req.user);
    
    // We filter active resources. Available hours are standard 160h per employee (approx monthly)
    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
      .filter(e => visibleEmpIds === null || visibleEmpIds.includes(e.id))
      .map(emp => {
        const logged = timesheets
          .filter(ts => ts.employeeId === emp.id && ts.status === 'Approved')
          .reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
        
        const available = 160.00; // Monthly constant
        const util = available === 0 ? 0 : Math.round((logged / available) * 100);
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          availableHours: available,
          loggedHours: logged,
          utilization: util
        };
      });
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /project-effort
router.get('/project-effort', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const projects = await DB.getProjects();
    const modules = await DB.getModules();
    const tasks = await DB.getTasks();
    const timesheets = await DB.getTimesheets();
    const visibleProjIds = await getVisibleProjectIds(req.user);

    const filteredProjects = visibleProjIds === null
      ? projects
      : projects.filter(p => visibleProjIds.includes(p.id));

    const report = filteredProjects.map(proj => {
      const projTimesheets = timesheets.filter(ts => ts.projectId === proj.id && ts.status === 'Approved');
      const projHours = projTimesheets.reduce((s, ts) => s + parseFloat(ts.hours), 0);
      
      const moduleBreakdown = modules
        .filter(m => m.projectId === proj.id)
        .map(mod => {
          const modHours = projTimesheets
            .filter(ts => ts.moduleId === mod.id)
            .reduce((s, ts) => s + parseFloat(ts.hours), 0);
          return {
            moduleId: mod.id,
            moduleName: mod.name,
            hoursSpent: modHours
          };
        });

      return {
        projectId: proj.id,
        projectCode: proj.code,
        projectName: proj.name,
        totalHoursSpent: projHours,
        modules: moduleBreakdown
      };
    });
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /planned-vs-actual
router.get('/planned-vs-actual', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const tasks = await DB.getTasks();
    const visibleProjIds = await getVisibleProjectIds(req.user);

    const filteredTasks = visibleProjIds === null
      ? tasks
      : tasks.filter(t => visibleProjIds.includes(t.projectId));

    // For Team Lead, further restrict to own team's tasks
    let finalTasks = filteredTasks;
    if (req.user.role === 'Team Lead') {
      const employees = await DB.getEmployees();
      const teamIds = employees.filter(e => e.managerId === req.user.id).map(e => e.id);
      teamIds.push(req.user.id);
      finalTasks = filteredTasks.filter(t => teamIds.includes(t.assignedTo) || t.reviewerId === req.user.id);
    }

    const report = finalTasks.map(t => ({
      taskId: t.id,
      taskName: t.name,
      estimated: t.estimatedHours,
      actual: t.loggedHours
    }));
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /resource-allocation
router.get('/resource-allocation', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const allocations = await DB.getAllocations();
    const projects = await DB.getProjects();
    const visibleEmpIds = await getVisibleEmployeeIds(req.user);

    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
      .filter(e => visibleEmpIds === null || visibleEmpIds.includes(e.id))
      .map(emp => {
        const empAllocs = allocations.filter(a => a.employeeId === emp.id);
        const projectsList = empAllocs.map(a => {
          const p = projects.find(proj => proj.id === a.projectId);
          return {
            projectId: a.projectId,
            projectCode: p ? p.code : 'Unknown',
            projectName: p ? p.name : 'Unknown',
            allocationPct: a.allocation
          };
        });
        const totalPct = empAllocs.reduce((s, a) => s + a.allocation, 0);

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          designation: emp.designation,
          totalAllocationPct: totalPct,
          allocations: projectsList
        };
      });
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /missing-timesheet
router.get('/missing-timesheet', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const timesheets = await DB.getTimesheets();
    const holidays = await DB.getHolidays();
    const visibleEmpIds = await getVisibleEmployeeIds(req.user);
    
    // Check missing entries for a target week: June 15 - June 19, 2026 (Mon-Fri)
    const workDays = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
    const holidayDates = holidays.map(h => h.date);
 
    // Active working days excluding holidays
    const activeWorkDays = workDays.filter(d => !holidayDates.includes(d));

    const report = [];
    employees
      .filter(e => e.status === 'Active' && (e.role === 'Employee' || e.role === 'Team Lead'))
      .filter(e => visibleEmpIds === null || visibleEmpIds.includes(e.id))
      .forEach(emp => {
        const missingDays = [];
        activeWorkDays.forEach(day => {
          const hoursLogged = timesheets
            .filter(ts => ts.employeeId === emp.id && ts.date === day)
            .reduce((s, ts) => s + parseFloat(ts.hours), 0);
          
          if (hoursLogged < 8.00) {
            missingDays.push({
              date: day,
              loggedHours: hoursLogged
            });
          }
        });

        if (missingDays.length > 0) {
          report.push({
            employeeId: emp.id,
            employeeName: emp.name,
            email: emp.email,
            department: emp.department,
            missingCount: missingDays.length,
            missingDays: missingDays
          });
        }
      });

    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /productivity
router.get('/productivity', authenticate, authorizeRoles('Admin', 'Management', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const tasks = await DB.getTasks();
    const visibleEmpIds = await getVisibleEmployeeIds(req.user);

    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
      .filter(e => visibleEmpIds === null || visibleEmpIds.includes(e.id))
      .map(emp => {
        const empTasks = tasks.filter(t => t.assignedTo === emp.id);
        const completed = empTasks.filter(t => t.status === 'Completed' || t.status === 'Closed');
        
        // Average progress % of all active tasks
        const active = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Closed');
        const avgActiveProgress = active.length === 0 ? 0 : Math.round(active.reduce((s, t) => s + t.progress, 0) / active.length);

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          totalAssigned: empTasks.length,
          completedCount: completed.length,
          activeCount: active.length,
          averageActiveProgress: avgActiveProgress
        };
      });

    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
