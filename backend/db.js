// backend/db.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DB_PATH = path.join(__dirname, 'mock_db.json');

// Default initial data for mock fallback
const DEFAULT_MOCK_DATA = {
  employees: [
    { id: 'E001', code: 'EMP001', name: 'Ravi Sharma', email: 'ravi@projectmatrix.com', mobile: '9876543210', designation: 'Senior Developer', department: 'Engineering', managerId: 'E003', costPerHour: 25, role: 'Employee', status: 'Active', password: 'password123' },
    { id: 'E002', code: 'EMP002', name: 'Kumar Gupta', email: 'kumar@projectmatrix.com', mobile: '9876543211', designation: 'QA Engineer', department: 'Quality Assurance', managerId: 'E004', costPerHour: 20, role: 'Employee', status: 'Active', password: 'password123' },
    { id: 'E003', code: 'EMP003', name: 'Sophia Patel', email: 'sophia@projectmatrix.com', mobile: '9876543212', designation: 'Project Manager', department: 'PMO', managerId: 'E005', costPerHour: 50, role: 'PM', status: 'Active', password: 'password123' },
    { id: 'E004', code: 'EMP004', name: 'Liam O\'Connor', email: 'liam@projectmatrix.com', mobile: '9876543213', designation: 'Technical Lead', department: 'Engineering', managerId: 'E003', costPerHour: 40, role: 'Team Lead', status: 'Active', password: 'password123' },
    { id: 'E005', code: 'EMP005', name: 'Emily Chen', email: 'emily@projectmatrix.com', mobile: '9876543214', designation: 'VP Engineering', department: 'Executive', managerId: '', costPerHour: 75, role: 'Management', status: 'Active', password: 'password123' },
    { id: 'E006', code: 'EMP006', name: 'Admin User', email: 'admin@projectmatrix.com', mobile: '9876543215', designation: 'IT Director', department: 'Administration', managerId: '', costPerHour: 0, role: 'Admin', status: 'Active', password: 'admin' }
  ],
  clients: [
    { id: 'C001', name: 'Acme Corporation', contactPerson: 'John Doe', email: 'johndoe@acme.com', phone: '123-456-7890', country: 'United States', status: 'Active' },
    { id: 'C002', name: 'Globex Industries', contactPerson: 'Jane Smith', email: 'janesmith@globex.com', phone: '234-567-8901', country: 'Canada', status: 'Active' },
    { id: 'C003', name: 'TechStart Inc', contactPerson: 'Robert Lee', email: 'robert@techstart.io', phone: '345-678-9012', country: 'United Kingdom', status: 'Active' }
  ],
  projects: [
    { id: 'P001', code: 'ERP', name: 'ERP Integration Suite', clientId: 'C001', pmId: 'E003', startDate: '2026-05-01', endDate: '2026-10-31', estimatedHours: 1200, budget: 50000, billable: true, status: 'Active' },
    { id: 'P002', code: 'CRM', name: 'CRM Customer Portal', clientId: 'C002', pmId: 'E003', startDate: '2026-06-01', endDate: '2026-09-30', estimatedHours: 800, budget: 30000, billable: true, status: 'Active' },
    { id: 'P003', code: 'TRN', name: 'Internal Training Program', clientId: 'C003', pmId: 'E004', startDate: '2026-01-01', endDate: '2026-12-31', estimatedHours: 200, budget: 5000, billable: false, status: 'Active' }
  ],
  modules: [
    { id: 'M001', projectId: 'P001', name: 'Inventory Management', description: 'Stock control and tracking modules', priority: 'High', status: 'Active' },
    { id: 'M002', projectId: 'P001', name: 'Purchase Orders', description: 'Requisitions and purchase orders', priority: 'Medium', status: 'Active' },
    { id: 'M003', projectId: 'P001', name: 'Financial Ledger', description: 'General ledger and accounting reports', priority: 'High', status: 'Active' },
    { id: 'M004', projectId: 'P002', name: 'Lead Acquisition', description: 'Capture leads from website and forms', priority: 'High', status: 'Active' },
    { id: 'M005', projectId: 'P002', name: 'Deals & Contacts', description: 'Manage sales deals pipeline', priority: 'Medium', status: 'Active' }
  ],
  taskTypes: [
    { id: 'TT1', name: 'Development' },
    { id: 'TT2', name: 'Bug Fix' },
    { id: 'TT3', name: 'Testing' },
    { id: 'TT4', name: 'Support' },
    { id: 'TT5', name: 'Meeting' },
    { id: 'TT6', name: 'Documentation' },
    { id: 'TT7', name: 'Training' }
  ],
  holidays: [
    { id: 1, date: '2026-01-01', name: 'New Year\'s Day', type: 'Public' },
    { id: 2, date: '2026-07-04', name: 'Independence Day', type: 'Public' },
    { id: 3, date: '2026-11-26', name: 'Thanksgiving Day', type: 'Company' },
    { id: 4, date: '2026-12-25', name: 'Christmas Day', type: 'Public' }
  ],
  allocations: [
    { id: 'A001', employeeId: 'E001', projectId: 'P001', role: 'Senior Developer', allocation: 100, startDate: '2026-05-01', endDate: '2026-10-31', plannedHours: 800 },
    { id: 'A002', employeeId: 'E002', projectId: 'P002', role: 'QA Tester', allocation: 50, startDate: '2026-06-01', endDate: '2026-09-30', plannedHours: 400 },
    { id: 'A003', employeeId: 'E002', projectId: 'P001', role: 'QA Tester', allocation: 50, startDate: '2026-06-01', endDate: '2026-10-31', plannedHours: 400 },
    { id: 'A004', employeeId: 'E004', projectId: 'P001', role: 'Technical Lead', allocation: 100, startDate: '2026-05-01', endDate: '2026-10-31', plannedHours: 800 }
  ],
  tasks: [
    { id: 'T001', name: 'Stock Entry Screen UI', description: 'Create dynamic responsive grid for stock entry', projectId: 'P001', moduleId: 'M001', priority: 'High', estimatedHours: 40, startDate: '2026-06-01', endDate: '2026-06-25', assignedTo: 'E001', reviewerId: 'E004', status: 'In Progress', progress: 60, loggedHours: 24.00 },
    { id: 'T002', name: 'Financial Ledger Report', description: 'Generate accounting audit balance reports', projectId: 'P001', moduleId: 'M003', priority: 'High', estimatedHours: 30, startDate: '2026-06-05', endDate: '2026-06-30', assignedTo: 'E002', reviewerId: 'E004', status: 'Assigned', progress: 10, loggedHours: 8.00 },
    { id: 'T003', name: 'Lead Capture Form validation', description: 'Add JS validation to CRM capture screen', projectId: 'P002', moduleId: 'M004', priority: 'Medium', estimatedHours: 20, startDate: '2026-06-08', endDate: '2026-06-18', assignedTo: 'E001', reviewerId: 'E003', status: 'Completed', progress: 100, loggedHours: 18.00 },
    { id: 'T004', name: 'Database Query Optimization', description: 'Build indices for reporting speedups', projectId: 'P001', moduleId: 'M003', priority: 'High', estimatedHours: 16, startDate: '2026-06-12', endDate: '2026-06-19', assignedTo: 'E004', reviewerId: 'E003', status: 'Review', progress: 95, loggedHours: 15.00 }
  ],
  timesheets: [
    { id: 'TS001', date: '2026-06-08', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Developed initial layout for Stock Entry Screen UI', status: 'Approved', comments: 'Looks good', submittedDate: '2026-06-12' },
    { id: 'TS002', date: '2026-06-09', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Added bindings to Stock Entry fields', status: 'Approved', comments: 'Looks good', submittedDate: '2026-06-12' },
    { id: 'TS003', date: '2026-06-10', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Fixed validation in Stock Entry API integration', status: 'Approved', comments: 'Looks good', submittedDate: '2026-06-12' },
    { id: 'TS004', date: '2026-06-11', employeeId: 'E001', projectId: 'P002', moduleId: 'M004', taskId: 'T003', hours: 8.00, description: 'Created Lead Capture form template', status: 'Approved', comments: 'Looks good', submittedDate: '2026-06-12' },
    { id: 'TS005', date: '2026-06-12', employeeId: 'E001', projectId: 'P002', moduleId: 'M004', taskId: 'T003', hours: 8.00, description: 'Added final touch to validation scripts', status: 'Approved', comments: 'Looks good', submittedDate: '2026-06-12' },
    { id: 'TS006', date: '2026-06-08', employeeId: 'E002', projectId: 'P002', moduleId: 'M004', taskId: 'T003', hours: 4.00, description: 'Testing form components', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS007', date: '2026-06-08', employeeId: 'E002', projectId: 'P001', moduleId: 'M003', taskId: 'T002', hours: 4.00, description: 'Auditing ledger ledger columns', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS008', date: '2026-06-09', employeeId: 'E002', projectId: 'P001', moduleId: 'M003', taskId: 'T002', hours: 8.00, description: 'Initial test plan for Ledger Report', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS009', date: '2026-06-10', employeeId: 'E002', projectId: 'P001', moduleId: 'M003', taskId: 'T002', hours: 8.00, description: 'Writing integration tests for ledger report', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS010', date: '2026-06-11', employeeId: 'E002', projectId: 'P002', moduleId: 'M004', taskId: 'T003', hours: 8.00, description: 'Verification check on validation forms', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS011', date: '2026-06-12', employeeId: 'E002', projectId: 'P002', moduleId: 'M004', taskId: 'T003', hours: 8.00, description: 'Signing off lead capture validation task', status: 'Approved', comments: 'Perfect', submittedDate: '2026-06-12' },
    { id: 'TS012', date: '2026-06-15', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Worked on grid performance issues', status: 'Submitted', comments: '', submittedDate: '2026-06-17' },
    { id: 'TS013', date: '2026-06-16', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Re-designed item rendering logic', status: 'Submitted', comments: '', submittedDate: '2026-06-17' },
    { id: 'TS014', date: '2026-06-17', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Connected grid actions to mock local DB state', status: 'Submitted', comments: '', submittedDate: '2026-06-17' },
    { id: 'TS015', date: '2026-06-18', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Implementing timesheet entry screens in HTML/CSS', status: 'Draft', comments: '', submittedDate: null },
    { id: 'TS016', date: '2026-06-19', employeeId: 'E001', projectId: 'P001', moduleId: 'M001', taskId: 'T001', hours: 8.00, description: 'Polishing layout styling and transitions', status: 'Draft', comments: '', submittedDate: null }
  ],
  leaves: [
    { id: 'L001', employeeId: 'E001', startDate: '2026-07-06', endDate: '2026-07-07', type: 'Casual', status: 'Approved', comments: 'Approved' },
    { id: 'L002', employeeId: 'E002', startDate: '2026-06-25', endDate: '2026-06-26', type: 'Sick', status: 'Pending', comments: '' }
  ]
};

class DBService {
  constructor() {
    this.pool = null;
    this.isFallback = false;
  }

  async init() {
    try {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'projectmatrix',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };

      console.log(`[DB] Attempting MySQL connection to ${config.host}:${config.port}...`);
      this.pool = mysql.createPool(config);

      // Verify connection
      const connection = await this.pool.getConnection();
      console.log(`[DB] Success! Connected to MySQL database "${config.database}".`);
      connection.release();
    } catch (err) {
      console.warn(`[WARN] MySQL connection failed: ${err.message}`);
      console.warn(`[WARN] Falling back to file-based mock database at: ${MOCK_DB_PATH}`);
      this.isFallback = true;
      this.initMockFile();
    }
  }

  initMockFile() {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(DEFAULT_MOCK_DATA, null, 2));
    }
  }

  getMockData() {
    this.initMockFile();
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));
  }

  saveMockData(data) {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
  }

  // --- ENTITY SERVICE METHODS ---

  // Employees
  async getEmployees() {
    if (this.isFallback) {
      return this.getMockData().employees;
    }
    const [rows] = await this.pool.execute('SELECT * FROM employees');
    return rows;
  }

  async insertEmployee(emp) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.employees.length + 1;
      emp.id = `E${String(count).padStart(3, '0')}`;
      data.employees.push(emp);
      this.saveMockData(data);
      return emp;
    }
    const newId = emp.id || ('E' + Date.now().toString().slice(-6));
    const [result] = await this.pool.execute(
      'INSERT INTO employees (id, code, name, email, mobile, designation, department, managerId, costPerHour, role, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newId, emp.code, emp.name, emp.email, emp.mobile, emp.designation, emp.department, emp.managerId || null, emp.costPerHour, emp.role, emp.status, emp.password]
    );
    emp.id = newId;
    return emp;
  }

  async updateEmployee(id, emp) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.employees.findIndex(e => e.id === id);
      if (index !== -1) {
        data.employees[index] = { ...data.employees[index], ...emp };
        this.saveMockData(data);
        return data.employees[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE employees SET code = ?, name = ?, email = ?, mobile = ?, designation = ?, department = ?, managerId = ?, costPerHour = ?, role = ?, status = ?, password = ? WHERE id = ?',
      [emp.code, emp.name, emp.email, emp.mobile, emp.designation, emp.department, emp.managerId || null, emp.costPerHour, emp.role, emp.status, emp.password, id]
    );
    return { id, ...emp };
  }

  async deleteEmployee(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.employees = data.employees.filter(e => e.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM employees WHERE id = ?', [id]);
    return true;
  }

  // Clients
  async getClients() {
    if (this.isFallback) return this.getMockData().clients;
    const [rows] = await this.pool.execute('SELECT * FROM clients');
    return rows;
  }

  async insertClient(cli) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.clients.length + 1;
      cli.id = `C${String(count).padStart(3, '0')}`;
      data.clients.push(cli);
      this.saveMockData(data);
      return cli;
    }
    await this.pool.execute(
      'INSERT INTO clients (id, name, contactPerson, email, phone, country, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cli.id, cli.name, cli.contactPerson, cli.email, cli.phone, cli.country, cli.status]
    );
    return cli;
  }

  async updateClient(id, cli) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.clients.findIndex(c => c.id === id);
      if (index !== -1) {
        data.clients[index] = { ...data.clients[index], ...cli };
        this.saveMockData(data);
        return data.clients[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE clients SET name = ?, contactPerson = ?, email = ?, phone = ?, country = ?, status = ? WHERE id = ?',
      [cli.name, cli.contactPerson, cli.email, cli.phone, cli.country, cli.status, id]
    );
    return { id, ...cli };
  }

  async deleteClient(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.clients = data.clients.filter(c => c.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM clients WHERE id = ?', [id]);
    return true;
  }

  // Projects
  async getProjects() {
    if (this.isFallback) return this.getMockData().projects;
    const [rows] = await this.pool.execute('SELECT * FROM projects');
    return rows;
  }

  async insertProject(p) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.projects.length + 1;
      p.id = `P${String(count).padStart(3, '0')}`;
      data.projects.push(p);
      this.saveMockData(data);
      return p;
    }
    await this.pool.execute(
      'INSERT INTO projects (id, code, name, clientId, pmId, startDate, endDate, estimatedHours, budget, billable, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours, p.budget, p.billable ? 1 : 0, p.status]
    );
    return p;
  }

  async updateProject(id, p) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.projects.findIndex(x => x.id === id);
      if (index !== -1) {
        data.projects[index] = { ...data.projects[index], ...p };
        this.saveMockData(data);
        return data.projects[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE projects SET code = ?, name = ?, clientId = ?, pmId = ?, startDate = ?, endDate = ?, estimatedHours = ?, budget = ?, billable = ?, status = ? WHERE id = ?',
      [p.code, p.name, p.clientId, p.pmId, p.startDate, p.endDate, p.estimatedHours, p.budget, p.billable ? 1 : 0, p.status, id]
    );
    return { id, ...p };
  }

  async deleteProject(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.projects = data.projects.filter(p => p.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    return true;
  }

  // Modules
  async getModules() {
    if (this.isFallback) return this.getMockData().modules;
    const [rows] = await this.pool.execute('SELECT * FROM modules');
    return rows;
  }

  async insertModule(m) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.modules.length + 1;
      m.id = `M${String(count).padStart(3, '0')}`;
      data.modules.push(m);
      this.saveMockData(data);
      return m;
    }
    await this.pool.execute(
      'INSERT INTO modules (id, projectId, name, description, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
      [m.id, m.projectId, m.name, m.description, m.priority, m.status]
    );
    return m;
  }

  async updateModule(id, m) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.modules.findIndex(x => x.id === id);
      if (index !== -1) {
        data.modules[index] = { ...data.modules[index], ...m };
        this.saveMockData(data);
        return data.modules[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE modules SET projectId = ?, name = ?, description = ?, priority = ?, status = ? WHERE id = ?',
      [m.projectId, m.name, m.description, m.priority, m.status, id]
    );
    return { id, ...m };
  }

  async deleteModule(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.modules = data.modules.filter(m => m.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM modules WHERE id = ?', [id]);
    return true;
  }

  // TaskTypes
  async getTaskTypes() {
    if (this.isFallback) return this.getMockData().taskTypes;
    const [rows] = await this.pool.execute('SELECT * FROM task_types');
    return rows;
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

  // Holidays
  async getHolidays() {
    if (this.isFallback) return this.getMockData().holidays;
    const [rows] = await this.pool.execute('SELECT * FROM holidays');
    return rows;
  }

  async insertHoliday(h) {
    if (this.isFallback) {
      const data = this.getMockData();
      h.id = data.holidays.length + 1;
      data.holidays.push(h);
      this.saveMockData(data);
      return h;
    }
    const [result] = await this.pool.execute(
      'INSERT INTO holidays (date, name, type) VALUES (?, ?, ?)',
      [h.date, h.name, h.type]
    );
    h.id = result.insertId;
    return h;
  }

  async deleteHoliday(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.holidays = data.holidays.filter(h => h.id != id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM holidays WHERE id = ?', [id]);
    return true;
  }

  // Allocations
  async getAllocations() {
    if (this.isFallback) return this.getMockData().allocations;
    const [rows] = await this.pool.execute('SELECT * FROM allocations');
    return rows;
  }

  async insertAllocation(a) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.allocations.length + 1;
      a.id = `A${String(count).padStart(3, '0')}`;
      data.allocations.push(a);
      this.saveMockData(data);
      return a;
    }
    await this.pool.execute(
      'INSERT INTO allocations (id, employeeId, projectId, role, allocation, startDate, endDate, plannedHours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.employeeId, a.projectId, a.role, a.allocation, a.startDate, a.endDate, a.plannedHours]
    );
    return a;
  }

  async updateAllocation(id, a) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.allocations.findIndex(x => x.id === id);
      if (index !== -1) {
        data.allocations[index] = { ...data.allocations[index], ...a };
        this.saveMockData(data);
        return data.allocations[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE allocations SET employeeId = ?, projectId = ?, role = ?, allocation = ?, startDate = ?, endDate = ?, plannedHours = ? WHERE id = ?',
      [a.employeeId, a.projectId, a.role, a.allocation, a.startDate, a.endDate, a.plannedHours, id]
    );
    return { id, ...a };
  }

  async deleteAllocation(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.allocations = data.allocations.filter(a => a.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM allocations WHERE id = ?', [id]);
    return true;
  }

  // Tasks
  async getTasks() {
    if (this.isFallback) return this.getMockData().tasks;
    const [rows] = await this.pool.execute('SELECT * FROM tasks');
    return rows;
  }

  async insertTask(t) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.tasks.length + 1;
      t.id = `T${String(count).padStart(3, '0')}`;
      t.loggedHours = 0;
      data.tasks.push(t);
      this.saveMockData(data);
      return t;
    }
    await this.pool.execute(
      'INSERT INTO tasks (id, name, description, projectId, moduleId, priority, estimatedHours, startDate, endDate, assignedTo, reviewerId, status, progress, loggedHours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00)',
      [t.id, t.name, t.description, t.projectId, t.moduleId, t.priority, t.estimatedHours, t.startDate, t.endDate, t.assignedTo, t.reviewerId, t.status, t.progress]
    );
    return t;
  }

  async updateTask(id, t) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.tasks.findIndex(x => x.id === id);
      if (index !== -1) {
        data.tasks[index] = { ...data.tasks[index], ...t };
        this.saveMockData(data);
        return data.tasks[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE tasks SET name = ?, description = ?, projectId = ?, moduleId = ?, priority = ?, estimatedHours = ?, startDate = ?, endDate = ?, assignedTo = ?, reviewerId = ?, status = ?, progress = ?, loggedHours = ? WHERE id = ?',
      [t.name, t.description, t.projectId, t.moduleId, t.priority, t.estimatedHours, t.startDate, t.endDate, t.assignedTo, t.reviewerId, t.status, t.progress, t.loggedHours, id]
    );
    return { id, ...t };
  }

  async deleteTask(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.tasks = data.tasks.filter(t => t.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
    return true;
  }

  // Timesheets
  async getTimesheets() {
    if (this.isFallback) return this.getMockData().timesheets;
    const [rows] = await this.pool.execute('SELECT * FROM timesheets');
    return rows;
  }

  async insertTimesheet(ts) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.timesheets.length + 1;
      ts.id = `TS${String(count).padStart(3, '0')}`;
      data.timesheets.push(ts);
      this.saveMockData(data);
      this.recalculateTaskHoursMock(ts.taskId);
      return ts;
    }
    await this.pool.execute(
      'INSERT INTO timesheets (id, date, employeeId, projectId, moduleId, taskId, hours, description, status, comments, submittedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ts.id, ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours, ts.description, ts.status, ts.comments || null, ts.submittedDate || null]
    );
    await this.recalculateTaskHoursSQL(ts.taskId);
    return ts;
  }

  async updateTimesheet(id, ts) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.timesheets.findIndex(x => x.id === id);
      if (index !== -1) {
        data.timesheets[index] = { ...data.timesheets[index], ...ts };
        this.saveMockData(data);
        this.recalculateTaskHoursMock(data.timesheets[index].taskId);
        return data.timesheets[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE timesheets SET date = ?, employeeId = ?, projectId = ?, moduleId = ?, taskId = ?, hours = ?, description = ?, status = ?, comments = ?, submittedDate = ? WHERE id = ?',
      [ts.date, ts.employeeId, ts.projectId, ts.moduleId, ts.taskId, ts.hours, ts.description, ts.status, ts.comments || null, ts.submittedDate || null, id]
    );
    
    // Fetch timesheet to get its task ID for recalculation
    const [rows] = await this.pool.execute('SELECT taskId FROM timesheets WHERE id = ?', [id]);
    if (rows && rows.length > 0) {
      await this.recalculateTaskHoursSQL(rows[0].taskId);
    }
    return { id, ...ts };
  }

  async deleteTimesheet(id) {
    let taskId = '';
    if (this.isFallback) {
      const data = this.getMockData();
      const sheet = data.timesheets.find(x => x.id === id);
      if (sheet) taskId = sheet.taskId;
      data.timesheets = data.timesheets.filter(ts => ts.id !== id);
      this.saveMockData(data);
      if (taskId) this.recalculateTaskHoursMock(taskId);
      return true;
    }
    const [rows] = await this.pool.execute('SELECT taskId FROM timesheets WHERE id = ?', [id]);
    if (rows && rows.length > 0) taskId = rows[0].taskId;
    await this.pool.execute('DELETE FROM timesheets WHERE id = ?', [id]);
    if (taskId) await this.recalculateTaskHoursSQL(taskId);
    return true;
  }

  // Recalculators for actual hours logged against task
  async recalculateTaskHoursSQL(taskId) {
    const [rows] = await this.pool.execute(
      'SELECT SUM(hours) as total FROM timesheets WHERE taskId = ? AND status = "Approved"',
      [taskId]
    );
    const sum = rows[0].total || 0;
    await this.pool.execute('UPDATE tasks SET loggedHours = ? WHERE id = ?', [sum, taskId]);
  }

  recalculateTaskHoursMock(taskId) {
    const data = this.getMockData();
    const sum = data.timesheets
      .filter(ts => ts.taskId === taskId && ts.status === 'Approved')
      .reduce((s, ts) => s + parseFloat(ts.hours), 0);
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      data.tasks[index].loggedHours = sum;
      this.saveMockData(data);
    }
  }

  // Leaves
  async getLeaves() {
    if (this.isFallback) return this.getMockData().leaves;
    const [rows] = await this.pool.execute('SELECT * FROM leaves');
    return rows;
  }

  async insertLeave(l) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.leaves.length + 1;
      l.id = `L${String(count).padStart(3, '0')}`;
      data.leaves.push(l);
      this.saveMockData(data);
      return l;
    }
    await this.pool.execute(
      'INSERT INTO leaves (id, employeeId, startDate, endDate, type, status, comments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [l.id, l.employeeId, l.startDate, l.endDate, l.type, l.status, l.comments || null]
    );
    return l;
  }

  async updateLeave(id, l) {
    if (this.isFallback) {
      const data = this.getMockData();
      const index = data.leaves.findIndex(x => x.id === id);
      if (index !== -1) {
        data.leaves[index] = { ...data.leaves[index], ...l };
        this.saveMockData(data);
        return data.leaves[index];
      }
      return null;
    }
    await this.pool.execute(
      'UPDATE leaves SET employeeId = ?, startDate = ?, endDate = ?, type = ?, status = ?, comments = ? WHERE id = ?',
      [l.employeeId, l.startDate, l.endDate, l.type, l.status, l.comments || null, id]
    );
    return { id, ...l };
  }

  async deleteLeave(id) {
    if (this.isFallback) {
      const data = this.getMockData();
      data.leaves = data.leaves.filter(l => l.id !== id);
      this.saveMockData(data);
      return true;
    }
    await this.pool.execute('DELETE FROM leaves WHERE id = ?', [id]);
    return true;
  }

  async reset() {
    if (this.isFallback) {
      this.saveMockData(DEFAULT_MOCK_DATA);
      return true;
    }
    // Re-seed MySQL database
    try {
      const sqlFile = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
      const statements = sqlFile
        .split(';')
        .map(st => st.trim())
        .filter(st => st.length > 0);

      // Run database initialization commands
      for (const statement of statements) {
        await this.pool.execute(statement);
      }
      return true;
    } catch (err) {
      console.error('Failed to reset MySQL:', err);
      throw err;
    }
  }
}

export const DB = new DBService();
