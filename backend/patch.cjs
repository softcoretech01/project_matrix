const fs = require('fs');

let content = fs.readFileSync('./db.js', 'utf8');

// Clients
content = content.replace(
  `[cli.id, cli.name, cli.contactPerson, cli.email, cli.phone, cli.country, cli.status]`,
  `[cli.id, cli.name, cli.contactPerson, cli.email, cli.phone || null, cli.country, cli.status || 'Active']`
);
content = content.replace(
  `[cli.name, cli.contactPerson, cli.email, cli.phone, cli.country, cli.status, id]`,
  `[cli.name, cli.contactPerson, cli.email, cli.phone || null, cli.country, cli.status || 'Active', id]`
);

// Projects
content = content.replace(
  `[p.id, p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours, p.budget, p.billable ? 1 : 0, p.status]`,
  `[p.id, p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours || 0, p.budget || 0, p.billable ? 1 : 0, p.status || 'Active']`
);
content = content.replace(
  `[p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours, p.budget, p.billable ? 1 : 0, p.status, id]`,
  `[p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours || 0, p.budget || 0, p.billable ? 1 : 0, p.status || 'Active', id]`
);

// Modules
content = content.replace(
  `[m.id, m.projectId, m.name, m.description, m.priority, m.status]`,
  `[m.id, m.projectId, m.name, m.description || null, m.priority || 'Medium', m.status || 'Active']`
);
content = content.replace(
  `[m.projectId, m.name, m.description, m.priority, m.status, id]`,
  `[m.projectId, m.name, m.description || null, m.priority || 'Medium', m.status || 'Active', id]`
);

// Allocations
content = content.replace(
  `[a.id, a.employeeId, a.projectId, a.role, a.allocation, a.startDate, a.endDate, a.plannedHours]`,
  `[a.id, a.employeeId, a.projectId, a.role || 'Unassigned', a.allocation || 100, a.startDate, a.endDate, a.plannedHours || 0]`
);
content = content.replace(
  `[a.employeeId, a.projectId, a.role, a.allocation, a.startDate, a.endDate, a.plannedHours, id]`,
  `[a.employeeId, a.projectId, a.role || 'Unassigned', a.allocation || 100, a.startDate, a.endDate, a.plannedHours || 0, id]`
);

// Tasks
content = content.replace(
  `[t.id, t.name, t.description, t.projectId, t.moduleId, t.priority, t.estimatedHours, t.startDate, t.endDate, t.assignedTo, t.reviewerId, t.status, t.progress]`,
  `[t.id, t.name, t.description || null, t.projectId, t.moduleId, t.priority || 'Medium', t.estimatedHours || 0, t.startDate, t.endDate, t.assignedTo || null, t.reviewerId || null, t.status || 'Open', t.progress || 0]`
);
content = content.replace(
  `[t.name, t.description, t.projectId, t.moduleId, t.priority, t.estimatedHours, t.startDate, t.endDate, t.assignedTo, t.reviewerId, t.status, t.progress, t.loggedHours, id]`,
  `[t.name, t.description || null, t.projectId, t.moduleId, t.priority || 'Medium', t.estimatedHours || 0, t.startDate, t.endDate, t.assignedTo || null, t.reviewerId || null, t.status || 'Open', t.progress || 0, t.loggedHours || 0, id]`
);

// Timesheets
// Timesheet replacement can be tricky due to existing defaults in the line.
content = content.replace(
  `[ts.id, ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours, ts.description, ts.status, ts.comments || null, ts.submittedDate || null]`,
  `[ts.id, ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours || 0, ts.description || null, ts.status || 'Draft', ts.comments || null, ts.submittedDate || null]`
);
content = content.replace(
  `[ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours, ts.description, ts.status, ts.comments || null, ts.submittedDate || null, id]`,
  `[ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours || 0, ts.description || null, ts.status || 'Draft', ts.comments || null, ts.submittedDate || null, id]`
);

// Leaves
content = content.replace(
  `[l.id, l.employeeId, l.startDate, l.endDate, l.type, l.status, l.comments || null]`,
  `[l.id, l.employeeId, l.startDate, l.endDate, l.type || 'Casual', l.status || 'Pending', l.comments || null]`
);
content = content.replace(
  `[l.employeeId, l.startDate, l.endDate, l.type, l.status, l.comments || null, id]`,
  `[l.employeeId, l.startDate, l.endDate, l.type || 'Casual', l.status || 'Pending', l.comments || null, id]`
);

// Add missing TaskType methods
const taskTypeAdditions = `
  async insertTaskType(tt) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.taskTypes.length + 1;
      tt.id = \`TT\${count}\`;
      data.taskTypes.push(tt);
      this.saveMockData(data);
      return tt;
    }
    const [result] = await this.pool.execute(
      'INSERT INTO task_types (name) VALUES (?)',
      [tt.name]
    );
    tt.id = \`TT\${result.insertId}\`;
    return tt;
  }

  async updateTaskType(id, tt) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.taskTypes.findIndex(x => x.id === id);
      if (index !== -1) {
        data.taskTypes[index] = { ...data.taskTypes[index], ...tt };
        this.saveMockData(data);
        return data.taskTypes[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE task_types SET name = ? WHERE id = ?',
      [tt.name, id]
    );
    return { id, ...tt };
  }

  async deleteTaskType(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.taskTypes = data.taskTypes.filter(t => t.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM task_types WHERE id = ?', [id]);
    return true;
  }
`;

// Insert the methods right before "// Holidays"
content = content.replace('// Holidays', taskTypeAdditions + '\\n  // Holidays');

fs.writeFileSync('./db.js', content, 'utf8');
