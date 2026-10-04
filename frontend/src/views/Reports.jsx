import React, { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Reports() {
  const [activeReport, setActiveReport] = useState('tasks');
  const [search, setSearch] = useState('');

  const reportTypes = [
    { key: 'tasks', label: 'Task Status Report', icon: '📝' },
    { key: 'projects', label: 'Project Progress', icon: '📁' },
    { key: 'productivity', label: 'Team Productivity', icon: '👥' }
  ];

  const handleExport = () => {
    alert('CSV Export file generated! Initiating file download (Mock).');
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };

  const renderChart = () => {
    if (activeReport === 'tasks') {
      return (
        <Doughnut
          data={{
            labels: ['Open', 'In Progress', 'In Review', 'Completed'],
            datasets: [{ data: [12, 19, 3, 15], backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'] }]
          }}
          options={chartOptions}
        />
      );
    }
    if (activeReport === 'projects') {
      return (
        <Bar
          data={{
            labels: ['Project Alpha', 'Project Beta', 'Project Gamma'],
            datasets: [{ label: 'Completion %', data: [80, 45, 100], backgroundColor: '#6366f1', borderRadius: 4 }]
          }}
          options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
        />
      );
    }
    if (activeReport === 'productivity') {
      return (
        <Bar
          data={{
            labels: ['Alice', 'Bob', 'Charlie'],
            datasets: [{ label: 'Tasks Completed', data: [15, 8, 22], backgroundColor: '#10b981', borderRadius: 4 }]
          }}
          options={chartOptions}
        />
      );
    }
    return null;
  };

  return (
    <div>
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
            placeholder="Search report..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          Export to CSV
        </button>
      </div>

      <div className="grid-cols-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card" style={{ overflow: 'visible' }}>
          <h3>Report Data</h3>
          <div className="table-responsive mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sample Data</td>
                  <td>Sample Metric</td>
                  <td>100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3>Visualization</h3>
          <div className="chart-container mt-4" style={{ position: 'relative', width: '100%', height: '300px' }}>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
