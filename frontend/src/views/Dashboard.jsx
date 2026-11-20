import React, { useEffect, useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Card, EmptyState, StatusBadge, PriorityBadge, STATUS_COLORS, fmtDate } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function StatCard({ icon, color, title, stats, onClick, cta }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="kpi-icon" style={{ background: `${color}22`, color }}>
            <i className={`ph-fill ${icon}`}></i>
          </span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
        </div>
        {cta && <button className="btn btn-sm btn-secondary" onClick={onClick}>{cta}</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '10px 12px', background: 'var(--surface-2, rgba(148,163,184,.07))', borderRadius: 10 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color || 'inherit' }}>{s.value}</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskList({ title, icon, tasks, emptyMsg, navigate }) {
  return (
    <Card title={<span><i className={`ph ${icon}`} style={{ marginRight: 8 }}></i>{title}</span>}>
      {(!tasks || tasks.length === 0) ? (
        <EmptyState icon={icon} title="Nothing here" message={emptyMsg} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t) => (
            <div key={t.id} onClick={() => navigate && navigate('tasks', { taskId: t.id })}
              className="clickable-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                  {t.projectName || '—'} · {t.assignedToName || 'Unassigned'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{fmtDate(t.endDate)}</span>
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Dashboard({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setData(await api.get('/dashboard')); }
      catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (err) return <EmptyState icon="ph-warning" title="Could not load dashboard" message={err} />;

  const isWorker = user.role === 'Worker';
  const c = data.cards;

  const statusLabels = Object.keys(data.charts.taskStatus);
  const doughnut = {
    labels: statusLabels,
    datasets: [{
      data: statusLabels.map((k) => data.charts.taskStatus[k]),
      backgroundColor: statusLabels.map((k) => STATUS_COLORS[k] || '#64748b'),
      borderWidth: 0,
    }],
  };
  const projLabels = Object.keys(data.charts.projectStatus);
  const bar = {
    labels: projLabels,
    datasets: [{
      label: 'Projects',
      data: projLabels.map((k) => data.charts.projectStatus[k]),
      backgroundColor: '#10b981',
      borderRadius: 6,
    }],
  };
  const catBreak = data.charts.categoryBreakdown || [];
  const catChart = {
    labels: catBreak.map((c) => c.name),
    datasets: [{ label: 'Tasks', data: catBreak.map((c) => c.count),
      backgroundColor: catBreak.map((c) => c.color), borderRadius: 6 }],
  };
  const chartOpts = { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: { x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.1)' }, beginAtZero: true } } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Primary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isWorker ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 14 }}>
        <StatCard icon="ph-folder-open" color="#059669" title={isWorker ? 'My Projects' : 'Projects Overview'}
          cta="View" onClick={() => navigate('projects')}
          stats={[
            { label: 'Total', value: c.projects.total },
            { label: 'In Progress', value: c.projects.inProgress, color: '#3b82f6' },
            { label: 'Completed', value: c.projects.completed, color: '#10b981' },
            { label: 'Pending', value: c.projects.pending, color: '#f59e0b' },
          ]} />
        <StatCard icon="ph-check-square" color="#eab308" title={isWorker ? 'My Tasks' : 'Pending Tasks'}
          cta="View" onClick={() => navigate('tasks')}
          stats={[
            { label: 'Pending', value: c.tasks.totalPending },
            { label: 'Overdue', value: c.tasks.overdue, color: '#ef4444' },
            { label: 'Due Today', value: c.tasks.dueToday, color: '#f59e0b' },
            { label: isWorker ? 'Completed' : 'Unassigned', value: isWorker ? c.tasks.completed : c.tasks.unassigned },
          ]} />
        {!isWorker && c.employees && (
          <StatCard icon="ph-users" color="#10b981" title="Employee Overview"
            cta="View" onClick={() => navigate('employees')}
            stats={[
              { label: 'Total', value: c.employees.total },
              { label: 'Active', value: c.employees.active, color: '#10b981' },
              { label: 'Working', value: c.employees.working, color: '#3b82f6' },
              { label: 'With Pending', value: c.employees.withPendingTasks, color: '#f59e0b' },
            ]} />
        )}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Task Status Distribution">
          <div style={{ height: 260 }}>
            {statusLabels.length ? <Doughnut data={doughnut} options={{ ...chartOpts, scales: {} }} />
              : <EmptyState icon="ph-chart-pie" title="No tasks yet" />}
          </div>
        </Card>
        <Card title="Projects by Status">
          <div style={{ height: 260 }}>
            {projLabels.length ? <Bar data={bar} options={chartOpts} />
              : <EmptyState icon="ph-chart-bar" title="No projects yet" />}
          </div>
        </Card>
      </div>

      {/* Tasks by work category */}
      <Card title="Tasks by Work Category">
        <div style={{ height: 240 }}>
          {catBreak.length ? <Bar data={catChart} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
            : <EmptyState icon="ph-squares-four" title="No tasks yet" message="Tasks will group by their work category here." />}
        </div>
      </Card>

      {/* Operational sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <TaskList title="Today's Scheduled Tasks" icon="ph-calendar-check" tasks={data.todayTasks}
          emptyMsg="No tasks scheduled for today." navigate={navigate} />
        <TaskList title="Upcoming Deadlines" icon="ph-hourglass" tasks={data.upcomingDeadlines}
          emptyMsg="No upcoming deadlines." navigate={navigate} />
        <TaskList title="Overdue Tasks" icon="ph-warning-circle" tasks={data.overdueTasks}
          emptyMsg="Nothing overdue — great!" navigate={navigate} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: !isWorker ? '2fr 1fr' : '1fr', gap: 16 }}>
        <Card title={<span><i className="ph ph-activity" style={{ marginRight: 8 }}></i>Recent Activity</span>}>
          {(!data.recentActivity || data.recentActivity.length === 0)
            ? <EmptyState icon="ph-activity" title="No recent activity" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recentActivity.map((n) => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border,#334155)' }}>
                    <span><strong>{n.title}</strong> — <span className="text-secondary">{n.message}</span></span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{n.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{isWorker ? 'My Logged Hours' : 'Total Logged Hours'}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{data.timesheets.loggedHours}<span style={{ fontSize: '1rem' }}> hrs</span></div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{data.timesheets.count} timesheet(s)</div>
          </div>
          {!isWorker && (
            <div className="card" style={{ borderLeft: '3px solid #ef4444' }}>
              <div className="text-secondary" style={{ fontSize: '0.85rem' }}>Idle-Time Alerts (&gt;15 min)</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: data.idleAlerts ? '#ef4444' : 'inherit' }}>{data.idleAlerts}</div>
              <a className="text-secondary" style={{ fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => navigate('idletime')}>View monitoring →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
