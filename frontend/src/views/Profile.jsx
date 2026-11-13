import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  
  return (
    <div className="card" style={{ maxWidth: '950px' }}>
      <div className="card-header-flex" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>User Profile & Security</h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>Manage your personal details, credentials, and access role.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', alignItems: 'start' }}>
        {/* Left Side: Avatar & Role Summary Card */}
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-glow)', 
            color: 'var(--color-primary-light)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '2rem', 
            fontWeight: 800,
            border: '2px solid var(--color-primary)',
            marginBottom: '16px' 
          }}>
            {user?.name ? user.name.split(' ').map(n=>n[0]).join('') : '?'}
          </div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>{user?.name || 'User'}</h4>
          <span className="badge badge-primary" style={{ fontSize: '12px', padding: '4px 12px', display: 'inline-block', marginBottom: '16px' }}>
            {user?.role || 'Role'}
          </span>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Account Status:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Domain:</span>
              <span>TechSpire Portal</span>
            </div>
          </div>
        </div>

        {/* Right Side: Account Details & Password Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Full Name</label>
            <input type="text" className="form-control" value={user?.name || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Assigned Role</label>
            <input type="text" className="form-control" value={user?.role || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
            <input type="email" className="form-control" value={`${(user?.name || 'user').toLowerCase().replace(/\s+/g, '.')}@taskmanagement.com`} disabled />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px', marginTop: '6px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Security & Password</h4>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>New Password</label>
              <input type="password" className="form-control" placeholder="Enter new password to change..." />
            </div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }}>Update Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}
