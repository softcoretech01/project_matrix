import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, StatusBadge, toast, fmtDate } from '../components/ui';

export default function Profile() {
  const { user, changePassword } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);

  // contact-change request
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [requests, setRequests] = useState([]);

  const loadRequests = useCallback(async () => {
    try { setRequests(await api.get('/profile/my-requests')); } catch (_) {}
  }, []);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  const submitPw = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) return toast.error('New password must be at least 6 characters');
    if (newPw !== confirmPw) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      toast.success('Password updated successfully');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) { toast.error(err.message || 'Failed to update password'); }
    finally { setBusy(false); }
  };

  const requestChange = async (field, value) => {
    if (!value.trim()) return toast.error('Enter a value');
    try {
      await api.post('/profile/change-request', { field, newValue: value.trim() });
      toast.success('Request submitted — awaiting admin approval');
      loadRequests();
    } catch (e) { toast.error(e.message); }
  };

  const initials = user.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '?';
  const pending = requests.filter((r) => r.status === 'Pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <Card title="My Profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>{initials}</div>
            <div>
              <h3 style={{ margin: 0 }}>{user.name}</h3>
              <span className="badge badge-active">{user.role}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Employee Code', user.code], ['Email', user.email], ['Designation', user.designation],
              ['Department', user.department], ['Phone', user.phone || '—'], ['Status', user.status]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color,#e2e8f0)', paddingBottom: 7 }}>
                <span className="text-secondary">{k}</span>
                <strong>{v || '—'}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Change Password">
          <form onSubmit={submitPw}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Card>
      </div>

      <Card title="Request Contact Change">
        <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: -4, marginBottom: 14 }}>
          <i className="ph ph-info"></i> Changes to your email or phone require Admin approval before they take effect.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}
                onClick={() => requestChange('email', email)} disabled={email === user.email}>Request</button>
            </div>
          </div>
          <div>
            <label className="form-label">Phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}
                onClick={() => requestChange('phone', phone)} disabled={phone === (user.phone || '')}>Request</button>
            </div>
          </div>
        </div>

        {requests.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h4 style={{ margin: '0 0 8px' }}>My Requests {pending.length > 0 && <span className="badge badge-pending">{pending.length} pending</span>}</h4>
            <div className="table-responsive" style={{ border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10 }}>
              <table className="table">
                <thead><tr><th>Field</th><th>Requested Value</th><th>Status</th><th>Reason</th><th>Date</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td style={{ textTransform: 'capitalize' }}>{r.field}</td>
                      <td><strong>{r.newValue}</strong></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-secondary" style={{ fontSize: '0.82rem' }}>{r.reason || '—'}</td>
                      <td>{fmtDate(r.requestedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
