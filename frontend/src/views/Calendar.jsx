import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, STATUS_COLORS, effectiveStatus, toast } from '../components/ui';
import TimesheetForm from '../components/TimesheetForm';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const iso = (d) => d.toISOString().slice(0, 10);
const todayISO = iso(new Date());

const LEGEND = [
  ['In Progress', '#3b82f6'], ['Overdue', '#ef4444'], ['Completed', '#10b981'],
  ['To Do', '#64748b'], ['Pending', '#f59e0b'],
];

function Tooltip({ task, x, y }) {
  if (!task) return null;
  return (
    <div style={{ position: 'fixed', left: Math.min(x + 12, window.innerWidth - 280), top: y + 12, zIndex: 9999,
      width: 260, background: 'var(--surface,#1e293b)', border: '1px solid var(--border,#334155)',
      borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.4)', fontSize: '0.8rem', pointerEvents: 'none' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{task.name}</div>
      <div className="text-secondary" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' }}>
        <span>Project:</span><span>{task.projectName || task.projectId || '—'}</span>
        <span>Task ID:</span><span>{task.code || task.id}</span>
        <span>Assignee:</span><span>{task.assignedToName || '—'}</span>
        <span>Priority:</span><span>{task.priority}</span>
        <span>Start:</span><span>{task.startDate || '—'}</span>
        <span>Due:</span><span>{task.endDate || '—'}</span>
        <span>Status:</span><span>{effectiveStatus(task)}</span>
      </div>
      {task.description && <div className="text-muted" style={{ marginTop: 6, fontSize: '0.75rem' }}>{task.description.slice(0, 120)}</div>}
    </div>
  );
}

function Chip({ task, onHover, onLeave, onClick }) {
  const color = STATUS_COLORS[effectiveStatus(task)] || '#64748b';
  return (
    <div onMouseEnter={(e) => onHover(task, e)} onMouseMove={(e) => onHover(task, e)} onMouseLeave={onLeave}
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      style={{ background: `${color}22`, borderLeft: `3px solid ${color}`, color: 'inherit',
        padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', marginBottom: 3, cursor: 'pointer',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {task.assignedToName ? `${task.assignedToName.split(' ')[0]}: ` : ''}{task.name}
    </div>
  );
}

export default function Calendar({ navigate }) {
  const { user } = useAuth();
  const canFilter = user.role !== 'Worker';
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('month');
  const [empFilter, setEmpFilter] = useState('All');
  const [hover, setHover] = useState({ task: null, x: 0, y: 0 });
  const [addTs, setAddTs] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tl, emp] = await Promise.all([
        api.get('/tasks'),
        canFilter ? api.get('/employees') : Promise.resolve([]),
      ]);
      setTasks(tl); setEmployees(emp);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const byDate = useMemo(() => {
    const m = {};
    for (const t of tasks) {
      if (empFilter !== 'All' && t.assignedTo !== empFilter) continue;
      if (!t.endDate) continue;
      (m[t.endDate] = m[t.endDate] || []).push(t);
    }
    return m;
  }, [tasks, empFilter]);

  const onHover = (task, e) => setHover({ task, x: e.clientX, y: e.clientY });
  const onLeave = () => setHover({ task: null, x: 0, y: 0 });
  const openTask = (t) => navigate('tasks', { taskId: t.id });

  const move = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const header = view === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'week' ? `Week of ${cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const renderCell = (d, tall) => {
    const key = iso(d);
    const dayTasks = byDate[key] || [];
    const isToday = key === todayISO;
    const dim = view === 'month' && d.getMonth() !== cursor.getMonth();
    return (
      <div key={key} style={{ minHeight: tall ? 120 : 80, padding: 6, border: '1px solid var(--border,#334155)',
        background: isToday ? 'var(--color-primary-bg,rgba(99,102,241,.08))' : 'transparent', opacity: dim ? 0.4 : 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: isToday ? 800 : 500, marginBottom: 4,
          color: isToday ? 'var(--color-primary,#818cf8)' : 'inherit' }}>{d.getDate()}</div>
        {dayTasks.slice(0, tall ? 10 : 3).map((t) => (
          <Chip key={t.id} task={t} onHover={onHover} onLeave={onLeave} onClick={openTask} />
        ))}
        {dayTasks.length > (tall ? 10 : 3) && <div className="text-muted" style={{ fontSize: '0.68rem' }}>+{dayTasks.length - 3} more</div>}
      </div>
    );
  };

  // Build grid
  let cells = [];
  if (view === 'month') {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
  } else if (view === 'week') {
    const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
  } else {
    cells = [new Date(cursor)];
  }

  if (loading) return <Spinner label="Loading calendar…" />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => move(-1)}><i className="ph ph-caret-left"></i></button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCursor(new Date())}>Today</button>
          <button className="btn btn-sm btn-secondary" onClick={() => move(1)}><i className="ph ph-caret-right"></i></button>
          <h3 style={{ margin: '0 0 0 10px' }}>{header}</h3>
        </div>
        <div style={{ flex: 1 }} />
        {canFilter && (
          <select className="form-control" style={{ width: 170 }} value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
            <option value="All">All Employees</option>
            {employees.filter((u) => u.role === 'Worker').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <div className="btn-group" style={{ display: 'flex', gap: 4 }}>
          {['month', 'week', 'day'].map((v) => (
            <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>{v}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAddTs(true)}><i className="ph ph-plus"></i> Add Timesheet</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {LEGEND.map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: color }}></span>{label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {view !== 'day' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {DOW.map((d) => <div key={d} style={{ padding: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', borderBottom: '1px solid var(--border,#334155)' }}>{d}</div>)}
          </div>
        )}
        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>{cells.map((d) => renderCell(d, false))}</div>
        )}
        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>{cells.map((d) => renderCell(d, true))}</div>
        )}
        {view === 'day' && (
          <div style={{ padding: 16 }}>
            {(byDate[iso(cursor)] || []).length === 0
              ? <p className="text-secondary" style={{ textAlign: 'center', padding: 20 }}>No tasks due this day.</p>
              : (byDate[iso(cursor)] || []).map((t) => (
                <div key={t.id} onClick={() => openTask(t)} onMouseEnter={(e) => onHover(t, e)} onMouseMove={(e) => onHover(t, e)} onMouseLeave={onLeave}
                  className="clickable-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px',
                    borderLeft: `4px solid ${STATUS_COLORS[effectiveStatus(t)]}`, borderRadius: 6, marginBottom: 8, background: 'var(--surface-2,rgba(148,163,184,.06))' }}>
                  <div><strong>{t.name}</strong><div className="text-secondary" style={{ fontSize: '0.8rem' }}>{t.projectName} · {t.assignedToName || 'Unassigned'}</div></div>
                  <span style={{ color: STATUS_COLORS[effectiveStatus(t)], fontWeight: 600 }}>{effectiveStatus(t)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <Tooltip task={hover.task} x={hover.x} y={hover.y} />
      {addTs && <TimesheetForm onClose={() => setAddTs(false)} onSaved={() => setAddTs(false)} />}
    </div>
  );
}
