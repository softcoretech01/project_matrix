import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api';
import { Spinner, Card, EmptyState, ExportButton, toast } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#475569' } } },
  scales: { x: { ticks: { color: '#475569' }, grid: { display: false } },
            y: { ticks: { color: '#475569' }, grid: { color: 'rgba(100,116,139,.1)' }, beginAtZero: true } },
};

export default function Reports() {
  const [effort, setEffort] = useState([]);
  const [util, setUtil] = useState([]);
  const [prod, setProd] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const [e, u, p] = await Promise.all([
        api.get('/reports/effort'), api.get('/reports/utilization'), api.get('/reports/productivity'),
      ]);
      setEffort(e); setUtil(u); setProd(p);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  })(); }, []);

  if (loading) return <Spinner label="Building reports…" />;

  const effortChart = {
    labels: effort.map((e) => e.projectName),
    datasets: [
      { label: 'Planned Hours', data: effort.map((e) => e.plannedHours), backgroundColor: '#059669', borderRadius: 5 },
      { label: 'Actual Hours', data: effort.map((e) => e.actualHours), backgroundColor: '#eab308', borderRadius: 5 },
    ],
  };
  const prodChart = {
    labels: prod.map((p) => p.period),
    datasets: [{ label: 'Completed Tasks', data: prod.map((p) => p.completedTasks),
      borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.15)', tension: 0.3, fill: true }],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <ExportButton path="/exports/projects" filename="Projects_Report.xlsx" label="Projects" />
        <ExportButton path="/exports/tasks" filename="Task_Report.xlsx" label="Tasks" />
        <ExportButton path="/exports/timesheets" filename="Timesheet_Report.xlsx" label="Timesheets" />
        <ExportButton path="/exports/performance" filename="Performance_Report.xlsx" label="Performance" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Project Effort — Planned vs Actual Hours">
          <div style={{ height: 280 }}>{effort.length ? <Bar data={effortChart} options={OPTS} /> : <EmptyState icon="ph-chart-bar" title="No data" />}</div>
        </Card>
        <Card title="Productivity Trend">
          <div style={{ height: 280 }}>{prod.length ? <Line data={prodChart} options={OPTS} /> : <EmptyState icon="ph-chart-line" title="No completed tasks" />}</div>
        </Card>
      </div>

      <Card title="Employee Utilization">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Role</th><th>Total Tasks</th><th>In Progress</th><th>Completed</th><th>Open</th><th>Logged Hrs</th><th>Utilization</th></tr>
            </thead>
            <tbody>
              {util.map((u, i) => (
                <tr key={i}>
                  <td><strong>{u.employeeName}</strong></td><td>{u.role}</td>
                  <td>{u.totalTasks}</td><td>{u.inProgressTasks}</td><td>{u.completedTasks}</td><td>{u.openTasks}</td>
                  <td>{u.loggedHours}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-color,#e2e8f0)', minWidth: 60 }}>
                        <div style={{ width: `${u.utilizationRate}%`, height: '100%', borderRadius: 3, background: '#059669' }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem' }}>{u.utilizationRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
