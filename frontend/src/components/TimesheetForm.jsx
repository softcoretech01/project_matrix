import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Modal, toast, StatusBadge } from './ui';
import CameraCapture from './CameraCapture';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];
const MAX_WORDS = 3000;
const MAX_IMAGES = 5;
const IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function to24(h, m, ap) {
  let hh = parseInt(h, 10) % 12;
  if (ap === 'PM') hh += 12;
  return hh * 60 + parseInt(m, 10);
}
function timeStr(h, m, ap) { return `${String(h).padStart(2, '0')}:${m} ${ap}`; }

function TimePicker({ label, value, onChange }) {
  const [h, setH] = useState(value.h), [m, setM] = useState(value.m), [ap, setAp] = useState(value.ap);
  useEffect(() => { onChange({ h, m, ap }); }, [h, m, ap]); // eslint-disable-line
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <select className="form-control" value={h} onChange={(e) => setH(e.target.value)}>
          {HOURS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="form-control" value={m} onChange={(e) => setM(e.target.value)}>
          {MINUTES.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="form-control" value={ap} onChange={(e) => setAp(e.target.value)}>
          <option>AM</option><option>PM</option>
        </select>
      </div>
    </div>
  );
}

export default function TimesheetForm({ initialTaskId = '', onClose, onSaved }) {
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState(initialTaskId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState({ h: 9, m: '00', ap: 'AM' });
  const [to, setTo] = useState({ h: 5, m: '00', ap: 'PM' });
  const [remarks, setRemarks] = useState('');
  const [images, setImages] = useState([]);   // {id, kind:'file'|'camera', file?, dataUrl?, preview}
  const [showCam, setShowCam] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try { setTasks(await api.get('/tasks')); } catch (e) { toast.error(e.message); }
  })(); }, []);

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  const totalHours = useMemo(() => {
    let diff = (to24(to.h, to.m, to.ap) - to24(from.h, from.m, from.ap)) / 60;
    if (diff < 0) diff += 24;
    return Math.round(diff * 100) / 100;
  }, [from, to]);

  const wordCount = remarks.trim() ? remarks.trim().split(/\s+/).length : 0;
  const overLimit = wordCount > MAX_WORDS;

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    for (const f of files) {
      if (images.length >= MAX_IMAGES) { toast.error(`Max ${MAX_IMAGES} images`); break; }
      if (!IMG_TYPES.includes(f.type)) { toast.error(`${f.name}: only JPG/PNG/WebP`); continue; }
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name}: max 8MB`); continue; }
      const reader = new FileReader();
      reader.onload = (e) => setImages((p) => [...p, { id: Date.now() + Math.random(), kind: 'file', file: f, preview: e.target.result }]);
      reader.readAsDataURL(f);
    }
  };
  const addCamera = (payload) => {
    const dataUrl = payload && payload.dataUrl ? payload.dataUrl : payload; // supports {kind,dataUrl}
    if (!dataUrl) return;
    if (images.length >= MAX_IMAGES) return toast.error(`Max ${MAX_IMAGES} images`);
    setImages((p) => [...p, { id: Date.now() + Math.random(), kind: 'camera', dataUrl, preview: dataUrl }]);
  };
  const removeImg = (id) => setImages((p) => p.filter((i) => i.id !== id));

  const submit = async () => {
    if (!taskId) return toast.error('Please select a task');
    if (overLimit) return toast.error(`Remarks exceed ${MAX_WORDS} words`);
    setBusy(true);
    try {
      const ts = await api.post('/timesheets', {
        taskId, projectId: task?.projectId || '', workDate: date,
        fromTime: timeStr(from.h, from.m, from.ap), toTime: timeStr(to.h, to.m, to.ap),
        totalHours, remarks,
      });
      // upload images
      for (const img of images) {
        try {
          if (img.kind === 'file') {
            const fd = new FormData(); fd.append('file', img.file);
            await api.upload(`/timesheets/${ts.id}/images`, fd);
          } else {
            await api.post(`/timesheets/${ts.id}/camera`, { image: img.dataUrl, taskId, projectId: task?.projectId || '' });
          }
        } catch (e) { toast.error('Image upload failed: ' + e.message); }
      }
      toast.success('Timesheet submitted');
      onSaved && onSaved(ts);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Create Timesheet" onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || overLimit}>{busy ? 'Submitting…' : 'Submit Timesheet'}</button></>}>
      <div className="form-group">
        <label className="form-label">Task *</label>
        <select className="form-control" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">— Select a task —</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.code || t.id} · {t.name}</option>)}
        </select>
      </div>

      {task && (
        <div className="card" style={{ padding: 14, marginBottom: 14, background: 'var(--surface-2, rgba(148,163,184,.07))' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, fontSize: '0.85rem' }}>
            <div><div className="text-secondary">Project ID</div><strong>{task.projectId || '—'}</strong></div>
            <div><div className="text-secondary">Task ID</div><strong>{task.code || task.id}</strong></div>
            <div><div className="text-secondary">Status</div><StatusBadge status={task.status} /></div>
            <div style={{ gridColumn: '1 / 3' }}><div className="text-secondary">Task</div><strong>{task.name}</strong></div>
            <div><div className="text-secondary">Assignee</div><strong>{task.assignedToName || '—'}</strong></div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TimePicker label="From Time" value={from} onChange={setFrom} />
        <TimePicker label="To Time" value={to} onChange={setTo} />
      </div>

      <div className="form-group">
        <label className="form-label">Total Hours (auto)</label>
        <input className="form-control" value={`${totalHours} hrs`} readOnly style={{ fontWeight: 700 }} />
      </div>

      <div className="form-group">
        <label className="form-label">Remarks</label>
        <textarea className="form-control" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)}
          placeholder="Describe the work done…" />
        <div style={{ textAlign: 'right', fontSize: '0.78rem', marginTop: 4,
          color: overLimit ? '#ef4444' : 'var(--text-secondary,#94a3b8)' }}>
          {wordCount} / {MAX_WORDS} words {overLimit && '— exceeds limit'}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Images (max {MAX_IMAGES}) — JPG, PNG, WebP</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: 'relative', width: 84, height: 84, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border,#334155)' }}>
              <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removeImg(img.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.6)',
                border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', fontSize: 12 }}>×</button>
              {img.kind === 'camera' && <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 10 }}><i className="ph-fill ph-camera" style={{ color: '#fff' }}></i></span>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
            <i className="ph ph-upload"></i> Upload
            <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowCam(true)}>
            <i className="ph ph-camera"></i> Camera
          </button>
        </div>
      </div>

      {showCam && <CameraCapture onCapture={addCamera} onClose={() => setShowCam(false)} allowVideo={false} />}
    </Modal>
  );
}
