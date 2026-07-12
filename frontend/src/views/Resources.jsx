// src/views/Resources.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Resources({ subKey }) {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, id: null, fields: {} });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allocRes, empRes, projRes] = await Promise.all([
        fetch(`${API_BASE_URL}/allocations`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user.id } })
      ]);
      if (!allocRes.ok || !empRes.ok || !projRes.ok) {
        throw new Error('One or more API requests failed.');
      }

      const allocs = await allocRes.json();
      const emps = await empRes.json();
      const projs = await projRes.json();

      setAllocations(allocs);
      setEmployees(emps.filter(e => e.status === 'Active' && e.role !== 'Admin'));
      setProjects(projs.filter(p => p.status === 'Active'));
    } catch (e) {
      console.error('Failed to load allocations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // DELETE
  const handleDelete = async (id, empName, projName) => {
    if (!window.confirm(`Are you sure you want to delete allocation of "${empName}" on project "${projName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/allocations/${id}`, { method: 'DELETE', headers: { 'x-user-id': user.id } });
      if (res.ok) {
        setAllocations(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to delete allocation.');
      }
    } catch (e) {
      alert('Error deleting allocation: ' + e.message);
    }
  };

  // OPEN MODAL
  const openModal = (item = null) => {
    setModal({
      isOpen: true,
      id: item ? item.id : null,
      fields: item ? { ...item } : {
        employeeId: employees[0]?.id || '',
        projectId: projects[0]?.id || '',
        role: '',
        allocation: 100,
        startDate: '',
        endDate: '',
        plannedHours: 160
      }
    });
  };

  // SUBMIT
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!modal.id;
    const { fields } = modal;

    // Check capacity sum
    const otherAllocs = allocations.filter(a => a.employeeId === fields.employeeId && (!isEdit || a.id !== modal.id));
    const sumAllocs = otherAllocs.reduce((s, a) => s + parseInt(a.allocation), 0);
    const newSum = sumAllocs + parseInt(fields.allocation);
    if (newSum > 100) {
      alert(`Warning: Total allocation for this resource will be ${newSum}%, exceeding 100%!`);
    }

    const url = isEdit ? `${API_BASE_URL}/allocations/${modal.id}` : `${API_BASE_URL}/allocations`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(fields)
      });

      if (res.ok) {
        setModal({ isOpen: false, id: null, fields: {} });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save allocation.');
      }
    } catch (err) {
      alert('Error saving allocation: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (subKey === 'planner') {
    return renderPlannerMatrix(employees, allocations, projects);
  }

  // Filter list
  const filteredAllocations = allocations.filter(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    const proj = projects.find(p => p.id === a.projectId);
    const q = searchQuery.toLowerCase();
    return (
      (emp?.name || '').toLowerCase().includes(q) ||
      (proj?.name || '').toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-actions-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Search allocations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
          + Allocate Employee
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Project</th>
              <th>Role</th>
              <th>Allocation %</th>
              <th>Timeline</th>
              <th>Planned Hours</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              const proj = projects.find(p => p.id === a.projectId);
              return (
                <tr key={a.id}>
                  <td><strong>{emp ? emp.name : 'Unknown'}</strong></td>
                  <td>{proj ? proj.name : 'Unknown'}</td>
                  <td>{a.role}</td>
                  <td>
                    <span className={`badge ${a.allocation > 100 ? 'badge-inactive' : (a.allocation === 100 ? 'badge-active' : 'badge-draft')}`}>
                      {a.allocation}%
                    </span>
                  </td>
                  <td><small>{formatDate(a.startDate)} to {formatDate(a.endDate)}</small></td>
                  <td>{a.plannedHours} hrs</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => openModal(a)}>✏️</button>
                    <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(a.id, emp?.name || 'staff', proj?.name || 'project')}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {modal.isOpen && (
        <div className="modal-overlay active" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">{modal.id ? 'Modify Project Allocation' : 'Allocate Resource to Project'}</h3>
                <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Employee</label>
                    <select
                      className="form-control"
                      value={modal.fields.employeeId}
                      onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, employeeId: e.target.value } }))}
                      disabled={!!modal.id}
                      required
                    >
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select
                      className="form-control"
                      value={modal.fields.projectId}
                      onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, projectId: e.target.value } }))}
                      required
                    >
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={modal.fields.role || ''}
                      onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, role: e.target.value } }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allocation Percentage (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={modal.fields.allocation || 100}
                      onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, allocation: parseInt(e.target.value) || 0 } }))}
                      min="1"
                      max="150"
                      required
                    />
                  </div>
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={modal.fields.startDate || ''}
                        onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, startDate: e.target.value } }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={modal.fields.endDate || ''}
                        onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, endDate: e.target.value } }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Planned Hours</label>
                    <input
                      type="number"
                      className="form-control"
                      value={modal.fields.plannedHours || 0}
                      onChange={e => setModal(prev => ({ ...prev, fields: { ...prev.fields, plannedHours: parseInt(e.target.value) || 0 } }))}
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// PLANNER MATRIX VIEW
function renderPlannerMatrix(employees, allocations, projects) {
  return (
    <div>
      <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <h3>Staff Capacity Allocation Matrix</h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Verify active allocations. Red cells indicate over-allocated employees; blue cells indicate under-utilized employees.</p>
      </div>

      <div className="planner-matrix-container table-responsive">
        <table className="planner-matrix">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: '200px' }}>Employee</th>
              <th>Designation</th>
              {projects.map(p => <th key={p.id}>{p.code}</th>)}
              <th>Total Allocation</th>
              <th>Capacity Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              let totalPct = 0;
              const projectCells = projects.map(proj => {
                const matches = allocations.filter(a => a.employeeId === emp.id && a.projectId === proj.id);
                const sumProjPct = matches.reduce((s, a) => s + parseInt(a.allocation), 0);
                totalPct += sumProjPct;
                return (
                  <td key={proj.id}>
                    {sumProjPct > 0 ? <span className="badge badge-draft">{sumProjPct}%</span> : '-'}
                  </td>
                );
              });

              let capacityLabel = '';
              let cellStyle = '';
              if (totalPct > 100) {
                capacityLabel = 'Over-allocated';
                cellStyle = 'load-over';
              } else if (totalPct === 100) {
                capacityLabel = 'Optimal Load';
                cellStyle = 'load-optimal';
              } else if (totalPct >= 50 && totalPct < 100) {
                capacityLabel = 'Moderate';
                cellStyle = 'load-optimal';
              } else {
                capacityLabel = 'Under-utilized';
                cellStyle = 'load-under';
              }

              return (
                <tr key={emp.id}>
                  <td style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp.department}</div>
                  </td>
                  <td className="text-secondary" style={{ fontSize: '0.85rem' }}>{emp.designation}</td>
                  {projectCells}
                  <td><strong>{totalPct}%</strong></td>
                  <td>
                    <span className={`planner-cell-load ${cellStyle}`}>{capacityLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
