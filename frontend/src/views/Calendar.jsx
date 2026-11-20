import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, STATUS_COLORS, effectiveStatus, toast, fmtDate } from '../components/ui';
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
  const eff = effectiveStatus(task);
  const statusColor = STATUS_COLORS[eff] || '#64748b';

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(x + 14, window.innerWidth - 300),
      top: y + 14,
      zIndex: 9999,
      width: 280,
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 8px -2px rgba(15, 23, 42, 0.08)',
      fontSize: '0.82rem',
      color: '#0f172a',
      pointerEvents: 'none',
      lineHeight: 1.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.3 }}>{task.name}</div>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 6,
          background: `${statusColor}18`,
          color: statusColor,
          border: `1px solid ${statusColor}44`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {eff}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px 8px', fontSize: '0.8rem' }}>
        <span style={{ color: '#64748b', fontWeight: 500 }}>Project:</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{task.projectName || task.projectId || '—'}</span>

        <span style={{ color: '#64748b', fontWeight: 500 }}>Task ID:</span>
        <span style={{ color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>{task.code || task.id}</span>

        <span style={{ color: '#64748b', fontWeight: 500 }}>Assignee:</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{task.assignedToName || 'Unassigned'}</span>

        <span style={{ color: '#64748b', fontWeight: 500 }}>Priority:</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{task.priority || 'Medium'}</span>

        <span style={{ color: '#64748b', fontWeight: 500 }}>Start:</span>
        <span style={{ color: '#334155' }}>{fmtDate(task.startDate)}</span>

        <span style={{ color: '#64748b', fontWeight: 500 }}>Due:</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{fmtDate(task.endDate)}</span>
      </div>

      {task.description && (
        <div style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: '0.76rem',
          lineHeight: 1.4,
        }}>
          {task.description.slice(0, 120)}{task.description.length > 120 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

function Chip({ task, onHover, onLeave, onClick }) {
  const eff = effectiveStatus(task);
  const color = STATUS_COLORS[eff] || '#64748b';
  return (
    <div onMouseEnter={(e) => onHover(task, e)} onMouseMove={(e) => onHover(task, e)} onMouseLeave={onLeave}
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      style={{
        background: `${color}18`,
        borderLeft: `3px solid ${color}`,
        color: '#0f172a',
        fontWeight: 500,
        padding: '3px 7px',
        borderRadius: 4,
        fontSize: '0.74rem',
        marginBottom: 3,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
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
      <div key={key} style={{
        minHeight: tall ? 120 : 85,
        padding: 6,
        border: '1px solid #e2e8f0',
        background: isToday ? 'rgba(16, 185, 129, 0.08)' : (dim ? '#f8fafc' : '#ffffff'),
        opacity: dim ? 0.7 : 1,
        overflow: 'hidden',
        transition: 'background 0.15s ease',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: isToday ? 800 : 600,
          marginBottom: 4,
          color: isToday ? '#059669' : (dim ? '#94a3b8' : '#334155'),
        }}>
          {d.getDate()}
        </div>
        {dayTasks.slice(0, tall ? 10 : 3).map((t) => (
          <Chip key={t.id} task={t} onHover={onHover} onLeave={onLeave} onClick={openTask} />
        ))}
        {dayTasks.length > (tall ? 10 : 3) && (
          <div className="text-muted" style={{ fontSize: '0.68rem', fontWeight: 600, marginTop: 2 }}>
            +{dayTasks.length - (tall ? 10 : 3)} more
          </div>
        )}
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
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        {view !== 'day' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {DOW.map((d) => (
              <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, fontSize: '0.82rem', color: '#475569' }}>
                {d}
              </div>
            ))}
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
                  className="clickable-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
                    borderLeft: `4px solid ${STATUS_COLORS[effectiveStatus(t)]}`, borderRadius: 8, marginBottom: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
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
