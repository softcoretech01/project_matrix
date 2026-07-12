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


// POST /reset-db
router.post('/reset-db', authenticate, authorizeRoles('Admin'), async (req, res) => {
  try {
    await DB.reset();
    res.json({ message: 'Database reset successfully!' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
