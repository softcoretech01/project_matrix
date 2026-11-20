import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Spinner, EmptyState, SearchBox, ExportButton, toast, SortHeader, useSortable } from '../components/ui';

const ALERT_SECONDS = 15 * 60;

function fmtDT(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? '—' : d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
}
function fmtTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? '—' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function IdleTime() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [empF, setEmpF] = useState('');
  const [dateF, setDateF] = useState('');
  const [period, setPeriod] = useState('daily');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lg, emp] = await Promise.all([
        api.get(`/idle-time?search=${encodeURIComponent(search)}&userId=${empF}&date=${dateF}`),
        api.get('/employees'),
      ]);
      setLogs(lg); setEmployees(emp.filter((u) => u.role === 'Worker'));
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search, empF, dateF]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const loadSummary = useCallback(async () => {
    try { setSummary(await api.get(`/idle-time/summary?period=${period}`)); }
    catch (e) { toast.error(e.message); }
  }, [period]);
  useEffect(() => { if (tab === 'summary') loadSummary(); }, [tab, loadSummary]);
  const { sorted, sort, toggle } = useSortable(logs);

  const alertCount = logs.filter((l) => l.durationSeconds >= ALERT_SECONDS).length;

  return (
    <div>
      {alertCount > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="ph-fill ph-warning-circle" style={{ fontSize: '1.6rem', color: '#ef4444' }}></i>
          <div><strong>{alertCount}</strong> idle session(s) exceeded 15 minutes. Admin has been notified.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="btn-group" style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('logs')}>Idle Logs</button>
          <button className={`btn btn-sm ${tab === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('summary')}>Summary Report</button>
        </div>
        <div style={{ flex: 1 }} />
        {tab === 'logs' ? (
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search employee…" width="200px" />
            <select className="form-control" style={{ width: 160 }} value={empF} onChange={(e) => setEmpF(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: 150 }} value={dateF} onChange={(e) => setDateF(e.target.value)} />
            <ExportButton path="/exports/idle-time" filename="Idle_Time_Report.xlsx" />
          </>
        ) : (
          <select className="form-control" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Daily</option><option value="monthly">Monthly</option>
          </select>
        )}
      </div>

      {loading ? <Spinner /> : tab === 'logs' ? (
        logs.length === 0 ? <EmptyState icon="ph-timer" title="No idle activity recorded" message="Idle sessions appear here as employees work." /> : (
          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 54 }}>S.NO</th>
                  <SortHeader label="Employee" sortKey="employeeName" sort={sort} onToggle={toggle} />
                  <th>Login Time</th><th>Last Active</th><th>Idle Start</th><th>Idle End</th>
                  <SortHeader label="Duration" sortKey="durationSeconds" sort={sort} onToggle={toggle} />
                  <SortHeader label="Date" sortKey="logDate" sort={sort} onToggle={toggle} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((l, idx) => {
                  const over = l.durationSeconds >= ALERT_SECONDS;
                  return (
                    <tr key={l.id} style={over ? { background: 'rgba(239,68,68,.08)' } : {}}>
                      <td className="text-muted">{idx + 1}</td>
                      <td><strong>{l.employeeName}</strong></td>
                      <td>{fmtDT(l.loginTime)}</td>
                      <td>{fmtTime(l.lastActive)}</td>
                      <td>{fmtTime(l.idleStart)}</td>
                      <td>{fmtTime(l.idleEnd)}</td>
                      <td style={{ color: over ? '#ef4444' : 'inherit', fontWeight: over ? 700 : 400 }}>
                        {l.durationMinutes} min {over && <i className="ph-fill ph-warning"></i>}
                      </td>
                      <td>{l.logDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        summary.length === 0 ? <EmptyState icon="ph-chart-bar" title="No data" /> : (
          <div className="table-responsive card">
            <table className="table">
              <thead><tr><th>Employee</th><th>{period === 'daily' ? 'Date' : 'Month'}</th><th>Total Idle (min)</th></tr></thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i}><td>{s.employeeName}</td><td>{s.period}</td><td><strong>{s.totalMinutes}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
