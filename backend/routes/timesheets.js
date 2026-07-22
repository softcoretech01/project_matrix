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


// GET /
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
    // Management: summary fields only (read-only for dashboard analytics)
    if (req.user.role === 'Management') {
      filtered = filtered.map(ts => ({ id: ts.id, date: ts.date, employeeId: ts.employeeId, projectId: ts.projectId, moduleId: ts.moduleId, hours: ts.hours, status: ts.status }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    // Non-admins can only submit their own timesheets
    if (req.user.role !== 'Admin' && req.body.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot log timesheets for others.' });
    }
    const record = await DB.insertTimesheet(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getTimesheets();
    const timesheet = list.find(t => t.id === req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });

    const user = req.user;

    // Admin can update anything
    if (user.role === 'Admin') {
      const record = await DB.updateTimesheet(req.params.id, req.body);
      return res.json(record);
    }

    // PM can update status/comments if it's for their project
    if (user.role === 'PM') {
      const projects = await DB.getProjects();
      const myProjectIds = projects.filter(p => p.pmId === user.id).map(p => p.id);
      if (!myProjectIds.includes(timesheet.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this project.' });
      }
      const updatedTimesheet = {
        ...timesheet,
        status: req.body.status || timesheet.status,
        comments: req.body.comments || timesheet.comments
      };
      const record = await DB.updateTimesheet(req.params.id, updatedTimesheet);
      return res.json(record);
    }

    // Team Lead can update status/comments for reportees
    if (user.role === 'Team Lead') {
      const employees = await DB.getEmployees();
      const reportsToMe = employees.filter(e => e.managerId === user.id).map(e => e.id);
      
      const tasks = await DB.getTasks();
      const myReviewTasks = tasks.filter(t => t.reviewerId === user.id).map(t => t.id);

      if (!reportsToMe.includes(timesheet.employeeId) && !myReviewTasks.includes(timesheet.taskId)) {
        return res.status(403).json({ error: 'Forbidden: This employee does not report to you and you are not the reviewer for this task.' });
      }
      const updatedTimesheet = {
        ...timesheet,
        status: req.body.status || timesheet.status,
        comments: req.body.comments || timesheet.comments
      };
      const record = await DB.updateTimesheet(req.params.id, updatedTimesheet);
      return res.json(record);
    }

    // Employee can only update their own timesheets
    if (user.role === 'Employee') {
      if (timesheet.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify other user\'s timesheets.' });
      }
      if (req.body.employeeId && req.body.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot reassign timesheet.' });
      }
      const record = await DB.updateTimesheet(req.params.id, req.body);
      return res.json(record);
    }

    res.status(403).json({ error: 'Forbidden: Operation not allowed.' });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getTimesheets();
    const timesheet = list.find(t => t.id === req.params.id);
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });

    const user = req.user;

    if (user.role !== 'Admin') {
      if (timesheet.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot delete other\'s timesheet.' });
      }
      if (timesheet.status !== 'Draft' && timesheet.status !== 'Rejected') {
        return res.status(403).json({ error: 'Forbidden: Can only delete Draft or Rejected timesheets.' });
      }
    }

    await DB.deleteTimesheet(req.params.id);
    res.json({ message: 'Timesheet deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
