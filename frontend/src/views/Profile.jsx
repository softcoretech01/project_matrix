import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card-header-flex">
        <h3>My Profile</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="form-control" value={user?.name || ''} disabled />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Role</label>
          <input type="text" className="form-control" value={user?.role || ''} disabled />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Email Address</label>
          <input type="email" className="form-control" value={`${user?.id?.toLowerCase()}@taskmanagement.com`} disabled />
        </div>
        <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)' }} />
        <h4>Change Password</h4>
        <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
          <label className="form-label">New Password</label>
          <input type="password" className="form-control" placeholder="••••••••" />
        </div>
        <button className="btn btn-primary">Update Profile</button>
      </div>
    </div>
  );
}
