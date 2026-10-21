import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../context/AuthContext';

export default function Labels() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#6366f1');

  const fetchLabels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/labels`);
      if (res.ok) {
        setLabels(await res.json());
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreateLabel = async (e) => {
    e.preventDefault();
    if (!labelName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: labelName.trim(),
          color: labelColor
        })
      });

      if (res.ok) {
        const newLbl = await res.json();
        setLabels(prev => [...prev, newLbl]);
        setLabelName('');
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to create label:', err);
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
          <h3>Labels & Tags</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="ph ph-plus" style={{ marginRight: '6px' }}></i> Create Label
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Label ID</th>
                <th>Label Name</th>
                <th>Color Badge</th>
              </tr>
            </thead>
            <tbody>
              {labels.length === 0 ? (
                <tr><td colSpan="3" className="text-center text-muted">No labels created yet.</td></tr>
              ) : labels.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.id}</strong></td>
                  <td><strong>{l.name}</strong></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '12px', background: `${l.color}20`, color: l.color, fontWeight: 600, fontSize: '0.85rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }}></span>
                      {l.name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: '420px', width: '90%', padding: '28px' }}>
            <h3 style={{ marginBottom: '16px' }}>Create Label</h3>
            <form onSubmit={handleCreateLabel}>
              <div className="form-group">
                <label className="form-label">Label Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bug, Feature, Urgent"
                  value={labelName}
                  onChange={e => setLabelName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Color Theme</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ height: '44px', padding: '4px' }}
                  value={labelColor}
                  onChange={e => setLabelColor(e.target.value)}
                />
              </div>
              <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Label</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
