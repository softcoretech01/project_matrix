import React, { useEffect, useState, useCallback } from 'react';
import { api, assetUrl } from '../services/api';
import { Spinner, EmptyState, SearchBox, Modal, ExportButton, toast, fmtDate, SortHeader, RowActions, DateCell, useSortable } from '../components/ui';
import CameraCapture from '../components/CameraCapture';
import { useLive } from '../components/useLiveSignaling';
import { useAuth } from '../context/AuthContext';

function fmtTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? '—' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Neutral placeholder shown when an image file is missing (no broken-image glyph)
const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='#eef2f7'/>" +
    "<path d='M13 15h3l1-1.5h6L24 15h3a1 1 0 011 1v8a1 1 0 01-1 1H13a1 1 0 01-1-1v-8a1 1 0 011-1z' fill='none' stroke='#94a3b8' stroke-width='1.5'/>" +
    "<circle cx='20' cy='20' r='3' fill='none' stroke='#94a3b8' stroke-width='1.5'/></svg>"
  );

export default function Camera() {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [empF, setEmpF] = useState('');
  const [dateF, setDateF] = useState('');
  const [preview, setPreview] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const live = useLive();
  const { user } = useAuth();
  const canLive = user && (user.role === 'Admin' || user.role === 'Master');

  const startLive = () => {
    const emp = employees.find((e) => String(e.id) === String(empF));
    if (!emp) { toast.error('Select an employee first'); return; }
    live?.requestView(emp);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lg, emp] = await Promise.all([
        api.get(`/camera?search=${encodeURIComponent(search)}&userId=${empF}&date=${dateF}`),
        api.get('/employees'),
      ]);
      setLogs(lg); setEmployees(emp.filter((u) => u.role === 'Worker'));
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search, empF, dateF]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  const { sorted, sort, toggle } = useSortable(logs);

  const onCapture = async (payload) => {
    try {
      if (payload.kind === 'video') {
        const fd = new FormData();
        fd.append('file', new File([payload.blob], `capture_${Date.now()}.webm`, { type: 'video/webm' }));
        fd.append('activityType', 'manual-video');
        await api.upload('/camera/video', fd);
        toast.success('Video recorded & logged');
      } else {
        await api.post('/camera', { image: payload.dataUrl, activityType: 'manual-capture' });
        toast.success('Photo captured & logged');
      }
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search employee / task…" width="220px" />
        <select className="form-control" style={{ width: 160 }} value={empF} onChange={(e) => setEmpF(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" className="form-control" style={{ width: 150 }} value={dateF} onChange={(e) => setDateF(e.target.value)} />
        <div style={{ flex: 1 }} />
        {canLive && (
          <button className="btn btn-secondary" onClick={startLive} disabled={!empF}
            title={empF ? 'Request a live camera view (employee must allow)' : 'Select an employee first'}>
            <i className="ph ph-video-camera"></i> Live View
          </button>
        )}
        <ExportButton path="/exports/camera" filename="Camera_Activity_Report.xlsx" />
        <button className="btn btn-primary" onClick={() => setCapturing(true)}><i className="ph ph-camera"></i> Capture Photo</button>
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState icon="ph-camera" title="No camera activity" message="Captured photos from timesheets and manual captures appear here." />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <th>Media</th>
                <SortHeader label="Employee" sortKey="employeeName" sort={sort} onToggle={toggle} />
                <SortHeader label="Date" sortKey="capturedAt" sort={sort} onToggle={toggle} />
                <th>Capture Time</th>
                <SortHeader label="Project ID" sortKey="projectId" sort={sort} onToggle={toggle} />
                <SortHeader label="Task ID" sortKey="taskId" sort={sort} onToggle={toggle} />
                <SortHeader label="Activity Type" sortKey="activityType" sort={sort} onToggle={toggle} />
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, idx) => (
                <tr key={l.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td>
                    {l.mediaType === 'video' ? (
                      <div onClick={() => setPreview(l)} style={{ position: 'relative', width: 40, height: 40, cursor: 'pointer' }}>
                        <video src={assetUrl(l.url)} muted preload="metadata"
                          style={{ display: 'block', width: 40, height: 40, objectFit: 'cover', borderRadius: 6,
                            border: '1px solid var(--border-color,#e2e8f0)', background: '#000' }} />
                        <i className="ph-fill ph-play-circle" style={{ position: 'absolute', inset: 0, margin: 'auto',
                          width: 18, height: 18, color: '#fff', fontSize: 18, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}></i>
                      </div>
                    ) : (
                      <img src={assetUrl(l.url)} alt="capture" onClick={() => setPreview(l)}
                        onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; e.target.style.cursor = 'default'; }}
                        style={{ display: 'block', width: 40, height: 40, objectFit: 'cover', borderRadius: 6,
                          cursor: 'pointer', border: '1px solid var(--border-color,#e2e8f0)',
                          background: 'var(--bg-surface,#f1f5f9)' }} />
                    )}
                  </td>
                  <td><strong>{l.employeeName}</strong></td>
                  <td><DateCell date={l.capturedAt} /></td>
                  <td>{fmtTime(l.capturedAt)}</td>
                  <td>{l.projectId || '—'}</td>
                  <td>{l.taskId || '—'}</td>
                  <td><span className="badge" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>{l.activityType}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
                      { icon: 'ph-eye', title: 'View', tone: 'primary', onClick: () => setPreview(l) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {capturing && <CameraCapture onCapture={onCapture} onClose={() => setCapturing(false)} />}
      {preview && (
        <Modal title={`${preview.mediaType === 'video' ? 'Video' : 'Capture'} — ${preview.employeeName}`} onClose={() => setPreview(null)} size="md">
          {preview.mediaType === 'video'
            ? <video src={assetUrl(preview.url)} controls autoPlay style={{ width: '100%', borderRadius: 8, background: '#000' }} />
            : <img src={assetUrl(preview.url)} alt="" style={{ width: '100%', borderRadius: 8 }} />}
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, fontSize: '0.85rem' }}>
            <div><span className="text-secondary">Date: </span>{fmtDate(preview.capturedAt)} {fmtTime(preview.capturedAt)}</div>
            <div><span className="text-secondary">Activity: </span>{preview.activityType}</div>
            <div><span className="text-secondary">Project: </span>{preview.projectId || '—'}</div>
            <div><span className="text-secondary">Task: </span>{preview.taskId || '—'}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
