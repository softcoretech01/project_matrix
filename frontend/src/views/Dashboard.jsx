import React, { useEffect, useState, useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Card, EmptyState, StatusBadge, PriorityBadge, SearchBox, STATUS_COLORS, fmtDate } from '../components/ui';

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', background: 'var(--surface-2, rgba(148,163,184,.07))', borderRadius: 10 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color || 'inherit' }}>{s.value}</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact pager shown under each overview list (arrows disable on a single page).
function Pager({ page, pageCount, total, start, per, onPage }) {
  if (!total) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '0.76rem' }}>
      <span className="text-secondary">{start + 1}–{Math.min(start + per, total)} of {total}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px' }} disabled={page <= 1} onClick={() => onPage((p) => Math.max(1, p - 1))}>
          <i className="ph ph-caret-left"></i>
        </button>
        <span className="text-secondary">{page}/{pageCount}</span>
        <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px' }} disabled={page >= pageCount} onClick={() => onPage((p) => Math.min(pageCount, p + 1))}>
          <i className="ph ph-caret-right"></i>
        </button>
      </div>
    </div>
  );
}

// Admin-only overview card: the employee stats PLUS a searchable list of employees.
function EmployeesOverviewCard({ c, navigate }) {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let alive = true;
    const h = setTimeout(async () => {
      try {
        const el = await api.get(`/employees?search=${encodeURIComponent(search)}`);
        if (alive) { setEmployees(Array.isArray(el) ? el : []); setPage(1); }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [search]);
  const PER = 5;
  const pageCount = Math.max(1, Math.ceil(employees.length / PER));
  const start = (page - 1) * PER;
  const pageItems = employees.slice(start, start + PER);

  const stats = [
    { label: 'Total', value: c.employees.total },
    { label: 'Active', value: c.employees.active, color: '#10b981' },
    { label: 'Working', value: c.employees.working, color: '#3b82f6' },
    { label: 'With Pending', value: c.employees.withPendingTasks, color: '#f59e0b' },
  ];

  return (
    <div className="card" style={{ borderTop: '3px solid #10b981' }}>
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="kpi-icon" style={{ background: '#10b98122', color: '#10b981' }}><i className="ph-fill ph-users"></i></span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Employee Overview</h3>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('employees')}>View</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', background: 'var(--surface-2, rgba(148,163,184,.07))', borderRadius: 10 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color || 'inherit' }}>{s.value}</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        margin: '16px 0 10px', paddingTop: 14, borderTop: '1px solid var(--border-color,#e2e8f0)', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.9rem' }}>All Employees ({employees.length})</strong>
        <SearchBox value={search} onChange={setSearch} placeholder="Search employees…" width="200px" />
      </div>

      {loading ? <Spinner /> : employees.length === 0 ? (
        <EmptyState icon="ph-users" title="No employees found" message={search ? 'Try a different search.' : 'No employees yet.'} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pageItems.map((e) => (
              <div key={e.id} className="clickable-row" onClick={() => navigate('employees')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.role} · {e.designation || '—'}</div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={employees.length} start={start} per={PER} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// Admin-only overview card: the task stats PLUS a searchable grid of all tasks.
function TasksOverviewCard({ c, navigate }) {
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let alive = true;
    const h = setTimeout(async () => {
      try {
        const tl = await api.get(`/tasks?search=${encodeURIComponent(search)}&status=All&priority=All&category=All`);
        if (alive) { setTasks(Array.isArray(tl) ? tl : []); setPage(1); }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [search]);
  const PER = 5;
  const pageCount = Math.max(1, Math.ceil(tasks.length / PER));
  const start = (page - 1) * PER;
  const pageItems = tasks.slice(start, start + PER);

  const stats = [
    { label: 'Pending', value: c.tasks.totalPending },
    { label: 'Overdue', value: c.tasks.overdue, color: '#ef4444' },
    { label: 'Due Today', value: c.tasks.dueToday, color: '#f59e0b' },
    { label: 'Unassigned', value: c.tasks.unassigned },
  ];

  return (
    <div className="card" style={{ borderTop: '3px solid #eab308' }}>
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="kpi-icon" style={{ background: '#eab30822', color: '#eab308' }}><i className="ph-fill ph-check-square"></i></span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Task Overview</h3>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('tasks')}>View</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', background: 'var(--surface-2, rgba(148,163,184,.07))', borderRadius: 10 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color || 'inherit' }}>{s.value}</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        margin: '16px 0 10px', paddingTop: 14, borderTop: '1px solid var(--border-color,#e2e8f0)', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.9rem' }}>All Tasks ({tasks.length})</strong>
        <SearchBox value={search} onChange={setSearch} placeholder="Search tasks…" width="220px" />
      </div>

      {loading ? <Spinner /> : tasks.length === 0 ? (
        <EmptyState icon="ph-check-square" title="No tasks found" message={search ? 'Try a different search.' : 'No tasks yet.'} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pageItems.map((t) => (
              <div key={t.id} className="clickable-row" onClick={() => navigate('tasks', { taskId: t.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.assignedToName || 'Unassigned'} · {t.endDate ? fmtDate(t.endDate) : 'no due date'}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={tasks.length} start={start} per={PER} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// Admin-only overview card: the project stats PLUS a searchable grid of all
// projects, together inside one card.
function ProjectsOverviewCard({ c, navigate }) {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let alive = true;
    const h = setTimeout(async () => {
      try {
        const pl = await api.get(`/projects?search=${encodeURIComponent(search)}&status=All`);
        if (alive) { setProjects(Array.isArray(pl) ? pl : []); setPage(1); }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [search]);
  const PER = 5;
  const pageCount = Math.max(1, Math.ceil(projects.length / PER));
  const start = (page - 1) * PER;
  const pageItems = projects.slice(start, start + PER);

  const stats = [
    { label: 'Total', value: c.projects.total },
    { label: 'In Progress', value: c.projects.inProgress, color: '#3b82f6' },
    { label: 'Completed', value: c.projects.completed, color: '#10b981' },
    { label: 'Pending', value: c.projects.pending, color: '#f59e0b' },
  ];

  return (
    <div className="card" style={{ borderTop: '3px solid #059669' }}>
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="kpi-icon" style={{ background: '#05966922', color: '#059669' }}><i className="ph-fill ph-folder-open"></i></span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Projects Overview</h3>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('projects')}>View</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', background: 'var(--surface-2, rgba(148,163,184,.07))', borderRadius: 10 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color || 'inherit' }}>{s.value}</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        margin: '16px 0 10px', paddingTop: 14, borderTop: '1px solid var(--border-color,#e2e8f0)', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.9rem' }}>All Projects ({projects.length})</strong>
        <SearchBox value={search} onChange={setSearch} placeholder="Search projects…" width="220px" />
      </div>

      {loading ? <Spinner /> : projects.length === 0 ? (
        <EmptyState icon="ph-folder-open" title="No projects found" message={search ? 'Try a different search.' : 'No projects yet.'} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pageItems.map((p) => (
              <div key={p.id} className="clickable-row" onClick={() => navigate('projects', { projectId: p.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.code} · {p.progress || 0}% · {p.completedTasksCount}/{p.tasksCount} tasks</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={projects.length} start={start} per={PER} onPage={setPage} />
        </>
      )}
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

  // Recent-activity filtering/pagination state (declared before any early return).
  const [activityMonth, setActivityMonth] = useState('All');
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 10;

  const availableMonths = useMemo(() => {
    const list = data?.recentActivity || [];
    const seen = new Set();
    const months = [];
    for (const n of list) {
      if (!n.createdAt) continue;
      const mKey = n.createdAt.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(mKey) && !seen.has(mKey)) {
        seen.add(mKey);
        const [y, m] = mKey.split('-');
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        months.push({ key: mKey, label: dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
      }
    }
    months.sort((a, b) => b.key.localeCompare(a.key));
    return months;
  }, [data?.recentActivity]);

  const filteredActivities = useMemo(() => {
    const list = data?.recentActivity || [];
    if (activityMonth === 'All') return list;
    return list.filter((n) => n.createdAt && n.createdAt.startsWith(activityMonth));
  }, [data?.recentActivity, activityMonth]);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (err) return <EmptyState icon="ph-warning" title="Could not load dashboard" message={err} />;

  const isWorker = user.role === 'Worker';
  const isAdmin = user.role === 'Admin';
  const c = data.cards;

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivities.length / ACTIVITY_PER_PAGE));
  const activityStart = (Math.min(activityPage, totalActivityPages) - 1) * ACTIVITY_PER_PAGE;
  const pagedActivities = filteredActivities.slice(activityStart, activityStart + ACTIVITY_PER_PAGE);

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
      borderRadius: 8,
      maxBarThickness: 54,
      categoryPercentage: 0.7,
      barPercentage: 0.9,
    }],
  };
  const catBreak = data.charts.categoryBreakdown || [];
  const catChart = {
    labels: catBreak.map((c) => c.name),
    datasets: [{
      label: 'Tasks',
      data: catBreak.map((c) => c.count),
      backgroundColor: catBreak.map((c) => c.color || '#3b82f6'),
      borderRadius: 8,
      maxBarThickness: 54,
      categoryPercentage: 0.7,
      barPercentage: 0.9,
    }],
  };
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#64748b', boxWidth: 12, padding: 10 } },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { display: false } },
      y: {
        ticks: { color: '#64748b', stepSize: 1, precision: 0 },
        grid: { color: 'rgba(148,163,184,.12)' },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Primary cards */}
      {/* Projects / Tasks / Employees in one row. For Admin the Projects card
          also holds the searchable project grid inside it. */}
      <div style={{ display: 'grid', gridTemplateColumns: isWorker ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 14, alignItems: 'start' }}>
        {isAdmin ? (
          <ProjectsOverviewCard c={c} navigate={navigate} />
        ) : (
          <StatCard icon="ph-folder-open" color="#059669" title={isWorker ? 'My Projects' : 'Projects Overview'}
            cta="View" onClick={() => navigate('projects')}
            stats={[
              { label: 'Total', value: c.projects.total },
              { label: 'In Progress', value: c.projects.inProgress, color: '#3b82f6' },
              { label: 'Completed', value: c.projects.completed, color: '#10b981' },
              { label: 'Pending', value: c.projects.pending, color: '#f59e0b' },
            ]} />
        )}
        {isAdmin ? (
          <TasksOverviewCard c={c} navigate={navigate} />
        ) : (
          <StatCard icon="ph-check-square" color="#eab308" title={isWorker ? 'My Tasks' : 'Pending Tasks'}
            cta="View" onClick={() => navigate('tasks')}
            stats={[
              { label: 'Pending', value: c.tasks.totalPending },
              { label: 'Overdue', value: c.tasks.overdue, color: '#ef4444' },
              { label: 'Due Today', value: c.tasks.dueToday, color: '#f59e0b' },
              { label: isWorker ? 'Completed' : 'Unassigned', value: isWorker ? c.tasks.completed : c.tasks.unassigned },
            ]} />
        )}
        {isAdmin ? (
          <StatCard icon="ph-timer" color="#ef4444" title="Idle-Time Alerts" cta="View"
            onClick={() => navigate('idletime')}
            stats={[
              { label: 'Alerts (>15 min)', value: (data.idle?.alerts ?? data.idleAlerts ?? 0), color: '#ef4444' },
              { label: 'Idle Sessions', value: data.idle?.sessions ?? 0 },
              { label: 'Idle Minutes', value: data.idle?.minutes ?? 0, color: '#f59e0b' },
              { label: 'Logged Hours', value: data.timesheets?.loggedHours ?? 0, color: '#3b82f6' },
            ]} />
        ) : (!isWorker && c.employees && (
          <StatCard icon="ph-users" color="#10b981" title="Employee Overview"
            cta="View" onClick={() => navigate('employees')}
            stats={[
              { label: 'Total', value: c.employees.total },
              { label: 'Active', value: c.employees.active, color: '#10b981' },
              { label: 'Working', value: c.employees.working, color: '#3b82f6' },
              { label: 'With Pending', value: c.employees.withPendingTasks, color: '#f59e0b' },
            ]} />
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Task Status Distribution">
          <div style={{ height: 200 }}>
            {statusLabels.length ? <Doughnut data={doughnut} options={{ ...chartOpts, scales: {} }} />
              : <EmptyState icon="ph-chart-pie" title="No tasks yet" />}
          </div>
        </Card>
        <Card title="Projects by Status">
          <div style={{ height: 200 }}>
            {projLabels.length ? <Bar data={bar} options={chartOpts} />
              : <EmptyState icon="ph-chart-bar" title="No projects yet" />}
          </div>
        </Card>
      </div>

      {/* Tasks by work category */}
      <Card title="Tasks by Work Category">
        <div style={{ height: 180 }}>
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
        <Card
          title={<span><i className="ph ph-activity" style={{ marginRight: 8, color: '#059669' }}></i>Recent Activity</span>}
          actions={
            availableMonths.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="text-secondary" style={{ fontSize: '0.78rem' }}>Month:</span>
                <select
                  className="form-control"
                  style={{ width: 155, padding: '4px 8px', fontSize: '0.78rem', height: 32 }}
                  value={activityMonth}
                  onChange={(e) => {
                    setActivityMonth(e.target.value);
                    setActivityPage(1);
                  }}
                >
                  <option value="All">All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            )
          }
        >
          {filteredActivities.length === 0 ? (
            <EmptyState icon="ph-activity" title="No recent activity" message={activityMonth !== 'All' ? 'No activity found for this month.' : undefined} />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pagedActivities.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 2px',
                      borderBottom: '1px solid var(--border-color, #e2e8f0)',
                      fontSize: '0.84rem',
                      gap: 12,
                    }}
                  >
                    <span style={{ lineHeight: 1.45, color: '#0f172a' }}>
                      <strong style={{ fontWeight: 600 }}>{n.title}</strong>
                      <span className="text-secondary"> — {n.message}</span>
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {n.createdAt ? n.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Page-wise navigation: 10 per page */}
              <Pager
                page={activityPage}
                pageCount={totalActivityPages}
                total={filteredActivities.length}
                start={activityStart}
                per={ACTIVITY_PER_PAGE}
                onPage={setActivityPage}
              />
            </>
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
