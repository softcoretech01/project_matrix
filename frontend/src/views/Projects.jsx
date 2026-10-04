import React from 'react';

export default function Projects({ subKey }) {
  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>{subKey === 'detail' ? 'Project Detail' : 'Projects'}</h3>
        {subKey !== 'detail' && <button className="btn btn-primary btn-sm">New Project</button>}
      </div>
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {subKey === 'detail' ? 'Select a project from the list to view its details.' : 'Project list will be displayed here.'}
      </div>
    </div>
  );
}
