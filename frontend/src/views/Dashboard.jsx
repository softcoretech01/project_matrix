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

    // Instant real-time reflection across tabs
    window.addEventListener('pm_data_updated', fetchData);
    return () => window.removeEventListener('pm_data_updated', fetchData);
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const { tasks, projects } = data;
  const isManagerOrAdmin = ['Admin', 'PM', 'Management'].includes(user.role);

  // Today ISO string for overdue calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. MANAGER / ADMIN CALCULATIONS (PDF Section 7.3)
  const openTasks = tasks.filter(t => ['Open', 'In Progress', 'Assigned'].includes(t.status));
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && !['Completed', 'Closed'].includes(t.status));
  const completedThisWeek = tasks.filter(t => ['Closed', 'Completed'].includes(t.status) && t.status !== 'Review');
  const awaitingReview = tasks.filter(t => t.status === 'Review');

  // Chart 1: Tasks by status
  const statusCounts = {};
  ['Open', 'In Progress', 'Review', 'Completed', 'Closed'].forEach(st => {
    statusCounts[st] = tasks.filter(t => t.status === st).length;
  });

  const taskStatusChart = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'],
      borderWidth: 1
    }]
  };

  // Chart 2: Tasks per member (Workload)
  const memberCounts = {};
  tasks.forEach(t => {
    const assignee = t.assignee || 'Unassigned';
    memberCounts[assignee] = (memberCounts[assignee] || 0) + 1;
  });

  const workloadChart = {
    labels: Object.keys(memberCounts).length > 0 ? Object.keys(memberCounts) : ['No Members'],
    datasets: [{
      label: 'Tasks Assigned',
      data: Object.values(memberCounts).length > 0 ? Object.values(memberCounts) : [0],
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: 'hsl(244, 97%, 66%)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px', padding: '24px 32px', background: 'linear-gradient(135deg, var(--color-primary-glow), transparent)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.7rem', marginBottom: '6px', fontWeight: 700 }}>
          Welcome back, {user.name.split(' ')[0]}! ({user.role})
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {isManagerOrAdmin 
            ? 'Manager Workspace: Track team workload, overdue items, and project progress.' 
            : 'Personal Workspace: View tasks assigned directly to you.'}
        </p>
      </div>

      {/* 4 KPI CARDS (PDF Section 7.3 Manager / Admin view) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" onClick={() => navigateTo('tasks', 'list')} style={{ cursor: 'pointer', padding: '18px', borderLeft: '4px solid var(--color-primary)' }}>
          <span className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>Open Tasks</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem' }}>{openTasks.length}</h2>
        </div>

        <div className="card" onClick={() => navigateTo('tasks', 'list')} style={{ cursor: 'pointer', padding: '18px', borderLeft: '4px solid var(--color-danger)' }}>
          <span className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>Overdue</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'var(--color-danger)' }}>{overdueTasks.length}</h2>
        </div>

        <div className="card" onClick={() => navigateTo('tasks', 'list')} style={{ cursor: 'pointer', padding: '18px', borderLeft: '4px solid var(--color-success)' }}>
          <span className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>Completed</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'var(--color-success)' }}>{completedThisWeek.length}</h2>
        </div>

        <div className="card" onClick={() => navigateTo('tasks', 'review')} style={{ cursor: 'pointer', padding: '18px', borderLeft: '4px solid var(--color-warning)' }}>
          <span className="text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>Awaiting Review</span>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'var(--color-warning)' }}>{awaitingReview.length}</h2>
        </div>
      </div>

      {/* CHARTS GRID (PDF: Tasks by status chart & Workload chart) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '15px' }}>Tasks by Status</h4>
          <div style={{ position: 'relative', height: '220px' }}>
            {tasks.length > 0 ? (
              <Doughnut
                data={taskStatusChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right', labels: { color: 'var(--text-secondary)' } } }
                }}
              />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No task data recorded.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '15px' }}>Team Workload (Tasks per Member)</h4>
          <div style={{ position: 'relative', height: '220px' }}>
            {tasks.length > 0 ? (
              <Bar
                data={workloadChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: 'var(--text-secondary)' } },
                    x: { ticks: { color: 'var(--text-secondary)' } }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No assigned members.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROJECTS OVERVIEW TABLE WITH PROGRESS BARS (PDF Section 7.3) */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0 }}>Projects Overview & Progress</h4>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('projects', 'list')}>View All Projects</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '10px' }}>Project Name</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Tasks</th>
                <th style={{ padding: '10px', minWidth: '180px' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center' }} className="text-muted">
                    No projects found. Create a project to track team progress.
                  </td>
                </tr>
              ) : (
                projects.map(p => {
                  const pTasks = tasks.filter(t => t.project === p.name || t.project_id === p.id);
                  const pTotal = pTasks.length;
                  const pDone = pTasks.filter(t => ['Completed', 'Closed'].includes(t.status)).length;
                  const percentage = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className="badge badge-primary">{p.status || 'Active'}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }} className="text-muted">
                        {pDone} / {pTotal} done
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: percentage === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: '12px', minWidth: '35px', fontWeight: 'bold' }}>{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
