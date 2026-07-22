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
    // Management: summary fields only (read-only overview for dashboard/reports)
    if (req.user.role === 'Management') {
      filtered = filtered.map(t => ({ id: t.id, name: t.name, projectId: t.projectId, moduleId: t.moduleId, status: t.status, progress: t.progress, priority: t.priority, estimatedHours: t.estimatedHours, loggedHours: t.loggedHours, startDate: t.startDate, endDate: t.endDate }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('Admin', 'PM'), async (req, res) => {
  try {
    if (req.user.role === 'PM') {
      const projects = await DB.getProjects();
      const proj = projects.find(p => p.id === req.body.projectId);
      if (!proj || proj.pmId !== req.user.id) return res.status(403).json({ error: 'Not authorized for this project' });
    }
    const record = await DB.insertTask(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const tasksList = await DB.getTasks();
    const task = tasksList.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = req.user;

    // Admin can update any task
    if (user.role === 'Admin') {
      const record = await DB.updateTask(req.params.id, req.body);
      return res.json(record);
    }

    // PM can update tasks for their projects
    if (user.role === 'PM') {
      const projects = await DB.getProjects();
      const proj = projects.find(p => p.id === task.projectId);
      if (!proj || proj.pmId !== user.id) return res.status(403).json({ error: 'Not authorized for this task' });
      if (req.body.projectId && req.body.projectId !== task.projectId) {
        const newProj = projects.find(p => p.id === req.body.projectId);
        if (!newProj || newProj.pmId !== user.id) return res.status(403).json({ error: 'Not authorized for this new project' });
      }
      const record = await DB.updateTask(req.params.id, req.body);
      return res.json(record);
    }

    // Team Lead can update tasks assigned to reportees or reviewed by them
    if (user.role === 'Team Lead') {
      const employees = await DB.getEmployees();
      const reportsToMe = employees.filter(e => e.managerId === user.id).map(e => e.id);
      if (!reportsToMe.includes(task.assignedTo) && task.reviewerId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this task.' });
      }
      const record = await DB.updateTask(req.params.id, req.body);
      return res.json(record);
    }

    // Employee can only update progress & status on their assigned tasks
    if (user.role === 'Employee') {
      if (task.assignedTo !== user.id) {
        return res.status(403).json({ error: 'Forbidden: This task is not assigned to you.' });
      }
      const updatedTask = {
        ...task,
        progress: req.body.progress !== undefined ? req.body.progress : task.progress,
        status: req.body.status !== undefined ? req.body.status : task.status
      };
      const record = await DB.updateTask(req.params.id, updatedTask);
      return res.json(record);
    }

    res.status(403).json({ error: 'Forbidden: Operation not allowed.' });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead'), async (req, res) => {
  try {
    const tasksList = await DB.getTasks();
    const task = tasksList.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = req.user;

    // PM can delete tasks on their projects
    if (user.role === 'PM') {
      const projects = await DB.getProjects();
      const myProjectIds = projects.filter(p => p.pmId === user.id).map(p => p.id);
      if (!myProjectIds.includes(task.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this project.' });
      }
    }

    // TL can delete tasks assigned to reportees or reviewed by them
    if (user.role === 'Team Lead') {
      const employees = await DB.getEmployees();
      const reportsToMe = employees.filter(e => e.managerId === user.id).map(e => e.id);
      if (!reportsToMe.includes(task.assignedTo) && task.reviewerId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this task.' });
      }
    }

    await DB.deleteTask(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
