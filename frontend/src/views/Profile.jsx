import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setMessage('Please enter a new password.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || '1',
          new_password: newPassword.trim()
        })
      });

      if (res.ok) {
        setMessage('Password updated successfully!');
        setNewPassword('');
      } else {
        setMessage('Failed to update password.');
      }
    } catch (err) {
      console.error('Password update error:', err);
      setMessage('Error updating password.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card-header-flex">
        <h3>My Profile</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="form-control" value={user?.name || 'Admin User'} disabled />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Role</label>
          <input type="text" className="form-control" value={user?.role || 'Admin'} disabled />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Email Address</label>
          <input type="email" className="form-control" value={user?.email || 'admin@taskmanagement.com'} disabled />
        </div>
        <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)' }} />
        <h4>Change Password</h4>
        {message && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: message.includes('success') ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: message.includes('success') ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.85rem' }}>
            {message}
          </div>
        )}
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
