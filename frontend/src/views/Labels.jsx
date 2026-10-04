import React from 'react';

export default function Labels() {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Labels & Tags</h3>
        <button className="btn btn-primary btn-sm">Create Label</button>
      </div>
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Manage global labels and tags for tasks here.
      </div>
    </div>
  );
}
