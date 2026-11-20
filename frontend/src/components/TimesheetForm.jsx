import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Modal, toast, StatusBadge } from './ui';
import CameraCapture from './CameraCapture';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];
const MAX_CHARS = 3000;
const MAX_IMAGES = 5;
const MAX_DOCS = 5;
const IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DOC_EXTS = ['xlsx', 'xls', 'csv', 'pdf', 'doc', 'docx', 'txt'];
const DOC_ACCEPT = '.xlsx,.xls,.csv,.pdf,.doc,.docx,.txt';
// Local (not UTC) YYYY-MM-DD so "today's work" matches the user's calendar day
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const prettyDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const docExt = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const docIcon = (name) => {
  const e = docExt(name);
  if (['xlsx', 'xls', 'csv'].includes(e)) return 'ph-file-xls';
  if (e === 'pdf') return 'ph-file-pdf';
  if (['doc', 'docx'].includes(e)) return 'ph-file-doc';
  return 'ph-file-text';
};

// Current local time as the picker uses it (hour 1–12, minute snapped to 00/15/30/45, AM/PM)
function nowTime() {
  const d = new Date();
  let h = d.getHours();
  let min = Math.round(d.getMinutes() / 15) * 15;
  if (min === 60) { min = 0; h = (h + 1) % 24; }
  const ap = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h: h12, m: String(min).padStart(2, '0'), ap };
}

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
  const [date] = useState(todayLocal());   // timesheet is always for today's work — not editable
  const [from, setFrom] = useState({ h: 9, m: '00', ap: 'AM' });
  const [to, setTo] = useState(nowTime());   // default end time = current time
  const [remarks, setRemarks] = useState('');
  const [images, setImages] = useState([]);   // {id, kind:'file'|'camera', file?, dataUrl?, preview}
  const [docs, setDocs] = useState([]);        // {id, file}
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

  const charCount = remarks.length;
  const overLimit = charCount > MAX_CHARS;

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

  const addDocs = (fileList) => {
    const files = Array.from(fileList);
    for (const f of files) {
      if (docs.length >= MAX_DOCS) { toast.error(`Max ${MAX_DOCS} files`); break; }
      if (!DOC_EXTS.includes(docExt(f.name))) { toast.error(`${f.name}: use Excel, PDF, Word, CSV or TXT`); continue; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name}: max 20MB`); continue; }
      setDocs((p) => [...p, { id: Date.now() + Math.random(), file: f }]);
    }
  };
  const removeDoc = (id) => setDocs((p) => p.filter((d) => d.id !== id));

  const submit = async () => {
    if (!taskId) return toast.error('Please select a task');
    if (overLimit) return toast.error(`Remarks exceed ${MAX_CHARS} characters`);
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
      // upload documents (Excel / PDF / Word / CSV …)
      for (const d of docs) {
        try {
          const fd = new FormData(); fd.append('file', d.file);
          await api.upload(`/timesheets/${ts.id}/files`, fd);
        } catch (e) { toast.error('File upload failed: ' + e.message); }
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
      {/* Row 1: Task (reduced width) and Date (second field) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Task *</label>
          <select className="form-control" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">— Select a task —</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.code || t.id} · {t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>(today)</span></label>
          <input className="form-control" value={prettyDate(date)} readOnly tabIndex={-1}
            title="Timesheets are logged for today's work"
            style={{ background: 'var(--surface-2, rgba(148,163,184,.08))', cursor: 'not-allowed', fontWeight: 600 }} />
        </div>
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

      {/* Row 2: From Time, To Time, and Total Hours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <TimePicker label="From Time" value={from} onChange={setFrom} />
        <TimePicker label="To Time" value={to} onChange={setTo} />
        <div className="form-group">
          <label className="form-label">Total Hours (auto)</label>
          <input className="form-control" value={`${totalHours} hrs`} readOnly style={{ fontWeight: 700 }} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Remarks</label>
        <textarea className="form-control" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)}
          placeholder="Describe the work done…" />
        <div style={{ textAlign: 'right', fontSize: '0.78rem', marginTop: 4,
          color: overLimit ? '#ef4444' : 'var(--text-secondary,#94a3b8)' }}>
          {charCount} / {MAX_CHARS} characters {overLimit && '— exceeds limit'}
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

      <div className="form-group">
        <label className="form-label">Files (max {MAX_DOCS}) — Excel, PDF, Word, CSV</label>
        {docs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {docs.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, fontSize: '0.85rem' }}>
                <i className={`ph ${docIcon(d.file.name)}`} style={{ color: '#059669', fontSize: '1.1rem' }}></i>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file.name}</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{(d.file.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" className="icon-btn danger" title="Remove" style={{ width: 28, height: 28, minWidth: 28 }}
                  onClick={() => removeDoc(d.id)}><i className="ph ph-x"></i></button>
              </div>
            ))}
          </div>
        )}
        <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
          <i className="ph ph-file-arrow-up"></i> Attach File
          <input type="file" hidden multiple accept={DOC_ACCEPT} onChange={(e) => { addDocs(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {showCam && <CameraCapture onCapture={addCamera} onClose={() => setShowCam(false)} allowVideo={false} />}
    </Modal>
  );
}
