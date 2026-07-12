import { DB } from '../db.js';

export const authenticate = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  try {
    const employees = await DB.getEmployees();
    const user = employees.find(e => e.id === userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid session. User not found.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is inactive.' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied.' });
    }
    next();
  };
};
