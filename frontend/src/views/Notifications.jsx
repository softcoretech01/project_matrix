import React from 'react';

export default function Notifications() {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Notifications</h3>
        <button className="btn btn-secondary btn-sm">Mark all as read</button>
      </div>
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        You're all caught up!
      </div>
    </div>
  );
}
