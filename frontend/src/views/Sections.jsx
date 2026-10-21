import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../context/AuthContext';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const fetchData = async () => {
    try {
      const [secRes, projRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sections`).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/projects`).catch(() => ({ ok: false }))
      ]);
      const sList = secRes.ok ? await secRes.json() : [];
      const pList = projRes.ok ? await projRes.json() : [];
      setSections(sList);
      setProjects(pList);
      if (pList.length > 0 && !selectedProject) setSelectedProject(pList[0].id);
    } catch (err) {
      console.error('Failed to load sections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!sectionName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          name: sectionName.trim()
        })
      });

      if (res.ok) {
        const newSec = await res.json();
        setSections(prev => [...prev, newSec]);
        setSectionName('');
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to create section:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header-flex">
          <h3>Sections / Categories</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="ph ph-plus" style={{ marginRight: '6px' }}></i> Add Section
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Section ID</th>
                <th>Section Name</th>
                <th>Project</th>
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 ? (
                <tr><td colSpan="3" className="text-center text-muted">No sections configured yet.</td></tr>
              ) : sections.map(s => {
                const proj = projects.find(p => p.id === s.projectId);
                return (
                  <tr key={s.id}>
                    <td><strong>{s.id}</strong></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{proj ? proj.name : s.projectId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: '440px', width: '90%', padding: '28px' }}>
            <h3 style={{ marginBottom: '16px' }}>Add Section</h3>
            <form onSubmit={handleCreateSection}>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-control" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Frontend Components"
                  value={sectionName}
                  onChange={e => setSectionName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Section</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
