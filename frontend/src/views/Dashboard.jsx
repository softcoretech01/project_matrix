// src/views/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard({ navigateTo }) {
  const { user } = useAuth();
  const [data, setData] = useState({
    projects: [],
    allocations: [],
    tasks: [],
    timesheets: [],
    employees: [],
    clients: []
  });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const headers = { 'x-user-id': user.id };
      const [projRes, allocRes, taskRes, tsRes, empRes, cliRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`, { headers }),
        fetch(`${API_BASE_URL}/allocations`, { headers }),
        fetch(`${API_BASE_URL}/tasks`, { headers }),
        fetch(`${API_BASE_URL}/timesheets`, { headers }),
        fetch(`${API_BASE_URL}/employees`, { headers }),
        fetch(`${API_BASE_URL}/clients`, { headers })
      ]);

      const [projects, allocations, tasks, timesheets, employees, clients] = await Promise.all([
        projRes.ok ? projRes.json() : [],
        allocRes.ok ? allocRes.json() : [],
        taskRes.ok ? taskRes.json() : [],
        tsRes.ok ? tsRes.json() : [],
        empRes.ok ? empRes.json() : [],
        cliRes.ok ? cliRes.json() : []
      ]);

      setData({
        projects: Array.isArray(projects) ? projects : [],
        allocations: Array.isArray(allocations) ? allocations : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        timesheets: Array.isArray(timesheets) ? timesheets : [],
        employees: Array.isArray(employees) ? employees : [],
        clients: Array.isArray(clients) ? clients : []
      });
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetDB = async () => {
    if (!window.confirm('Reset database to seed defaults? This deletes all updates.')) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reset-db`, { method: 'POST' });
      if (res.ok) {
        alert('Database has been reset successfully!');
        fetchData();
      } else {
        alert('Failed to reset database.');
      }
    } catch (e) {
      alert('Error resetting database: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // Render view based on Role
  if (user.role === 'Admin') {
    return renderAdminDashboard(data, handleResetDB, navigateTo, resetting);
  } else if (user.role === 'PM' || user.role === 'Team Lead') {
    return renderPMDashboard(data, user, today, navigateTo);
  } else if (user.role === 'Management') {
    return renderManagementDashboard(data, today, navigateTo);
  } else {
    return renderEmployeeDashboard(data, user, today, navigateTo);
  }
}

// ----------------- ADMIN DASHBOARD -----------------
function renderAdminDashboard(data, handleResetDB, navigateTo, resetting) {
  return (
    <div>
      <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <h2>Administrator Desk</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Configure master sheets (Employees, Clients, Projects, Modules, and Holidays) or reset default seed values.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'employees')}>
          <div className="kpi-icon primary"><i data-lucide="users">👥</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Registered Staff</span>
            <span className="kpi-value">{data.employees.length}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'clients')}>
          <div className="kpi-icon success"><i data-lucide="briefcase">💼</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Client Companies</span>
            <span className="kpi-value">{data.clients.length}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'projects')}>
          <div className="kpi-icon info"><i data-lucide="folder">📁</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Projects</span>
            <span className="kpi-value">{data.projects.length}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon danger"><i data-lucide="database">💾</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Database Management</span>
            <button className="btn btn-danger btn-sm mt-4" onClick={handleResetDB} disabled={resetting} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              {resetting ? 'Resetting...' : 'Reset Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- PM & TEAM LEAD DASHBOARD -----------------
function renderPMDashboard(data, user, today, navigateTo) {
  const myProjects = user.role === 'Admin' ? data.projects : data.projects.filter(p => p.pmId === user.id);
  const myProjectIds = myProjects.map(p => p.id);
  
  const myAllocations = data.allocations.filter(a => myProjectIds.includes(a.projectId));
  const uniqueStaff = [...new Set(myAllocations.map(a => a.employeeId))];

  const myTasks = data.tasks.filter(t => myProjectIds.includes(t.projectId));
  const delayedTasks = myTasks.filter(t => t.endDate < today && t.status !== 'Completed' && t.status !== 'Closed');

  const activeProjectsCount = myProjects.filter(p => p.status === 'Active').length;
  const avgProgress = myTasks.length === 0 ? 0 : Math.round(myTasks.reduce((sum, t) => sum + t.progress, 0) / myTasks.length);

  const statusCounts = { 'Completed': 0, 'In Progress': 0, 'Pending': 0, 'On Hold': 0 };
  myTasks.forEach(t => {
    let s = t.status;
    if (s === 'Open' || s === 'Assigned') s = 'Pending';
    else if (s === 'Review' || s === 'Closed') s = 'On Hold';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });

  const chartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: ['#34d399', '#38bdf8', '#fbbf24', '#64748b'],
      borderWidth: 1
    }]
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon primary">📁</div>
          <div className="kpi-info">
            <span className="kpi-label">Active Projects</span>
            <span className="kpi-value">{activeProjectsCount}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon success">👥</div>
          <div className="kpi-info">
            <span className="kpi-label">Allocated Staff</span>
            <span className="kpi-value">{uniqueStaff.length}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon info">📈</div>
          <div className="kpi-info">
            <span className="kpi-label">Task Progress %</span>
            <span className="kpi-value">{avgProgress}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon danger">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Delayed Tasks</span>
            <span className="kpi-value">{delayedTasks.length}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <div className="card-header-flex">
            <h3>Projects Overview</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('resources', 'planner')}>Resource Planner</button>
          </div>
          <div className="table-responsive" style={{ maxHeight: '250px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Project Name</th>
                  <th>Est. Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myProjects.length === 0 ? (
                  <tr><td colSpan="4" className="text-center text-muted">No projects found.</td></tr>
                ) : myProjects.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.code}</strong></td>
                    <td>{p.name}</td>
                    <td>{p.estimatedHours} hrs</td>
                    <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>Tasks By Status</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigateTo('tasks', 'create')}>Create Task</button>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- MANAGEMENT DASHBOARD -----------------
function renderManagementDashboard(data, today, navigateTo) {
  let billableHours = 0;
  let nonBillableHours = 0;

  data.timesheets.forEach(ts => {
    const proj = data.projects.find(p => p.id === ts.projectId);
    if (proj) {
      if (proj.billable) billableHours += parseFloat(ts.hours);
      else nonBillableHours += parseFloat(ts.hours);
    }
  });

  const totalEmployees = data.employees.filter(e => e.role === 'Employee' || e.role === 'Team Lead').length;
  const availableHoursTotal = totalEmployees * 40; // Weekly available hours

  const currentWeekDays = (() => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1;
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(curr.getTime());
      d.setDate(first + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  })();
  const weekHoursLogged = data.timesheets
    .filter(ts => currentWeekDays.includes(ts.date))
    .reduce((s, ts) => s + parseFloat(ts.hours), 0);

  const utilizationRate = availableHoursTotal === 0 ? 0 : Math.round((weekHoursLogged / availableHoursTotal) * 100);
  const activeClients = data.clients.filter(c => c.status === 'Active').length;

  const tsStatusCounts = { 'Submitted': 0, 'Approved': 0, 'Pending': 0, 'Rejected': 0 };
  data.timesheets.forEach(ts => {
    let s = ts.status;
    if (s === 'Draft') s = 'Pending';
    if (tsStatusCounts[s] !== undefined) tsStatusCounts[s]++;
  });

  const billingChartData = {
    labels: Object.keys(tsStatusCounts),
    datasets: [{
      data: Object.values(tsStatusCounts),
      backgroundColor: ['#38bdf8', '#10b981', '#fbbf24', '#f43f5e'],
      borderWidth: 1
    }]
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon primary">💲</div>
          <div className="kpi-info">
            <span className="kpi-label">Billable Hours</span>
            <span className="kpi-value">{billableHours} hrs</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon success">📊</div>
          <div className="kpi-info">
            <span className="kpi-label">Weekly Utilization</span>
            <span className="kpi-value">{utilizationRate}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon info">🏢</div>
          <div className="kpi-info">
            <span className="kpi-label">Active Clients</span>
            <span className="kpi-value">{activeClients}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon warning">🕒</div>
          <div className="kpi-info">
            <span className="kpi-label">Total Logged</span>
            <span className="kpi-value">{billableHours + nonBillableHours} hrs</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <div className="card-header-flex">
            <h3>Project Budgets vs Effort</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('reports', '')}>All Reports</button>
          </div>
          <div className="table-responsive" style={{ maxHeight: '250px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Budget</th>
                  <th>Hours spent</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map(p => {
                  const spent = data.timesheets.filter(ts => ts.projectId === p.id).reduce((s, ts) => s + parseFloat(ts.hours), 0);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>${p.budget.toLocaleString()}</td>
                      <td className={spent > p.estimatedHours ? 'text-danger' : ''}>{spent} hrs / {p.estimatedHours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>Billing Productivity</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Pie
              data={billingChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- EMPLOYEE DASHBOARD -----------------
function renderEmployeeDashboard(data, user, today, navigateTo) {
  const activeTasks = data.tasks.filter(t => t.assignedTo === user.id && t.status !== 'Completed' && t.status !== 'Closed');
  const myTimesheets = data.timesheets.filter(ts => ts.employeeId === user.id);
  
  const todayHours = myTimesheets.filter(ts => ts.date === today).reduce((s, ts) => s + parseFloat(ts.hours), 0);
  const currentWeekDays = (() => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1;
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(curr.getTime());
      d.setDate(first + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  })();
  const weeklyHours = myTimesheets.filter(ts => currentWeekDays.includes(ts.date)).reduce((s, ts) => s + parseFloat(ts.hours), 0);
  const pendingCount = myTimesheets.filter(ts => ts.status === 'Draft' || ts.status === 'Rejected').length;

  const loggedDaysHours = currentWeekDays.map(day => {
    return myTimesheets.filter(ts => ts.date === day).reduce((s, ts) => s + parseFloat(ts.hours), 0);
  });

  const chartThemeColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#6366f1';
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  myTimesheets.forEach(ts => {
    const d = new Date(ts.date);
    const m = d.getMonth();
    if (!isNaN(m)) {
      monthlyData[m] += parseFloat(ts.hours) || 0;
    }
  });
  
  const currentMonth = new Date().getMonth();
  const displayLabels = monthNames.slice(0, Math.max(6, currentMonth + 1));
  const displayData = monthlyData.slice(0, Math.max(6, currentMonth + 1));

  const weeklyChartData = {
    labels: displayLabels,
    datasets: [{
      label: 'Monthly Productivity',
      data: displayData,
      backgroundColor: chartThemeColor,
      borderRadius: 6
    }]
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon info">📋</div>
          <div className="kpi-info">
            <span className="kpi-label">Active Tasks</span>
            <span className="kpi-value">{activeTasks.length}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon success">🕒</div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Hours</span>
            <span className="kpi-value">{todayHours} / 8 hrs</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon primary">📅</div>
          <div className="kpi-info">
            <span className="kpi-label">Weekly Hours</span>
            <span className="kpi-value">{weeklyHours} / 40 hrs</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon warning">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Entries</span>
            <span className="kpi-value">{pendingCount} Drafts</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <div className="card-header-flex">
            <h3>Active Tasks Assigned</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('tasks', 'board')}>Go to Board</button>
          </div>
          <div className="table-responsive" style={{ maxHeight: '250px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Name</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr><td colSpan="4" className="text-center text-muted">No active tasks assigned to you.</td></tr>
                ) : activeTasks.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.id}</strong></td>
                    <td>{t.name}</td>
                    <td>{t.endDate}</td>
                    <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-flex">
            <h3>Weekly Hours Distribution</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigateTo('timesheets', 'weekly')}>Log Hours</button>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px', flex: 1 }}>
            <Bar
              data={weeklyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, max: 12, grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
