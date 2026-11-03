// src/views/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Admin({ subKey }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Employee');
  const [newDesignation, setNewDesignation] = useState('Software Engineer');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        headers: { 'x-user-id': user?.id || '1' }
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

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '1' 
        },
        body: JSON.stringify({ role: updatedRole })
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
          designation: newDesignation
        })
      });

      if (res.ok) {
        const created = await res.json();
        setEmployees(prev => [...prev, created]);
        setNewName('');
        setNewEmail('');
        setShowAddModal(false);
        alert('User added successfully!');
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create user');
      }
    } catch (err) {
      alert('Error creating user: ' + err.message);
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
      <div>
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3>User Management</h3>
              <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Add, edit, or deactivate users in the system.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <i className="ph ph-user-plus" style={{ marginRight: '6px' }}></i> Add User
            </button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department / Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={`user-${emp.id}`}>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.email}</td>
                    <td>{emp.designation} ({emp.role})</td>
                    <td><span className="badge badge-active">{emp.status || 'Active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ maxWidth: '440px', width: '90%', padding: '28px' }}>
              <h3 style={{ marginBottom: '16px' }}>Add New User</h3>
              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Jane Doe"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="jane@taskmanagement.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="Employee">Employee</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="PM">Project Manager (PM)</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. QA Engineer"
                    value={newDesignation}
                    onChange={e => setNewDesignation(e.target.value)}
                  />
                </div>
                <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save User</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subKey === 'settings') {
    return (
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3>System Settings</h3>
        <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Configure global application settings.</p>
        
        {settingsSaved && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '0.85rem' }}>
            System settings saved successfully!
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }}>
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
              <option>IST (Indian Standard Time)</option>
            </select>
          </div>
          <div className="form-group checkbox-group" style={{ marginTop: '20px' }}>
            <input type="checkbox" id="email-notifs" defaultChecked />
            <label htmlFor="email-notifs" className="form-label" style={{ marginLeft: '8px' }}>Enable Global Email Notifications</label>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '20px' }}>Save Settings</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div>
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
                    </td>
                    <td>{emp.email}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '6px 12px', maxWidth: '160px' }}
                        value={emp.role}
                        onChange={e => handleRoleChange(emp.id, e.target.value)}
                        disabled={emp.id === user?.id}
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
