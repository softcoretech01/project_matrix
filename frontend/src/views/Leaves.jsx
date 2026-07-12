// src/views/Leaves.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Leaves({ subKey }) {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('Casual');
  const [comments, setComments] = useState('');

  // Manager comments
  const [managerComments, setManagerComments] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaveRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/leaves`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id } })
      ]);
      if (!leaveRes.ok || !empRes.ok) {
        throw new Error('One or more API requests failed.');
      }
      const lList = await leaveRes.json();
      const eList = await empRes.json();

      setEmployees(eList);
      
      if (user.role === 'PM') {
        // PM sees pending leaves
        setLeaves(lList);
      } else {
        // Employee sees only their leaves
        setLeaves(lList.filter(l => l.employeeId === user.id));
      }
    } catch (e) {
      console.error('Failed to load leaves list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // SUBMIT APPLICATION
  const handleApply = async (e) => {
    e.preventDefault();
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before or equal to End date.');
      return;
    }

    const payload = {
      employeeId: user.id,
      startDate,
      endDate,
      type,
      comments,
      status: 'Pending'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Leave application submitted successfully!');
        setStartDate('');
        setEndDate('');
        setComments('');
        fetchData();
      } else {
        alert('Failed to submit leave.');
      }
    } catch (err) {
      alert('Error applying: ' + err.message);
    }
  };

  // APPROVALS REVIEW (APPROVE / REJECT)
  const handleStatusChange = async (id, status) => {
    const target = leaves.find(l => l.id === id);
    if (!target) return;

    const payload = {
      ...target,
      status,
      comments: managerComments[id] || 'Processed'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`Leave request marked as ${status}!`);
        fetchData();
      } else {
        alert('Failed to update leave request.');
      }
    } catch (e) {
      alert('Error saving review: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // --- SUB VIEW 1: APPLY LEAVE (EMPLOYEE VIEW) ---
  if (subKey === 'apply') {
    // Mock balances
    const casualUsed = leaves.filter(l => l.type === 'Casual' && l.status === 'Approved').length * 2; // approximation
    const sickUsed = leaves.filter(l => l.type === 'Sick' && l.status === 'Approved').length * 2;

    return (
      <div>
        <div className="leave-balance-container">
          <div className="leave-balance-card">
            <h4>Casual Leave Balance</h4>
            <span className="leave-balance-val">{Math.max(0, 12 - casualUsed)} / 12 days</span>
          </div>
          <div className="leave-balance-card">
            <h4>Sick Leave Balance</h4>
            <span className="leave-balance-val">{Math.max(0, 8 - sickUsed)} / 8 days</span>
          </div>
          <div className="leave-balance-card">
            <h4>Privilege Leave Balance</h4>
            <span className="leave-balance-val">15 / 15 days</span>
          </div>
        </div>

        <div className="grid-cols-2">
          {/* Apply form */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Apply for Leave</h3>
            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-control" value={startDate} onChange={e=>setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-control" value={endDate} onChange={e=>setEndDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-control" value={type} onChange={e=>setType(e.target.value)}>
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Privilege">Privilege Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comments / Reasons</label>
                <textarea className="form-control" style={{ resize: 'vertical', minHeight: '60px' }} value={comments} onChange={e=>setComments(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Submit Request</button>
            </form>
          </div>

          {/* History */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Application History</h3>
            <div className="table-responsive" style={{ maxHeight: '300px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dates</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-muted">No leave applications logged.</td></tr>
                  ) : leaves.map(l => (
                    <tr key={l.id}>
                      <td><small>{formatDate(l.startDate)} to {formatDate(l.endDate)}</small></td>
                      <td>{l.type}</td>
                      <td><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                      <td><small className="text-secondary">{l.comments || 'N/A'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB VIEW 2: LEAVE APPROVALS (PM VIEW) ---
  if (subKey === 'approve') {
    const pendingLeaves = leaves.filter(l => l.status === 'Pending');

    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>Leave Request Approvals</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Timeline Requested</th>
                <th>Leave Type</th>
                <th>Reason</th>
                <th>Feedback comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">No pending leave requests found.</td></tr>
              ) : pendingLeaves.map(l => {
                const emp = employees.find(e => e.id === l.employeeId);
                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{emp ? emp.name : 'Unknown'}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp?.designation}</div>
                    </td>
                    <td><small>{formatDate(l.startDate)} to {formatDate(l.endDate)}</small></td>
                    <td><strong>{l.type}</strong></td>
                    <td>{l.comments}</td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        placeholder="Add remarks..."
                        value={managerComments[l.id] || ''}
                        onChange={e => setManagerComments({ ...managerComments, [l.id]: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ padding: '4px 8px', marginRight: '6px' }}
                        onClick={() => handleStatusChange(l.id, 'Approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleStatusChange(l.id, 'Rejected')}
                      >
                        Reject
                      </button>
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

  return null;
}
