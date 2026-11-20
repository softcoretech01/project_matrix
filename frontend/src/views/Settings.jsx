import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Card, toast } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const canEdit = user.role === 'Admin';
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try { setS(await api.get('/admin/settings')); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  })(); }, []);

  if (loading) return <Spinner />;
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try { const updated = await api.put('/admin/settings', s); setS(updated); toast.success('Settings saved'); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Card title="System Settings">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-control" value={s.companyName || ''} disabled={!canEdit}
              onChange={(e) => set('companyName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Idle Alert Threshold (minutes)</label>
            <input type="number" min="1" className="form-control" value={s.idleThresholdMinutes} disabled={!canEdit}
              onChange={(e) => set('idleThresholdMinutes', parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Timesheet Images</label>
            <input type="number" min="1" max="10" className="form-control" value={s.timesheetMaxImages} disabled={!canEdit}
              onChange={(e) => set('timesheetMaxImages', parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="form-group">
            <label className="form-label">Working Hours / Day</label>
            <input type="number" min="1" max="24" className="form-control" value={s.workingHoursPerDay} disabled={!canEdit}
              onChange={(e) => set('workingHoursPerDay', parseInt(e.target.value || '0', 10))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 8, marginBottom: 16 }}>
          <label className="checkbox-group" style={{ cursor: canEdit ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!s.notifyOnIdle} disabled={!canEdit} onChange={(e) => set('notifyOnIdle', e.target.checked)} />
            <span className="form-label" style={{ margin: 0 }}>Notify admin on idle alerts</span>
          </label>
          <label className="checkbox-group" style={{ cursor: canEdit ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!s.notifyOnTimesheet} disabled={!canEdit} onChange={(e) => set('notifyOnTimesheet', e.target.checked)} />
            <span className="form-label" style={{ margin: 0 }}>Notify on timesheet submission</span>
          </label>
        </div>

        {canEdit ? (
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Settings'}</button>
        ) : (
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Only an Admin can change these settings.</p>
        )}
      </Card>
    </div>
  );
}
