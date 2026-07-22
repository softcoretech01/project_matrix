// src/views/Reports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../utils/date';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Bar, Doughnut } from 'react-chartjs-2';

export default function Reports() {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState('utilization');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchReport = async (reportType) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${reportType}`, { headers: { 'x-user-id': user.id } });
      if (!res.ok) throw new Error(`API returned ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      console.error('Failed to load report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  const handleExportMock = () => {
    alert('CSV Export file generated! Initiating file download (Mock).');
  };

  // List of reports available
  const reportTypes = [
    { key: 'utilization', label: 'Resource Utilization Report', icon: '👤' },
    { key: 'project-effort', label: 'Project Report', icon: '📁' },
    { key: 'planned-vs-actual', label: 'Task Report', icon: '⏳' },
    { key: 'resource-allocation', label: 'Resource Allocations', icon: '📊' },
    { key: 'missing-timesheet', label: 'Timesheet Report', icon: '⚠️' },
    { key: 'productivity', label: 'Employee Report', icon: '🏆' }
  ];

  // Render Charts depending on Active Report
  const reportChart = useMemo(() => {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [] // Disables all interactions (hover, click, resize)
    };

    if (activeReport === 'utilization') {
      const labels = reportData.map(r => r.employeeName);
      const utils = reportData.map(r => r.utilization);
      return (
        <Bar
          data={{
            labels,
            datasets: [{ label: 'Utilization %', data: utils, backgroundColor: '#6366f1', borderRadius: 4 }]
          }}
          options={{
            ...commonOptions,
            scales: { y: { beginAtZero: true, max: 120 } }
          }}
        />
      );
    }

    if (activeReport === 'project-effort') {
      const labels = reportData.map(r => r.projectName);
      const hours = reportData.map(r => r.totalHoursSpent);
      return (
        <Doughnut
          data={{
            labels,
            datasets: [{ data: hours, backgroundColor: ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b'] }]
          }}
          options={commonOptions}
        />
      );
    }

    if (activeReport === 'planned-vs-actual') {
      const labels = reportData.map(r => (r.taskName || '').substring(0, 15) + '...');
      const ests = reportData.map(r => r.estimated);
      const acts = reportData.map(r => r.actual);
      return (
        <Bar
          data={{
            labels,
            datasets: [
              { label: 'Estimated Hours', data: ests, backgroundColor: '#3b82f6', borderRadius: 4 },
              { label: 'Logged Hours', data: acts, backgroundColor: '#10b981', borderRadius: 4 }
            ]
          }}
          options={commonOptions}
        />
      );
    }

    if (activeReport === 'productivity') {
      const labels = reportData.map(r => r.employeeName);
      const completed = reportData.map(r => r.completedCount);
      return (
        <Bar
          data={{
            labels,
            datasets: [{ label: 'Completed Tasks count', data: completed, backgroundColor: '#10b981', borderRadius: 4 }]
          }}
          options={commonOptions}
        />
      );
    }

    return <p className="text-center text-muted">No visual chart available for this report type.</p>;
  }, [activeReport, reportData]);

  return (
    <div>
      {/* Report Switcher bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {reportTypes.map(rpt => (
          <button
            key={rpt.key}
            className={`btn ${activeReport === rpt.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveReport(rpt.key)}
          >
            {rpt.icon} {rpt.label}
          </button>
        ))}
      </div>

      <div className="page-actions-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Search report table results..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExportMock}>
          Export to CSV
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        </div>
      ) : (
        <div className="grid-cols-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Table display */}
          <div className="card" style={{ overflow: 'visible' }}>
            <h3>Report Details Table</h3>
            <div className="table-responsive mt-4">
              {activeReport === 'utilization' && renderUtilizationTable(reportData, search)}
              {activeReport === 'project-effort' && renderProjectEffortTable(reportData, search)}
              {activeReport === 'planned-vs-actual' && renderPlannedVsActualTable(reportData, search)}
              {activeReport === 'resource-allocation' && renderResourceAllocationTable(reportData, search)}
              {activeReport === 'missing-timesheet' && renderMissingTimesheetTable(reportData, search)}
              {activeReport === 'productivity' && renderProductivityTable(reportData, search)}
            </div>
          </div>

          {/* Visual chart card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>Visual Chart representation</h3>
            <div className="chart-container mt-4" style={{ position: 'relative', width: '100%', height: '350px' }}>
              {reportChart}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== INDIVIDUAL REPORT RENDER FUNCTIONS ====================

function renderUtilizationTable(data, search) {
  const filtered = data.filter(r => (r.employeeName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Department</th>
          <th>Available Hours</th>
          <th>Logged Hours</th>
          <th>Utilization %</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => (
          <tr key={i}>
            <td><strong>{r.employeeName}</strong></td>
            <td>{r.department}</td>
            <td>{r.availableHours} hrs</td>
            <td>{r.loggedHours} hrs</td>
            <td>
              <span className={`badge badge-${r.utilization >= 75 ? 'active' : (r.utilization >= 50 ? 'draft' : 'inactive')}`}>
                {r.utilization}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderProjectEffortTable(data, search) {
  const filtered = data.filter(r => (r.projectName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Project Code</th>
          <th>Project Name</th>
          <th>Logged effort</th>
          <th>Module breakdown</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => (
          <tr key={i}>
            <td><strong>{r.projectCode}</strong></td>
            <td>{r.projectName}</td>
            <td><strong>{r.totalHoursSpent} hrs</strong></td>
            <td>
              <ul style={{ paddingLeft: '16px', fontSize: '0.8rem' }}>
                {(r.modules || []).map((m, idx) => (
                  <li key={idx} className="text-secondary">{m.moduleName}: {m.hoursSpent} hrs</li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderPlannedVsActualTable(data, search) {
  const filtered = data.filter(r => (r.taskName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Task ID</th>
          <th>Task Name</th>
          <th>Estimated Hours</th>
          <th>Actual hours spent</th>
          <th>Variance</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => {
          const varHours = parseFloat(r.actual) - parseFloat(r.estimated);
          return (
            <tr key={i}>
              <td><strong>{r.taskId}</strong></td>
              <td>{r.taskName}</td>
              <td>{r.estimated} hrs</td>
              <td>{r.actual} hrs</td>
              <td className={varHours > 0 ? 'text-danger' : 'text-success'}>
                {varHours > 0 ? `+${varHours}` : varHours} hrs
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderResourceAllocationTable(data, search) {
  const filtered = data.filter(r => (r.employeeName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Designation</th>
          <th>Active Project Allocations</th>
          <th>Total Load</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => (
          <tr key={i}>
            <td><strong>{r.employeeName}</strong></td>
            <td>{r.designation}</td>
            <td>
              {(r.allocations || []).map((a, idx) => (
                <div key={idx} className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  {a.projectCode}: {a.allocationPct}%
                </div>
              ))}
            </td>
            <td>
              <span className={`badge ${r.totalAllocationPct > 100 ? 'badge-inactive' : 'badge-active'}`}>
                {r.totalAllocationPct}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderMissingTimesheetTable(data, search) {
  const filtered = data.filter(r => (r.employeeName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Email Address</th>
          <th>Department</th>
          <th>Days Missed (This week)</th>
          <th>Missed Dates logs</th>
        </tr>
      </thead>
      <tbody>
        {filtered.length === 0 ? (
          <tr><td colSpan="5" className="text-center text-success">No active employees missed timesheet submissions this week!</td></tr>
        ) : filtered.map((r, i) => (
          <tr key={i}>
            <td><strong>{r.employeeName}</strong></td>
            <td>{r.email}</td>
            <td>{r.department}</td>
            <td><span className="badge badge-inactive">{r.missingCount} days</span></td>
            <td>
              {(r.missingDays || []).map((d, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem' }} className="text-danger">{formatDate(d.date)}: Logged {d.loggedHours}h / 8h</div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderProductivityTable(data, search) {
  const filtered = data.filter(r => (r.employeeName || '').toLowerCase().includes((search || '').toLowerCase()));
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Department</th>
          <th>Total Assigned Tasks</th>
          <th>Completed count</th>
          <th>Active count</th>
          <th>Avg. Active Progress %</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => (
          <tr key={i}>
            <td><strong>{r.employeeName}</strong></td>
            <td>{r.department}</td>
            <td>{r.totalAssigned} tasks</td>
            <td><span className="badge badge-active">{r.completedCount} closed</span></td>
            <td>{r.activeCount} open</td>
            <td>{r.averageActiveProgress}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
