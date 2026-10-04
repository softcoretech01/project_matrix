import React from 'react';

export default function Team() {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Team</h3>
        <button className="btn btn-primary btn-sm">Invite Member</button>
      </div>
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Manage your team members and roles here.
      </div>
    </div>
  );
}
