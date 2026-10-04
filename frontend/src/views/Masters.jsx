import React from 'react';

export default function Masters({ subKey }) {
  const getTitle = () => {
    switch (subKey) {
      case 'clients': return 'Client Master';
      case 'departments': return 'Department Master';
      case 'designations': return 'Designation Master';
      default: return 'Master Portal';
    }
  };

  const getDescription = () => {
    switch (subKey) {
      case 'clients': return 'Manage external clients associated with your projects.';
      case 'departments': return 'Manage company departments and structural hierarchies.';
      case 'designations': return 'Manage employee job titles and designations.';
      default: return 'Select a master to manage.';
    }
  };

  return (
    <div className="card">
      <div className="card-header-flex">
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{getTitle()}</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{getDescription()}</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <i className="ph ph-plus" style={{ marginRight: '6px' }}></i>
          Add New
        </button>
      </div>

      <div className="table-responsive mt-4">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>01</strong></td>
              <td>Example {subKey.charAt(0).toUpperCase() + subKey.slice(1)}</td>
              <td><span className="badge badge-active">Active</span></td>
              <td>
                <button className="btn btn-secondary btn-sm"><i className="ph ph-pencil-simple"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
