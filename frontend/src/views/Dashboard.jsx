import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  const PER = 10;
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
// Normalise any category status into one of 4 buckets for the task list badges.
const TASK_DONE = new Set(['Completed', 'Closed', 'Done', 'Won', 'Connected', 'Published', 'Report Submitted', 'Verified']);
const TASK_TODO = new Set(['To Do', 'To Call', 'Scheduled', 'Planned', 'Pending', 'New']);
function bucketStatus(t) {
  const s = t.status || 'To Do';
  if (t.endDate && !TASK_DONE.has(s)) {
    const due = new Date(t.endDate); const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!isNaN(due) && due < today) return 'Overdue';
  }
  if (TASK_DONE.has(s)) return 'Completed';
  if (TASK_TODO.has(s)) return 'To Do';
  return 'In Progress';
}

function TasksOverviewCard({ c, navigate }) {
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tl = await api.get(`/tasks?status=All&priority=All&category=All`);
        if (alive) setTasks(Array.isArray(tl) ? tl : []);
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  // Client-side filter so searching matches the DISPLAYED status bucket too
  // (status match is space-insensitive, so "inprogress" also matches "In Progress").
  const q = search.trim().toLowerCase();
  const nq = q.replace(/\s+/g, '');
  const filtered = !q ? tasks : tasks.filter((t) =>
    (t.name || '').toLowerCase().includes(q) || (t.assignedToName || '').toLowerCase().includes(q) ||
    (t.category || '').toLowerCase().includes(q) ||
    (t.status || '').toLowerCase().replace(/\s+/g, '').includes(nq) ||
    bucketStatus(t).toLowerCase().replace(/\s+/g, '').includes(nq));
  useEffect(() => { setPage(1); }, [q]);
  const PER = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER));
  const start = (page - 1) * PER;
  const pageItems = filtered.slice(start, start + PER);

  const stats = [
    { label: 'Pending', value: c.tasks.totalPending },
    { label: 'Overdue', value: c.tasks.overdue, color: '#ef4444' },
    { label: 'Due Today', value: c.tasks.dueToday, color: '#f59e0b' },
    { label: 'Unassigned', value: c.tasks.unassigned },
  ];

  return (
    <div className="card" style={{ borderTop: '3px solid #eab308' }}>
      <div className="card-header-flex" style={{ gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Tasks</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search tasks…" width="190px" />
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('tasks')}>View</button>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
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
                </div>
                <StatusBadge status={bucketStatus(t)} />
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={filtered.length} start={start} per={PER} onPage={setPage} />
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
    (async () => {
      try {
        const pl = await api.get(`/projects?status=All`);
        if (alive) setProjects(Array.isArray(pl) ? pl : []);
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  // Client-side filter so searching matches name + status (space-insensitive, e.g. "inprogress").
  const q = search.trim().toLowerCase();
  const nq = q.replace(/\s+/g, '');
  const filtered = !q ? projects : projects.filter((p) =>
    (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) ||
    (p.status || '').toLowerCase().replace(/\s+/g, '').includes(nq));
  useEffect(() => { setPage(1); }, [q]);
  const PER = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER));
  const start = (page - 1) * PER;
  const pageItems = filtered.slice(start, start + PER);

  const stats = [
    { label: 'Total', value: c.projects.total },
    { label: 'In Progress', value: c.projects.inProgress, color: '#3b82f6' },
    { label: 'Completed', value: c.projects.completed, color: '#10b981' },
    { label: 'Pending', value: c.projects.pending, color: '#f59e0b' },
  ];

  return (
    <div className="card" style={{ borderTop: '3px solid #059669' }}>
      <div className="card-header-flex" style={{ gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Projects</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search projects…" width="190px" />
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('projects')}>View</button>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
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
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={filtered.length} start={start} per={PER} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function TaskList({ title, icon, tasks, emptyMsg, navigate }) {
  const [page, setPage] = useState(1);
  const PER = 10;
  const list = Array.isArray(tasks) ? tasks : [];
  const pageCount = Math.max(1, Math.ceil(list.length / PER));
  const start = (page - 1) * PER;
  const paged = list.slice(start, start + PER);

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={`ph ${icon}`} style={{ marginRight: 2 }}></i>
          <span>{title}</span>
          <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 500 }}>({list.length})</span>
        </span>
      }
    >
      {list.length === 0 ? (
        <EmptyState icon={icon} title="Nothing here" message={emptyMsg} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paged.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate && navigate('tasks', { taskId: t.id })}
                className="clickable-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #e2e8f0)',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                    flex: 1,
                  }}
                  title={t.name}
                >
                  {t.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {t.endDate && (
                    <span className="text-muted" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(t.endDate)}
                    </span>
                  )}
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <Pager
              page={page}
              pageCount={pageCount}
              total={list.length}
              start={start}
              per={PER}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </Card>
  );
}

function IdleAlertsCard({ initialAlerts, recentActivity, isWorker, navigate }) {
  const [alerts, setAlerts] = useState(() => (Array.isArray(initialAlerts) ? initialAlerts : []));

  const refresh = useCallback(async () => {
    try {
      const logs = await api.get('/idle-time');
      if (Array.isArray(logs) && logs.length > 0) {
        const filtered = logs.filter(
          (l) => (l.durationSeconds || 0) >= 900 &&
                 l.userRole !== 'Admin' &&
                 l.employeeName !== 'System Administrator'
        );
        if (filtered.length > 0) {
          setAlerts(filtered);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // Fallback: parse idle alerts from recentActivity if /idle-time returns empty
    if (Array.isArray(recentActivity)) {
      const fallback = [];
      for (const n of recentActivity) {
        if (n.type === 'idle' || n.title?.includes('Idle')) {
          const m = String(n.message || '').match(/^(.+?)\s+was idle for\s+(\d+)\s+minutes/i);
          const name = m ? m[1] : 'Worker';
          if (name.includes('System Administrator') || name.includes('Admin')) continue;
          const mins = m ? parseInt(m[2], 10) : 15;
          fallback.push({
            id: n.id,
            employeeName: name,
            durationSeconds: mins * 60,
            logDate: n.createdAt ? n.createdAt.slice(0, 10) : 'Today',
            idleStart: n.createdAt,
          });
        }
      }
      if (fallback.length > 0) {
        setAlerts(fallback);
      }
    }
  }, [recentActivity]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000); // 8s live refresh
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="kpi-icon" style={{ background: '#ef444422', color: '#ef4444', width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            <i className="ph-fill ph-timer"></i>
          </span>
          <span>Idle-Time Alerts (&gt;15 min)</span>
          {alerts.length > 0 && (
            <span className="badge badge-danger" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
              {alerts.length} alert{alerts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      }
      actions={
        !isWorker && (
          <button
            className="btn btn-sm btn-secondary"
            style={{ fontSize: '0.78rem', padding: '4px 8px' }}
            onClick={() => navigate('idletime')}
          >
            View All ({alerts.length}) →
          </button>
        )
      }
    >
      <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {alerts.length === 0 ? (
          <EmptyState
            icon="ph-shield-check"
            title="No idle alerts"
            message="All worker sessions are within the 15-minute threshold."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', justifyContent: 'center' }}>
            {/* Overall summary KPI card-based grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div
                className="clickable-row"
                onClick={() => navigate('idletime')}
                style={{
                  padding: '16px 14px',
                  background: 'rgba(239,68,68,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Alerts</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', lineHeight: 1.1 }}>{alerts.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Active idle flags</div>
              </div>

              <div
                className="clickable-row"
                onClick={() => navigate('idletime')}
                style={{
                  padding: '16px 14px',
                  background: 'rgba(245,158,11,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(245,158,11,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Idle</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>
                  {Math.round(alerts.reduce((sum, a) => sum + (a.durationSeconds || 0), 0) / 60)}m
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Accumulated time</div>
              </div>

              <div
                className="clickable-row"
                onClick={() => navigate('idletime')}
                style={{
                  padding: '16px 14px',
                  background: 'rgba(59,130,246,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(59,130,246,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Workers</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1.1 }}>
                  {new Set(alerts.map((a) => a.employeeName || a.userId)).size}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Flagged workers</div>
              </div>
            </div>
          </div>
        )}
      </div>
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

  const STATUS_ORDER = ['In Progress', 'Completed', 'To Do', 'Overdue'];
  const statusLabels = Object.keys(data.charts.taskStatus).sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a);
    const ib = STATUS_ORDER.indexOf(b);
    return (ia !== -1 ? ia : 99) - (ib !== -1 ? ib : 99);
  });
  const doughnut = {
    labels: statusLabels,
    datasets: [{
      data: statusLabels.map((k) => data.charts.taskStatus[k]),
      backgroundColor: statusLabels.map((k) => STATUS_COLORS[k] || '#64748b'),
      borderWidth: 0,
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
      <div style={{ display: 'grid', gridTemplateColumns: (isWorker || isAdmin) ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 14, alignItems: 'stretch' }}>
        {(isAdmin || isWorker) ? (
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
        {(isAdmin || isWorker) ? (
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
        {!isWorker && !isAdmin && c.employees && (
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

      {/* Charts & analytics — admin/master only; workers get a focused personal view */}
      {!isWorker && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title="Task Status Distribution">
            {statusLabels.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 12, alignItems: 'center', height: 200 }}>
                <div style={{ height: '100%', position: 'relative' }}>
                  <Doughnut
                    data={doughnut}
                    options={{
                      ...chartOpts,
                      maintainAspectRatio: false,
                      plugins: {
                        ...chartOpts.plugins,
                        legend: { display: false },
                      },
                      cutout: '62%',
                      scales: {},
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {statusLabels.map((k) => {
                    const count = data.charts.taskStatus[k] || 0;
                    const color = STATUS_COLORS[k] || '#64748b';
                    return (
                      <div
                        key={k}
                        className="clickable-row"
                        onClick={() => navigate('tasks')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '8px 10px',
                          background: `${color}10`,
                          border: `1px solid ${color}33`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          gap: 2,
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {k}
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1.1 }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState icon="ph-chart-pie" title="No tasks yet" />
              </div>
            )}
          </Card>
          <IdleAlertsCard
            initialAlerts={data.idle?.recentAlerts}
            recentActivity={data.recentActivity}
            isWorker={isWorker}
            navigate={navigate}
          />
        </div>
      )}

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
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <Pager
                page={activityPage}
                pageCount={totalActivityPages}
                total={filteredActivities.length}
                start={activityStart}
                per={ACTIVITY_PER_PAGE}
                onPage={setActivityPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
