// backend/routes/employees.js
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

// GET / - list employees (requires authentication)
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
    // Management: sees all employees but summary fields only (read-only overview)
    
    if (req.user.role !== 'Admin') {
      filtered = filtered.map(e => ({ id: e.id, name: e.name, designation: e.designation, role: e.role, status: e.status, department: e.department }));
    }
    res.json(filtered);
  } catch (err) {
    handleError(res, err);
  }
});


// POST /
router.post('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.insertEmployee(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.updateEmployee(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Employee not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.deleteEmployee(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
