import express from 'express';
import { DB } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const handleError = (res, err) => {
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
};


// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const employees = await DB.getEmployees();
    const user = employees.find(e => e.email.toLowerCase() === email.toLowerCase() && e.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is inactive.' });
    }
    res.json(user);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /password
router.post('/password', authenticate, async (req, res) => {
  const { employeeId, password } = req.body;
  
  if (req.user.id !== employeeId && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: You cannot change another user\'s password.' });
  }

  try {
    const employees = await DB.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    await DB.updateEmployee(employeeId, { ...emp, password });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    handleError(res, err);
  }
});


export default router;
