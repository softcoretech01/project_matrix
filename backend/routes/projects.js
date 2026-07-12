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
    const list = await DB.getProjects();
    let filtered = list;
    if (req.user.role === 'PM') {
      filtered = list.filter(p => p.pmId === req.user.id);
    } else if (req.user.role === 'Team Lead' || req.user.role === 'Employee') {
      const allocs = (await DB.getAllocations()).filter(a => a.employeeId === req.user.id).map(a => a.projectId);
      filtered = list.filter(p => allocs.includes(p.id));
    }
    // Team Lead & Employee: strip sensitive budget/cost fields
    if (req.user.role === 'Employee' || req.user.role === 'Team Lead') {
      filtered = filtered.map(p => ({ id: p.id, code: p.code, name: p.name, clientId: p.clientId, pmId: p.pmId, startDate: p.startDate, endDate: p.endDate, estimatedHours: p.estimatedHours, billable: p.billable, status: p.status }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.insertProject(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.updateProject(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Project not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.deleteProject(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
