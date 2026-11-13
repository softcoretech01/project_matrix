// src/views/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Admin({ subKey }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    designation: 'Frontend Developer',
    role: 'Employee'
  });
  const [submittingUser, setSubmittingUser] = useState(false);

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
    window.addEventListener('pm_data_updated', fetchEmployees);
    return () => window.removeEventListener('pm_data_updated', fetchEmployees);
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    try {
      setSubmittingUser(true);
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        const created = await res.json();
        setEmployees(prev => [...prev, created]);
        setShowAddUserModal(false);
        setNewUser({ name: '', email: '', designation: 'Frontend Developer', role: 'Employee' });
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        alert(`Employee ${created.name} added successfully!`);
      } else {
        alert('Failed to add employee.');
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      alert('Error connecting to backend server.');
    } finally {
      setSubmittingUser(false);
    }
  };

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
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
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
          <button 
            onClick={() => setShowAddUserModal(true)} 
            className="btn btn-primary btn-sm"
          >
            <i className="ph ph-user-plus" style={{ marginRight: '6px' }}></i> Add User
          </button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={`user-${emp.id}`}>
                  <td><strong>{emp.name}</strong></td>
                  <td>{emp.email}</td>
                  <td>{emp.designation}</td>
                  <td><span className="badge badge-primary">{emp.role}</span></td>
                  <td><span className="badge badge-active">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <form 
              onSubmit={handleCreateUser}
              style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '480px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Add New Team Member</h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. John Doe" 
                  value={newUser.name} 
                  onChange={e => setNewUser({...newUser, name: e.target.value})} 
                  required 
                  autoFocus 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Email Address *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="e.g. john@projectmatrix.com" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Designation</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Backend Developer" 
                    value={newUser.designation} 
                    onChange={e => setNewUser({...newUser, designation: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>System Role</label>
                  <select 
                    className="form-control" 
                    value={newUser.role} 
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="Employee">Employee / Dev</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="PM">Project Manager</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingUser} 
                  className="btn btn-primary"
                >
                  {submittingUser ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (subKey === 'settings') {
    return (
      <div className="card" style={{ maxWidth: '850px' }}>
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
