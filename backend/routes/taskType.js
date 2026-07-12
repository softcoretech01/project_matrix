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
router.get('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const list = await DB.getTaskTypes();
    res.json(list);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /
router.post('/', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.insertTaskType(req.body);
    res.status(201).json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /:id
router.put('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    const record = await DB.updateTaskType(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Task type not found' });
    res.json(record);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.deleteTaskType(req.params.id);
    res.json({ message: 'Task type deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
