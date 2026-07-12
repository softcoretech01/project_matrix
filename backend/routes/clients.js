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
    // Management, Team Lead, Employee: summary fields only (no contact details)
    if (req.user.role === 'Management' || req.user.role === 'Employee' || req.user.role === 'Team Lead') {
      filtered = filtered.map(c => ({ id: c.id, name: c.name, country: c.country, status: c.status }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.insertClient(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.updateClient(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Client not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.deleteClient(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
