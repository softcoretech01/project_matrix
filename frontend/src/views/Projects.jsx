import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../context/AuthContext';

export default function Projects({ subKey }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [subKey]);

  useEffect(() => {
    if (subKey === 'detail' && selectedProjectId) {
      fetch(`${API_BASE_URL}/projects/${selectedProjectId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setProjectDetail(data);
        })
        .catch(err => console.error('Failed to load project details:', err));
    }
  }, [subKey, selectedProjectId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description
        })
      });

      if (res.ok) {
        const newProj = await res.json();
        setProjects(prev => [...prev, newProj]);
        setProjectName('');
        setDescription('');
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // --- SUB VIEW: PROJECT DETAIL ---
  if (subKey === 'detail') {
    return (
      <div className="grid-cols-2" style={{ gap: '20px' }}>
        <div className="card">
          <div className="card-header-flex">
            <h3>Projects</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: selectedProjectId === p.id ? 'var(--color-primary-glow)' : 'var(--bg-main)',
                  border: selectedProjectId === p.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>{p.name}</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{p.id} • {p.tasksCount || 0} Tasks</div>
                </div>
                <span className="badge badge-active">{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {projectDetail ? (
            <div>
              <div className="card-header-flex">
                <div>
                  <h3>{projectDetail.name}</h3>
                  <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{projectDetail.id} • {projectDetail.status}</div>
                </div>
              </div>
              <p style={{ margin: '14px 0', color: 'var(--text-secondary)' }}>{projectDetail.description || 'No description provided.'}</p>

              <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>Sections / Modules</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {(projectDetail.sections || []).map(s => (
                  <span key={s.id} className="badge badge-info" style={{ padding: '6px 12px' }}>{s.name}</span>
                ))}
                {(projectDetail.sections || []).length === 0 && (
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>No sections defined.</span>
                )}
              </div>

              <h4 style={{ marginBottom: '12px' }}>Project Tasks ({projectDetail.tasksCount || 0})</h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Task Name</th>
                      <th>Priority</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(projectDetail.tasks || []).map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                        <td>{t.progress}%</td>
                        <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                      </tr>
                    ))}
                    {(projectDetail.tasks || []).length === 0 && (
                      <tr><td colSpan="4" className="text-center text-muted">No tasks in this project yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              Select a project from the left to view details.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- DEFAULT VIEW: PROJECTS LIST ---
  return (
    <div>
      <div className="card">
        <div className="card-header-flex">
          <h3>Projects</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="ph ph-plus" style={{ marginRight: '6px' }}></i> New Project
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Project Name</th>
                <th>Description</th>
                <th>Tasks Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No projects found. Create one to get started!</td></tr>
              ) : projects.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td><strong>{p.name}</strong></td>
                  <td className="text-secondary">{p.description}</td>
                  <td>{p.tasksCount || 0} ({p.completedTasksCount || 0} completed)</td>
                  <td><span className="badge badge-active">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: '480px', width: '90%', padding: '28px' }}>
            <h3 style={{ marginBottom: '16px' }}>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mobile Application v2"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  placeholder="Brief overview of project goals..."
                  style={{ minHeight: '80px' }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
