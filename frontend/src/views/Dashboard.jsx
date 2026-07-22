// src/views/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';
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
    clients: [],
    leaves: []
  });
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const headers = { 'x-user-id': user.id };
      const [projRes, allocRes, taskRes, tsRes, empRes, cliRes, leaveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`, { headers }),
        fetch(`${API_BASE_URL}/allocations`, { headers }),
        fetch(`${API_BASE_URL}/tasks`, { headers }),
        fetch(`${API_BASE_URL}/timesheets`, { headers }),
        fetch(`${API_BASE_URL}/employees`, { headers }),
        fetch(`${API_BASE_URL}/clients`, { headers }),
        fetch(`${API_BASE_URL}/leaves`, { headers })
      ]);

      const [projects, allocations, tasks, timesheets, employees, clients, leaves] = await Promise.all([
        projRes.ok ? projRes.json() : [],
        allocRes.ok ? allocRes.json() : [],
        taskRes.ok ? taskRes.json() : [],
        tsRes.ok ? tsRes.json() : [],
        empRes.ok ? empRes.json() : [],
        cliRes.ok ? cliRes.json() : [],
        leaveRes.ok ? leaveRes.json() : []
      ]);

      setData({
        projects: Array.isArray(projects) ? projects : [],
        allocations: Array.isArray(allocations) ? allocations : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        timesheets: Array.isArray(timesheets) ? timesheets : [],
        employees: Array.isArray(employees) ? employees : [],
        clients: Array.isArray(clients) ? clients : [],
        leaves: Array.isArray(leaves) ? leaves : []
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


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // Render view based on Role
  if (user.role === 'Admin') {
    return renderAdminDashboard(data, navigateTo);
  } else if (user.role === 'PM' || user.role === 'Team Lead') {
    return renderPMDashboard(data, user, today, navigateTo);
  } else if (user.role === 'Management') {
    return renderManagementDashboard(data, today, navigateTo);
  } else {
    return renderEmployeeDashboard(data, user, today, navigateTo);
  }
}

// ----------------- ADMIN DASHBOARD -----------------
function renderAdminDashboard(data, navigateTo) {
  // Company Overview KPIs
  const totalEmployees = data.employees.length;
  const activeEmployees = data.employees.filter(e => e.status === 'Active').length;
  const totalClients = data.clients.length;
  const totalProjects = data.projects.length;
  const activeProjects = data.projects.filter(p => p.status === 'Active').length;

  // Operations KPIs
  const totalTasks = data.tasks.length;
  const pendingTasks = data.tasks.filter(t => ['Open', 'Assigned', 'In Progress', 'Review'].includes(t.status)).length;
  const completedTasks = data.tasks.filter(t => ['Completed', 'Closed'].includes(t.status)).length;
  
  const pendingTimesheets = data.timesheets.filter(ts => ts.status === 'Draft' || ts.status === 'Submitted').length;
  
  const pendingLeaves = data.leaves.filter(l => l.status === 'Pending').length;

  // Resource Overview
  const totalEmployeesCount = data.employees.filter(e => e.role === 'Employee' || e.role === 'Team Lead').length;
  const availableHoursTotal = totalEmployeesCount * 40; // Weekly available hours
  
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

  // Chart Data
  const deptCounts = {};
  data.employees.forEach(e => {
    deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
  });
  const employeeChart = {
    labels: Object.keys(deptCounts),
    datasets: [{
      data: Object.values(deptCounts),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'],
      borderWidth: 1
    }]
  };

  const projectStatusCounts = {};
  data.projects.forEach(p => {
    projectStatusCounts[p.status] = (projectStatusCounts[p.status] || 0) + 1;
  });
  const projectChart = {
    labels: Object.keys(projectStatusCounts),
    datasets: [{
      data: Object.values(projectStatusCounts),
      backgroundColor: ['#10b981', '#64748b', '#f59e0b', '#f43f5e'],
      borderWidth: 1
    }]
  };

  const taskStatusCounts = {};
  data.tasks.forEach(t => {
    taskStatusCounts[t.status] = (taskStatusCounts[t.status] || 0) + 1;
  });
  const taskChart = {
    labels: Object.keys(taskStatusCounts),
    datasets: [{
      data: Object.values(taskStatusCounts),
      backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#64748b', '#ec4899'],
      borderWidth: 1
    }]
  };

  const leaveStatusCounts = {};
  data.leaves.forEach(l => {
    leaveStatusCounts[l.status] = (leaveStatusCounts[l.status] || 0) + 1;
  });
  const leaveChart = {
    labels: Object.keys(leaveStatusCounts),
    datasets: [{
      label: 'Leaves',
      data: Object.values(leaveStatusCounts),
      backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
      borderWidth: 1
    }]
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <h2>Administrator Desk</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>System Administration, Operations Overview, and Resource Monitoring.</p>
      </div>

      <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Company Overview</h3>
      <div className="kpi-grid" style={{ marginBottom: '32px' }}>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'employees')}>
          <div className="kpi-icon primary"><i data-lucide="users">👥</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Active Employees</span>
            <span className="kpi-value">{activeEmployees} / {totalEmployees}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'clients')}>
          <div className="kpi-icon info"><i data-lucide="briefcase">💼</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Clients</span>
            <span className="kpi-value">{totalClients}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('masters', 'projects')}>
          <div className="kpi-icon success"><i data-lucide="folder">📁</i></div>
          <div className="kpi-info">
            <span className="kpi-label">Active Projects</span>
            <span className="kpi-value">{activeProjects} / {totalProjects}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('resources', 'planner')}>
          <div className="kpi-icon primary">📊</div>
          <div className="kpi-info">
            <span className="kpi-label">Resource Utilization</span>
            <span className="kpi-value">{utilizationRate}%</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Operations</h3>
      <div className="kpi-grid" style={{ marginBottom: '32px' }}>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('tasks', 'summary')}>
          <div className="kpi-icon warning">📝</div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Tasks</span>
            <span className="kpi-value">{pendingTasks}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('tasks', 'summary')}>
          <div className="kpi-icon success">✅</div>
          <div className="kpi-info">
            <span className="kpi-label">Completed Tasks</span>
            <span className="kpi-value">{completedTasks}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('timesheets', 'summary')}>
          <div className="kpi-icon warning">🕒</div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Timesheets</span>
            <span className="kpi-value">{pendingTimesheets}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('leaves', 'summary')}>
          <div className="kpi-icon warning">✈️</div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Leaves</span>
            <span className="kpi-value">{pendingLeaves}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header-flex">
            <h3>Employee Distribution</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Doughnut
              data={employeeChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>Project Status</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Pie
              data={projectChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header-flex">
            <h3>Task Status</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Doughnut
              data={taskChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>Leave Status</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '220px' }}>
            <Bar
              data={leaveChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- PM & TEAM LEAD DASHBOARD -----------------
function renderPMDashboard(data, user, today, navigateTo) {
  const myProjects = data.projects;
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
                      <td>{p.budget.toLocaleString()}</td>
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
  const activeTasks = data.tasks.filter(t => t.status !== 'Completed' && t.status !== 'Closed');
  const myTimesheets = data.timesheets;
  
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
                    <td>{formatDate(t.endDate)}</td>
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
