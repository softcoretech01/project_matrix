// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DB } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Database connection (MySQL or Fallback JSON)
await DB.init();

// --- API ENDPOINTS ---

// MODULE 1: AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const employees = await DB.getEmployees();
    const user = employees.find(e => e.email.toLowerCase() === email.toLowerCase() && e.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is inactive.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Developer user switcher
app.post('/api/auth/switch', async (req, res) => {
  const { id } = req.body;
  try {
    const employees = await DB.getEmployees();
    const user = employees.find(e => e.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
app.post('/api/auth/password', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    const employees = await DB.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    await DB.updateEmployee(employeeId, { ...emp, password });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 3: MASTER MANAGEMENT
// Employees CRUD
app.get('/api/employees', async (req, res) => {
  try {
    const list = await DB.getEmployees();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const record = await DB.insertEmployee(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const record = await DB.updateEmployee(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Employee not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await DB.deleteEmployee(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clients CRUD
app.get('/api/clients', async (req, res) => {
  try {
    const list = await DB.getClients();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const record = await DB.insertClient(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const record = await DB.updateClient(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Client not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await DB.deleteClient(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Projects CRUD
app.get('/api/projects', async (req, res) => {
  try {
    const list = await DB.getProjects();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const record = await DB.insertProject(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const record = await DB.updateProject(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Project not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await DB.deleteProject(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modules CRUD
app.get('/api/modules', async (req, res) => {
  try {
    const list = await DB.getModules();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/modules', async (req, res) => {
  try {
    const record = await DB.insertModule(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/modules/:id', async (req, res) => {
  try {
    const record = await DB.updateModule(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Module not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/modules/:id', async (req, res) => {
  try {
    await DB.deleteModule(req.params.id);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Task Types
app.get('/api/task-types', async (req, res) => {
  try {
    const list = await DB.getTaskTypes();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Holidays CRUD
app.get('/api/holidays', async (req, res) => {
  try {
    const list = await DB.getHolidays();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', async (req, res) => {
  try {
    const record = await DB.insertHoliday(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/holidays/:id', async (req, res) => {
  try {
    await DB.deleteHoliday(req.params.id);
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 4: RESOURCE MANAGEMENT
// Allocations CRUD
app.get('/api/allocations', async (req, res) => {
  try {
    const list = await DB.getAllocations();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/allocations', async (req, res) => {
  try {
    const record = await DB.insertAllocation(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/allocations/:id', async (req, res) => {
  try {
    const record = await DB.updateAllocation(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Allocation not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/allocations/:id', async (req, res) => {
  try {
    await DB.deleteAllocation(req.params.id);
    res.json({ message: 'Allocation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 5: TASK MANAGEMENT
// Tasks CRUD
app.get('/api/tasks', async (req, res) => {
  try {
    const list = await DB.getTasks();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const record = await DB.insertTask(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const record = await DB.updateTask(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Task not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await DB.deleteTask(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 6: TIMESHEET MANAGEMENT
// Timesheets CRUD
app.get('/api/timesheets', async (req, res) => {
  try {
    const list = await DB.getTimesheets();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timesheets', async (req, res) => {
  try {
    const record = await DB.insertTimesheet(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/timesheets/:id', async (req, res) => {
  try {
    const record = await DB.updateTimesheet(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Timesheet not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timesheets/:id', async (req, res) => {
  try {
    await DB.deleteTimesheet(req.params.id);
    res.json({ message: 'Timesheet deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 8: LEAVE MANAGEMENT
// Leaves CRUD
app.get('/api/leaves', async (req, res) => {
  try {
    const list = await DB.getLeaves();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const record = await DB.insertLeave(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leaves/:id', async (req, res) => {
  try {
    const record = await DB.updateLeave(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Leave not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leaves/:id', async (req, res) => {
  try {
    await DB.deleteLeave(req.params.id);
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Administration DB Reset
app.post('/api/admin/reset-db', async (req, res) => {
  try {
    await DB.reset();
    res.json({ message: 'Database reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODULE 9: REPORTS AGGREGATIONS
app.get('/api/reports/utilization', async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const timesheets = await DB.getTimesheets();
    
    // We filter active resources. Available hours are standard 160h per employee (approx monthly)
    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/project-effort', async (req, res) => {
  try {
    const projects = await DB.getProjects();
    const modules = await DB.getModules();
    const tasks = await DB.getTasks();
    const timesheets = await DB.getTimesheets();

    const report = projects.map(proj => {
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/planned-vs-actual', async (req, res) => {
  try {
    const tasks = await DB.getTasks();
    const report = tasks.map(t => ({
      taskId: t.id,
      taskName: t.name,
      estimated: t.estimatedHours,
      actual: t.loggedHours
    }));
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/resource-allocation', async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const allocations = await DB.getAllocations();
    const projects = await DB.getProjects();

    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/missing-timesheet', async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const timesheets = await DB.getTimesheets();
    const holidays = await DB.getHolidays();
    
    // Check missing entries for a target week: June 15 - June 19, 2026 (Mon-Fri)
    const workDays = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
    const holidayDates = holidays.map(h => h.date);

    // Active working days excluding holidays
    const activeWorkDays = workDays.filter(d => !holidayDates.includes(d));

    const report = [];
    employees
      .filter(e => e.status === 'Active' && (e.role === 'Employee' || e.role === 'Team Lead'))
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/productivity', async (req, res) => {
  try {
    const employees = await DB.getEmployees();
    const tasks = await DB.getTasks();

    const report = employees
      .filter(e => e.role === 'Employee' || e.role === 'Team Lead')
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
    res.status(500).json({ error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`[API] Express Server is listening on http://localhost:${PORT}`);
});
