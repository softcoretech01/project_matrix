// src/views/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch (e) {
      console.error('Failed to load user list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleRoleChange = async (id, updatedRole) => {
    const target = employees.find(e => e.id === id);
    if (!target) return;

    const payload = {
      ...target,
      role: updatedRole
    };

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, role: updatedRole } : e));
        alert('User system role updated successfully!');
      } else {
        alert('Failed to update role.');
      }
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
  };

  const handleResetDB = async () => {
    if (!window.confirm('Reset database? This erases all changes and re-seeds MySQL.')) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reset-db`, { method: 'POST' });
      if (res.ok) {
        alert('Database has been reset successfully!');
        fetchEmployees();
      } else {
        alert('Failed to reset database.');
      }
    } catch (e) {
      alert('Error resetting database: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="grid-cols-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Role list */}
        <div className="card">
          <h3>User & Role Management</h3>
          <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Configure employee system roles. Changes take effect on the employee's next navigation or page load.</p>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>System Role Mapping</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp.code}</div>
                    </td>
                    <td>{emp.email}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '6px 12px', maxWidth: '160px' }}
                        value={emp.role}
                        onChange={e => handleRoleChange(emp.id, e.target.value)}
                        disabled={emp.id === user.id} // Cannot demote self
                      >
                        <option value="Employee">Employee</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="PM">Project Manager (PM)</option>
                        <option value="Management">Management</option>
                        <option value="Admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Actions */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3>Database Operations Desk</h3>
          <p className="text-secondary mt-4">Reset the entire database back to default seed records. This works for both MySQL and the local JSON file fallback.</p>
          
          <button
            className="btn btn-danger mt-4"
            style={{ width: '100%' }}
            onClick={handleResetDB}
            disabled={resetting}
          >
            {resetting ? 'Resetting DB...' : 'Reset System Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
