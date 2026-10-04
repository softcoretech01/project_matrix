import React from 'react';

export default function Search() {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Global Search</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <input type="text" className="form-control" placeholder="Search tasks, projects, teammates..." style={{ marginBottom: '20px' }} />
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Enter a search query to find tasks across all your projects.
        </div>
      </div>
    </div>
  );
}
