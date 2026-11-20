import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Card, EmptyState, SearchBox, ExportButton, toast } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#475569' } } },
  scales: { x: { ticks: { color: '#475569' }, grid: { display: false } },
            y: { ticks: { color: '#475569' }, grid: { color: 'rgba(100,116,139,.1)' }, beginAtZero: true } },
};

function MetricTile({ label, value, suffix = '', color }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-surface-hover,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10 }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'inherit' }}>{value}{suffix}</div>
      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>{label}</div>
    </div>
  );
}

export default function Performance() {
  const { user } = useAuth();
  const isWorker = user.role === 'Worker';
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empF, setEmpF] = useState('');
  const [projF, setProjF] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusF, setStatusF] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `?employeeId=${empF}&projectId=${projF}&dateFrom=${dateFrom}&dateTo=${dateTo}&status=${statusF}`;
      const [perf, pl, emp] = await Promise.all([
        api.get(`/performance${qs}`),
        isWorker ? Promise.resolve([]) : api.get('/projects'),
        isWorker ? Promise.resolve([]) : api.get('/employees'),
      ]);
      setData(perf); setProjects(pl); setEmployees(emp.filter((u) => u.role === 'Worker'));
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [empF, projF, dateFrom, dateTo, statusF, isWorker]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  if (loading) return <Spinner label="Computing performance…" />;
  if (!data) return <EmptyState icon="ph-chart-line-up" title="No performance data" />;

  const rows = data.employees;
  const compBar = {
    labels: rows.map((r) => r.employeeName),
    datasets: [
      { label: 'Completed', data: rows.map((r) => r.tasks.completed), backgroundColor: '#10b981', borderRadius: 5 },
      { label: 'Pending', data: rows.map((r) => r.tasks.pending), backgroundColor: '#eab308', borderRadius: 5 },
      { label: 'Overdue', data: rows.map((r) => r.tasks.overdue), backgroundColor: '#ef4444', borderRadius: 5 },
    ],
  };
  const trend = {
    labels: data.trend.map((t) => t.period),
    datasets: [{ label: 'Completed Tasks', data: data.trend.map((t) => t.completed),
      borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.15)', tension: 0.3, fill: true }],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      {!isWorker && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-control" style={{ width: 160 }} value={empF} onChange={(e) => setEmpF(e.target.value)}>
            <option value="">All Employees</option>
            {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="form-control" style={{ width: 170 }} value={projF} onChange={(e) => setProjF(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" className="form-control" style={{ width: 140 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From" />
          <input type="date" className="form-control" style={{ width: 140 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To" />
          <select className="form-control" style={{ width: 140 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="All">All Statuses</option><option>To Do</option><option>In Progress</option><option>Pending</option><option>Completed</option>
          </select>
          <div style={{ flex: 1 }} />
          <ExportButton path="/exports/performance" filename="Performance_Matrix.xlsx" />
        </div>
      )}

      {/* Individual summary tiles (when single employee or worker) */}
      {rows.length === 1 && (
        <Card title={`${rows[0].employeeName} — Performance Summary`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <MetricTile label="Assigned Tasks" value={rows[0].tasks.totalAssigned} />
            <MetricTile label="Completed" value={rows[0].tasks.completed} color="#10b981" />
            <MetricTile label="Completion Rate" value={rows[0].tasks.completionRate} suffix="%" />
            <MetricTile label="Overdue" value={rows[0].tasks.overdue} color="#ef4444" />
            <MetricTile label="Logged Hours" value={rows[0].timesheets.loggedHours} />
            <MetricTile label="Avg Hrs/Day" value={rows[0].timesheets.avgHoursPerDay} />
            <MetricTile label="Submission Rate" value={rows[0].timesheets.submissionRate} suffix="%" />
            <MetricTile label="Productivity Score" value={rows[0].productivity.score} color="#059669" />
          </div>
        </Card>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: isWorker ? '1fr' : '3fr 2fr', gap: 16 }}>
        {!isWorker && (
          <Card title="Employee Comparison — Task Completion">
            <div style={{ height: 280 }}>{rows.length ? <Bar data={compBar} options={CHART_OPTS} /> : <EmptyState icon="ph-chart-bar" title="No data" />}</div>
          </Card>
        )}
        <Card title="Monthly Productivity Trend">
          <div style={{ height: 280 }}>{data.trend.length ? <Line data={trend} options={CHART_OPTS} /> : <EmptyState icon="ph-chart-line" title="No completed tasks yet" />}</div>
        </Card>
      </div>

      {/* Comparison table */}
      {!isWorker && (
        <Card title="Performance Matrix" actions={<span className="text-muted" style={{ fontSize: '0.75rem' }}>Score = 0.5·Completion + 0.2·Submission + 0.3·Efficiency</span>}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Employee</th><th>Assigned</th><th>Completed</th><th>Pending</th><th>Overdue</th><th>Completion</th><th>Logged Hrs</th><th>Avg/Day</th><th>Submission</th><th>Score</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId}>
                    <td><strong>{r.employeeName}</strong></td>
                    <td>{r.tasks.totalAssigned}</td>
                    <td>{r.tasks.completed}</td>
                    <td>{r.tasks.pending}</td>
                    <td style={{ color: r.tasks.overdue ? '#ef4444' : 'inherit' }}>{r.tasks.overdue}</td>
                    <td>{r.tasks.completionRate}%</td>
                    <td>{r.timesheets.loggedHours}</td>
                    <td>{r.timesheets.avgHoursPerDay}</td>
                    <td>{r.timesheets.submissionRate}%</td>
                    <td><span className="badge" style={{ background: 'rgba(5,150,105,.15)', color: '#059669', fontWeight: 700 }}>{r.productivity.score}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
