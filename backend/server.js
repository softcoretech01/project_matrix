import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DB } from './db.js';

import authRoutes from './routes/auth.js';
import employeesRoutes from './routes/employees.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import modulesRoutes from './routes/modules.js';
import taskTypeRoutes from './routes/taskType.js';
import holidaysRoutes from './routes/holidays.js';
import allocationsRoutes from './routes/allocations.js';
import tasksRoutes from './routes/tasks.js';
import timesheetsRoutes from './routes/timesheets.js';
import leavesRoutes from './routes/leaves.js';
import adminRoutes from './routes/admin.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5002;

await DB.init();

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/task-types', taskTypeRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/allocations', allocationsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);

app.listen(PORT, () => {
  console.log(`[API] Express Server is listening on http://localhost:${PORT}`);
});
