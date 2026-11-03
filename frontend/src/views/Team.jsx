import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../context/AuthContext';

export default function Team() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Employee');
  const [designation, setDesignation] = useState('Software Engineer');

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          designation
        })
      });

      if (res.ok) {
        const newEmp = await res.json();
        setEmployees(prev => [...prev, newEmp]);
        setName('');
        setEmail('');
        setShowModal(false);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to add member.');
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
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
      <div className="card">
        <div className="card-header-flex">
          <h3>Team</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="ph ph-user-plus" style={{ marginRight: '6px' }}></i> Invite Member
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Designation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No team members found.</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.name}</strong></td>
                  <td>{emp.email}</td>
                  <td><span className="badge badge-info">{emp.role}</span></td>
                  <td>{emp.designation}</td>
                  <td><span className="badge badge-active">{emp.status || 'Active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: '440px', width: '90%', padding: '28px' }}>
            <h3 style={{ marginBottom: '16px' }}>Invite Team Member</h3>
            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="john@taskmanagement.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
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
                  placeholder="e.g. Frontend Developer"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                />
              </div>
              <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Invite Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
