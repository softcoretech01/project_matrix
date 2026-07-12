// src/views/Approvals.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Approvals({ subKey }) {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comments for action
  const [actionComments, setActionComments] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, taskRes, empRes, projRes] = await Promise.all([
        fetch(`${API_BASE_URL}/timesheets`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/tasks`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user.id } })
      ]);

      if (!tsRes.ok || !taskRes.ok || !empRes.ok || !projRes.ok) {
        throw new Error('One or more API requests failed.');
      }

      const tss = await tsRes.json();
      const tsks = await taskRes.json();
      const emps = await empRes.json();
      const projs = await projRes.json();

      setEmployees(emps);
      setProjects(projs);

      // Filter Projects managed by PM to restrict approvals (if PM logged in)
      const myManagedProjIds = user.role === 'PM' ? projs.filter(p => p.pmId === user.id).map(p => p.id) : projs.map(p => p.id);

      // Filter submitted timesheets under managed projects
      setTimesheets(tss.filter(ts => ts.status === 'Submitted' && myManagedProjIds.includes(ts.projectId)));
      
      // Filter tasks up for review under PM's project scope
      setTasks(tsks.filter(t => (t.status === 'Review' || t.status === 'Completed') && myManagedProjIds.includes(t.projectId)));

    } catch (e) {
      console.error('Failed to fetch approvals data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // TIMESHEET ACTIONS (APPROVE / REJECT)
  const handleTimesheetStatus = async (id, status, comments) => {
    const target = timesheets.find(t => t.id === id);
    if (!target) return;

    const payload = {
      ...target,
      status,
      comments: comments || 'Approved'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/timesheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`Timesheet successfully ${status.toLowerCase()}!`);
        setTimesheets(prev => prev.filter(t => t.id !== id));
        fetchData();
      } else {
        alert('Failed to update timesheet.');
      }
    } catch (e) {
      alert('Error updating timesheet: ' + e.message);
    }
  };

  // TASK ACTIONS (CLOSE / REOPEN)
  const handleTaskStatus = async (id, status) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    let updatedFields = { status };
    if (status === 'Closed') {
      updatedFields.progress = 100;
    } else if (status === 'In Progress') {
      updatedFields.progress = 50; // Reopen reverts progress
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ ...target, ...updatedFields })
      });

      if (res.ok) {
        alert(`Task marked as ${status}!`);
        setTasks(prev => prev.filter(t => t.id !== id));
        fetchData();
      } else {
        alert('Failed to update task.');
      }
    } catch (e) {
      alert('Error updating task: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // --- SUB VIEW 1: TIMESHEET APPROVALS ---
  if (subKey === 'timesheets') {
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>Pending Timesheet Approvals</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Log Date</th>
                <th>Project Name</th>
                <th>Hours</th>
                <th>Task description</th>
                <th>Add Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No pending timesheets submitted for review.</td></tr>
              ) : timesheets.map(ts => {
                const emp = employees.find(e => e.id === ts.employeeId);
                const p = projects.find(proj => proj.id === ts.projectId);
                return (
                  <tr key={ts.id}>
                    <td>
                      <strong>{emp ? emp.name : 'Unknown'}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp?.department}</div>
                    </td>
                    <td>{formatDate(ts.date)}</td>
                    <td>{p ? p.name : 'Unknown'}</td>
                    <td><strong>{ts.hours} hrs</strong></td>
                    <td>{ts.description}</td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        placeholder="e.g. Approved/Missing detail"
                        value={actionComments[ts.id] || ''}
                        onChange={e => setActionComments({ ...actionComments, [ts.id]: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ padding: '4px 8px', marginRight: '6px' }}
                        onClick={() => handleTimesheetStatus(ts.id, 'Approved', actionComments[ts.id])}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleTimesheetStatus(ts.id, 'Rejected', actionComments[ts.id] || 'Rejected')}
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

  // --- SUB VIEW 2: TASK REVIEW & CLOSURE ---
  if (subKey === 'tasks') {
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>Task Review & Closure Panel</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Review tasks that have been completed or marked for inspection. Approve to Close or Reopen to send back.</p>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Project Scope</th>
                <th>Assigned Resource</th>
                <th>Logged / Est Hours</th>
                <th>Progress %</th>
                <th>Inspection status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted">No completed tasks are currently awaiting review.</td></tr>
              ) : tasks.map(t => {
                const emp = employees.find(e => e.id === t.assignedTo);
                const p = projects.find(proj => proj.id === t.projectId);
                return (
                  <tr key={t.id}>
                    <td><strong>{t.id}</strong></td>
                    <td>{t.name}</td>
                    <td>{p ? p.name : 'Unknown'}</td>
                    <td>{emp ? emp.name : 'Unassigned'}</td>
                    <td>{t.loggedHours}h spent / {t.estimatedHours}h est.</td>
                    <td>
                      <span className="badge badge-draft">{t.progress}%</span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status === 'Review' ? 'pending' : 'completed'}`}>{t.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ padding: '4px 8px', marginRight: '6px' }}
                        onClick={() => handleTaskStatus(t.id, 'Closed')}
                      >
                        Close Task
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleTaskStatus(t.id, 'In Progress')}
                      >
                        Reopen
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
