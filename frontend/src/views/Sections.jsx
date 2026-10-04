import React from 'react';

export default function Sections() {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Sections / Categories</h3>
        <button className="btn btn-primary btn-sm">Add Section</button>
      </div>
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Manage task sections or categories here.
      </div>
    </div>
  );
}
