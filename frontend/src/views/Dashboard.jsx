import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard({ navigateTo }) {
  const { user } = useAuth();
  const [data, setData] = useState({ tasks: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'x-user-id': user.id };
        const [taskRes, projRes] = await Promise.all([
          fetch(`${API_BASE_URL}/tasks`, { headers }).catch(() => ({ ok: false })),
          fetch(`${API_BASE_URL}/projects`, { headers }).catch(() => ({ ok: false }))
        ]);

        setData({
          tasks: taskRes.ok ? await taskRes.json() : [],
          projects: projRes.ok ? await projRes.json() : []
        });
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const { tasks, projects } = data;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  
  // Tasks specifically for this user if they aren't admin
  const userTasks = user.role === 'Admin' ? tasks : tasks.filter(t => t.assignedTo === user.id);
  const pendingTasks = userTasks.filter(t => ['Open', 'Assigned', 'In Progress'].includes(t.status)).length;
  const completedTasks = userTasks.filter(t => ['Completed', 'Closed'].includes(t.status)).length;

  const taskStatusCounts = {};
  userTasks.forEach(t => {
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

  return (
    <div>
      <div style={{ marginBottom: '24px', padding: '32px', background: 'linear-gradient(135deg, var(--color-primary-glow), transparent)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 700 }}>Welcome back, {user.name.split(' ')[0]}!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>Here is what's happening with your projects and tasks today.</p>
        </div>
        <i className="ph-fill ph-rocket" style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', fontSize: '8rem', color: 'var(--border-glow)', opacity: 0.5 }}></i>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '32px' }}>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('projects', 'list')}>
          <div className="kpi-icon primary" style={{ fontSize: '1.5rem' }}><i className="ph-fill ph-folder-open"></i></div>
          <div className="kpi-info">
            <span className="kpi-label">{user.role === 'Admin' ? 'Total Projects' : 'Active Projects'}</span>
            <span className="kpi-value">{user.role === 'Admin' ? projects.length : activeProjects}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('tasks', 'my')}>
          <div className="kpi-icon warning" style={{ fontSize: '1.5rem' }}><i className="ph-fill ph-notebook"></i></div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Tasks</span>
            <span className="kpi-value">{pendingTasks}</span>
          </div>
        </div>
        <div className="kpi-card clickable-row" onClick={() => navigateTo('tasks', 'list')}>
          <div className="kpi-icon success" style={{ fontSize: '1.5rem' }}><i className="ph-fill ph-check-circle"></i></div>
          <div className="kpi-info">
            <span className="kpi-label">Completed Tasks</span>
            <span className="kpi-value">{completedTasks}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header-flex">
            <h3>Task Overview</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '250px' }}>
            {userTasks.length > 0 ? (
              <Doughnut
                data={taskChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
                }}
              />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No task data available.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>Recent Tasks</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigateTo('tasks', 'create')}>Add Task</button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.slice(0, 5).map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                  </tr>
                ))}
                {userTasks.length === 0 && (
                  <tr><td colSpan="2" className="text-center text-muted">No tasks available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
