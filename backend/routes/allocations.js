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
    // Management: summary fields only (read-only overview, no cost/planned hours)
    if (req.user.role === 'Management') {
      filtered = filtered.map(a => ({ id: a.id, employeeId: a.employeeId, projectId: a.projectId, role: a.role, allocation: a.allocation, startDate: a.startDate, endDate: a.endDate }));
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
    const record = await DB.insertAllocation(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin', 'PM'), async (req, res) => {
  try {
    if (req.user.role === 'PM') {
      const allocations = await DB.getAllocations();
      const alloc = allocations.find(a => a.id === req.params.id);
      if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
      const projects = await DB.getProjects();
      const proj = projects.find(p => p.id === alloc.projectId);
      if (!proj || proj.pmId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      if (req.body.projectId && req.body.projectId !== alloc.projectId) {
        const newProj = projects.find(p => p.id === req.body.projectId);
        if (!newProj || newProj.pmId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      }
    }
    const record = await DB.updateAllocation(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Allocation not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin', 'PM'), async (req, res) => {
  try {
    if (req.user.role === 'PM') {
      const allocations = await DB.getAllocations();
      const alloc = allocations.find(a => a.id === req.params.id);
      if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
      const projects = await DB.getProjects();
      const proj = projects.find(p => p.id === alloc.projectId);
      if (!proj || proj.pmId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    }
    await DB.deleteAllocation(req.params.id);
    res.json({ message: 'Allocation deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
