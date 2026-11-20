import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Spinner, EmptyState, toast, fmtDate } from '../components/ui';

const TYPE_ICON = { task: 'ph-check-square', system: 'ph-gear', idle: 'ph-timer',
  camera: 'ph-camera', info: 'ph-info', timesheet: 'ph-clock' };

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await api.get('/notifications')); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try { await api.put('/notifications/read-all'); toast.success('All marked as read'); load(); }
    catch (e) { toast.error(e.message); }
  };
  const markOne = async (id) => {
    try { await api.put(`/notifications/${id}/read`); setItems((p) => p.map((n) => n.id === id ? { ...n, isRead: true } : n)); }
    catch (e) { toast.error(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="card">
      <div className="card-header-flex">
        <h3 style={{ margin: 0 }}>Notification Centre</h3>
        <button className="btn btn-secondary btn-sm" onClick={markAll}>
          <i className="ph ph-checks"></i> Mark all as read
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="ph-bell" title="No notifications" message="You're all caught up." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n) => (
            <div key={n.id} onClick={() => !n.isRead && markOne(n.id)}
              style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: n.isRead ? 'default' : 'pointer',
                background: n.isRead ? 'transparent' : 'var(--color-primary-bg, rgba(79,70,229,.08))',
                border: '1px solid var(--border, #334155)' }}>
              <div style={{ fontSize: '1.4rem', color: 'var(--color-primary,#6366f1)' }}>
                <i className={`ph ${TYPE_ICON[n.type] || 'ph-info'}`}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong>{n.title}</strong>
                  {!n.isRead && <span className="badge badge-pending">New</span>}
                </div>
                <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: 2 }}>{n.message}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>{n.createdAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
