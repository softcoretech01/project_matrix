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
    const list = await DB.getLeaves();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      const pmAllocs = (await DB.getAllocations()).filter(a => pmProjs.includes(a.projectId)).map(a => a.employeeId);
      const directReports = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      const allowedEmps = [...new Set([...pmAllocs, ...directReports])];
      filtered = list.filter(l => allowedEmps.includes(l.employeeId) || l.employeeId === req.user.id);
    } else if (req.user.role === 'Team Lead') {
      const myTeam = (await DB.getEmployees()).filter(e => e.managerId === req.user.id).map(e => e.id);
      filtered = list.filter(l => myTeam.includes(l.employeeId) || l.employeeId === req.user.id);
    } else if (req.user.role === 'Employee') {
      filtered = list.filter(l => l.employeeId === req.user.id);
    }
    // Management: summary fields only (read-only overview)
    if (req.user.role === 'Management') {
      filtered = filtered.map(l => ({ id: l.id, employeeId: l.employeeId, type: l.type, status: l.status, startDate: l.startDate, endDate: l.endDate }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    // Non-admins can only submit their own leaves
    if (req.user.role !== 'Admin' && req.body.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot create leave requests for others.' });
    }
    const record = await DB.insertLeave(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin', 'PM', 'Team Lead', 'Employee'), async (req, res) => {
  try {
    const list = await DB.getLeaves();
    const leave = list.find(l => l.id === req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    const user = req.user;

    // Admin can update anything
    if (user.role === 'Admin') {
      const record = await DB.updateLeave(req.params.id, req.body);
      return res.json(record);
    }

    if (user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === user.id).map(p => p.id);
      const pmAllocs = (await DB.getAllocations()).filter(a => pmProjs.includes(a.projectId)).map(a => a.employeeId);
      const directReports = (await DB.getEmployees()).filter(e => e.managerId === user.id).map(e => e.id);
      const allowedEmps = [...new Set([...pmAllocs, ...directReports])];
      if (!allowedEmps.includes(leave.employeeId)) {
        return res.status(403).json({ error: 'Forbidden: You do not manage this employee.' });
      }
      const updatedLeave = {
        ...leave,
        status: req.body.status || leave.status,
        comments: req.body.comments || leave.comments
      };
      const record = await DB.updateLeave(req.params.id, updatedLeave);
      return res.json(record);
    }

    // TL can approve/reject leaves of their team members
    if (user.role === 'Team Lead') {
      const employees = await DB.getEmployees();
      const reportsToMe = employees.filter(e => e.managerId === user.id).map(e => e.id);
      if (!reportsToMe.includes(leave.employeeId)) {
        return res.status(403).json({ error: 'Forbidden: This employee does not report to you.' });
      }
      const updatedLeave = {
        ...leave,
        status: req.body.status || leave.status,
        comments: req.body.comments || leave.comments
      };
      const record = await DB.updateLeave(req.params.id, updatedLeave);
      return res.json(record);
    }

    // Employee can only update their own leaves
    if (user.role === 'Employee') {
      if (leave.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify other user\'s leaves.' });
      }
      if (req.body.employeeId && req.body.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot reassign leave.' });
      }
      const record = await DB.updateLeave(req.params.id, req.body);
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
    const list = await DB.getLeaves();
    const leave = list.find(l => l.id === req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    const user = req.user;

    if (user.role !== 'Admin') {
      if (leave.employeeId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot delete other\'s leave request.' });
      }
      if (leave.status !== 'Pending') {
        return res.status(403).json({ error: 'Forbidden: Can only delete pending leave requests.' });
      }
    }

    await DB.deleteLeave(req.params.id);
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
