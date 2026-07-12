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
    const list = await DB.getModules();
    let filtered = list;
    if (req.user.role === 'PM') {
      const pmProjs = (await DB.getProjects()).filter(p => p.pmId === req.user.id).map(p => p.id);
      filtered = list.filter(m => pmProjs.includes(m.projectId));
    } else if (req.user.role === 'Team Lead' || req.user.role === 'Employee') {
      const allocs = (await DB.getAllocations()).filter(a => a.employeeId === req.user.id).map(a => a.projectId);
      filtered = list.filter(m => allocs.includes(m.projectId));
    }
    // Management: summary fields only
    if (req.user.role === 'Management') {
      filtered = filtered.map(m => ({ id: m.id, projectId: m.projectId, name: m.name, status: m.status }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.insertModule(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.updateModule(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Module not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.deleteModule(req.params.id);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
