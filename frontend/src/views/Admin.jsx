// src/views/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Admin({ subKey }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        headers: { 'x-user-id': user.id }
      });
      if (!res.ok) throw new Error(`API returned ${res.status}: ${res.statusText}`);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id 
        },
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



  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (subKey === 'users') {
    return (
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>User Management</h3>
            <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Add, edit, or deactivate users in the system.</p>
          </div>
          <button className="btn btn-primary btn-sm"><i className="ph ph-user-plus" style={{ marginRight: '6px' }}></i> Add User</button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={`user-${emp.id}`}>
                  <td><strong>{emp.name}</strong></td>
                  <td>{emp.email}</td>
                  <td>{emp.designation}</td>
                  <td><span className="badge badge-active">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (subKey === 'settings') {
    return (
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3>System Settings</h3>
        <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Configure global application settings.</p>
        
        <div className="form-group">
          <label className="form-label">Application Name</label>
          <input type="text" className="form-control" defaultValue="Task Management" />
        </div>
        <div className="form-group">
          <label className="form-label">Default Timezone</label>
          <select className="form-control">
            <option>UTC (Coordinated Universal Time)</option>
            <option>EST (Eastern Standard Time)</option>
            <option>PST (Pacific Standard Time)</option>
          </select>
        </div>
        <div className="form-group checkbox-group" style={{ marginTop: '20px' }}>
          <input type="checkbox" id="email-notifs" defaultChecked />
          <label htmlFor="email-notifs" className="form-label">Enable Global Email Notifications</label>
        </div>
        
        <button className="btn btn-primary" style={{ marginTop: '20px' }}>Save Settings</button>
      </div>
    );
  }

  return (
    <div>
      <div>
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
                  <tr key={`role-${emp.id}`}>
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
      </div>
    </div>
  );
}
