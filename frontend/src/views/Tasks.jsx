import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api, assetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LinksPanel from '../components/LinksPanel';
import LeadsPanel from '../components/LeadsPanel';
import {
  Spinner, Card, EmptyState, Modal, ConfirmDialog, SearchBox, StatusBadge, PriorityBadge,
  effectiveStatus, ExportButton, toast, fmtDate, SortHeader, RowActions, DateCell, useSortable,
} from '../components/ui';

const TASK_STATUSES = ['To Do', 'In Progress', 'Pending', 'Completed', 'Overdue'];
const EDITABLE_STATUSES = ['To Do', 'In Progress', 'Pending', 'Completed'];
// Simple, uniform set for the task Update-Status dropdown (all categories).
const TASK_UPDATE_STATUSES = ['To Do', 'In Progress', 'Completed', 'Overdue'];
// Normalise any category status into one of the 4 buckets for list badges.
const _DONE_SET = new Set(['Completed', 'Closed', 'Done', 'Won', 'Connected', 'Published', 'Report Submitted', 'Verified']);
const _TODO_SET = new Set(['To Do', 'To Call', 'Scheduled', 'Planned', 'Pending', 'New']);
function statusBucket(eff, status) {
  if (eff === 'Overdue') return 'Overdue';
  if (_DONE_SET.has(status)) return 'Completed';
  if (_TODO_SET.has(status)) return 'To Do';
  return 'In Progress';
}
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function TaskForm({ task, projects, employees, categories = [], onClose, onSaved }) {
  const editing = !!task;
  const [f, setF] = useState(task || {
    name: '', description: '', projectId: '', assignedTo: '', reviewerId: '',
    priority: 'Medium', status: 'To Do', startDate: '', endDate: '', estimatedHours: '', label: '',
    category: 'general', customData: {},
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [existingAtts, setExistingAtts] = useState([]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // When editing, load the files already attached to this task so they are visible here
  const loadAtts = useCallback(async () => {
    if (!task?.id) return;
    try { const d = await api.get(`/tasks/${task.id}`); setExistingAtts(d.attachments || []); }
    catch { /* ignore */ }
  }, [task?.id]);
  useEffect(() => { loadAtts(); }, [loadAtts]);
  const removeAtt = async (id) => {
    try { await api.del(`/tasks/attachments/${id}`); setExistingAtts((p) => p.filter((a) => a.id !== id)); toast.success('Attachment removed'); }
    catch (e) { toast.error(e.message); }
  };

  const cat = categories.find((c) => c.key === (f.category || 'general'))
    || { name: 'General', icon: 'ph-check-square', statuses: EDITABLE_STATUSES, fields: [] };
  const setCustom = (k, v) => setF((p) => ({ ...p, customData: { ...(p.customData || {}), [k]: v } }));
  const changeCategory = (key) => {
    const nc = categories.find((c) => c.key === key);
    setF((p) => ({ ...p, category: key, status: nc && nc.statuses[0] ? nc.statuses[0] : p.status }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    if (selected.size > MAX_BYTES) {
      toast.error(`File size exceeds 10MB limit (${(selected.size / (1024 * 1024)).toFixed(2)} MB)`);
      e.target.value = '';
      setFile(null);
      return;
    }
    setFile(selected);
  };

  // derive selected project for date bounds
  const selectedProject = projects.find((p) => String(p.id) === String(f.projectId));
  const projStart = selectedProject?.startDate || '';
  const projEnd = selectedProject?.endDate || '';

  // reviewer list must exclude the assigned employee
  const reviewerOptions = employees.filter((u) => !f.assignedTo || String(u.id) !== String(f.assignedTo));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Task title is required');
    if (!f.projectId) return toast.error('Please select a project');
    if (file && file.size > 10 * 1024 * 1024) {
      return toast.error('File size exceeds 10MB limit');
    }
    // Date boundary validation
    if (projStart && f.startDate && f.startDate < projStart)
      return toast.error(`Task start date cannot be before project start (${fmtDate(projStart)})`);
    if (projEnd && f.startDate && f.startDate > projEnd)
      return toast.error(`Task start date cannot be after project end (${fmtDate(projEnd)})`);
    if (projStart && f.endDate && f.endDate < projStart)
      return toast.error(`Task due date cannot be before project start (${fmtDate(projStart)})`);
    if (projEnd && f.endDate && f.endDate > projEnd)
      return toast.error(`Task due date cannot be after project end (${fmtDate(projEnd)})`);
    if (f.startDate && f.endDate && f.startDate > f.endDate)
      return toast.error('Task start date cannot be after due date');
    setBusy(true);
    try {
      const payload = { ...f, estimatedHours: f.estimatedHours ? parseFloat(f.estimatedHours) : null };
      let saved;
      if (editing) saved = await api.put(`/tasks/${task.id}`, payload);
      else saved = await api.post('/tasks', payload);

      if (file && (saved?.id || task?.id)) {
        const taskId = saved?.id || task?.id;
        const fd = new FormData();
        fd.append('file', file);
        await api.upload(`/tasks/${taskId}/attachments`, fd);
      }

      toast.success(`Task ${editing ? 'updated' : 'created'}`);
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={editing ? 'Edit Task' : 'Create Task'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save Task'}</button></>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Task Title *</label>
          <input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Work Category</label>
          <select className="form-control" value={f.category || 'general'} onChange={(e) => changeCategory(e.target.value)}>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select className="form-control" value={f.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Employee</label>
            <select className="form-control" value={f.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
              <option value="">— Unassigned —</option>
              {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {cat.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Start Date</label>
              {projStart && <span className="text-muted" style={{ fontSize: '0.72rem' }}>Project: {fmtDate(projStart)} – {fmtDate(projEnd) || '?'}</span>}
            </div>
            <input
              type="date" className="form-control"
              value={f.startDate || ''}
              min={projStart || undefined}
              max={f.endDate || projEnd || undefined}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Due Date</label>
              {projEnd && <span className="text-muted" style={{ fontSize: '0.72rem' }}>Deadline: {fmtDate(projEnd)}</span>}
            </div>
            <input
              type="date" className="form-control"
              value={f.endDate || ''}
              min={f.startDate || projStart || undefined}
              max={projEnd || undefined}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Hours</label>
            <input type="number" min="0" step="0.5" className="form-control" value={f.estimatedHours || ''} onChange={(e) => set('estimatedHours', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Reviewer <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>(optional)</span></label>
            <select className="form-control" value={f.reviewerId} onChange={(e) => set('reviewerId', e.target.value)}>
              <option value="">— None —</option>
              {reviewerOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {cat.fields.length > 0 && (
          <div style={{ marginTop: 6, marginBottom: 6, padding: '12px 14px', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10, background: 'var(--bg-surface-hover,#fafafa)' }}>
            <div className="form-label" style={{ marginBottom: 10, color: 'var(--color-primary)', fontWeight: 700 }}>
              <i className={`ph ${cat.icon}`}></i> {cat.name} Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {cat.fields.map((fld) => (
                <div className="form-group" key={fld.key} style={{ marginBottom: 0 }}>
                  <label className="form-label">{fld.label}</label>
                  {fld.type === 'select' ? (
                    <select className="form-control" value={(f.customData || {})[fld.key] || ''} onChange={(e) => setCustom(fld.key, e.target.value)}>
                      <option value="">— Select —</option>
                      {fld.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="form-control"
                      type={fld.type === 'number' ? 'number' : fld.type === 'date' ? 'date' : 'text'}
                      placeholder={fld.type === 'url' ? 'https://…' : ''}
                      value={(f.customData || {})[fld.key] || ''} onChange={(e) => setCustom(fld.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="form-label" style={{ margin: 0 }}>Attachment</label>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Max size: 10MB</span>
          </div>
          {editing && existingAtts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {existingAtts.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, fontSize: '0.82rem' }}>
                  <i className="ph ph-paperclip" style={{ color: '#64748b' }}></i>
                  <a href={assetUrl(a.url)} target="_blank" rel="noreferrer" download
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text,#0f172a)', textDecoration: 'none' }}>
                    {a.originalName || a.filename}
                  </a>
                  <button type="button" title="Remove" onClick={() => removeAtt(a.id)}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <i className="ph ph-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <input type="file" className="form-control" onChange={handleFileChange} />
          {file && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: '0.8rem' }}>
              <span className="text-secondary">
                <i className="ph ph-paperclip" style={{ marginRight: 4 }}></i>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <button
                type="button"
                className="btn btn-sm"
                style={{ color: '#ef4444', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={(e) => {
                  setFile(null);
                  const input = e.target.closest('.form-group')?.querySelector('input[type="file"]');
                  if (input) input.value = '';
                }}
              >
                <i className="ph ph-x"></i> Remove
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function TaskDetail({ id, projects, employees, categories = [], onBack, onChanged }) {
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const COMMENTS_PER_PAGE = 5;
  const [statusDraft, setStatusDraft] = useState('');
  const [remarkDraft, setRemarkDraft] = useState('');
  const [selectedTs, setSelectedTs] = useState(null);

  const canEdit = user.role !== 'Worker';
  const isOwner = t && t.assignedTo === user.id;

  const sortedComments = useMemo(() => {
    if (!t?.comments) return [];
    return [...t.comments].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [t?.comments]);

  const totalCommentPages = Math.max(1, Math.ceil(sortedComments.length / COMMENTS_PER_PAGE));

  const pagedComments = useMemo(() => {
    const page = Math.min(commentPage, totalCommentPages);
    const start = (page - 1) * COMMENTS_PER_PAGE;
    return sortedComments.slice(start, start + COMMENTS_PER_PAGE);
  }, [sortedComments, commentPage, totalCommentPages]);

  const openTimesheetDetail = async (ts) => {
    try {
      const full = await api.get(`/timesheets/${ts.id}`);
      setSelectedTs(full);
    } catch {
      setSelectedTs(ts);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/tasks/${id}`);
      setT(data); setStatusDraft(data.status);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!t) return <EmptyState icon="ph-check-square" title="Task not found" />;

  const countWords = (text) => {
    if (!text) return 0;
    const matches = text.trim().match(/\S+/g);
    return matches ? matches.length : 0;
  };

  const handleRemarkChange = (e) => {
    const val = e.target.value;
    const words = val.trim().match(/\S+/g) || [];
    if (words.length <= 3000) {
      setRemarkDraft(val);
    } else {
      let count = 0;
      let cutIndex = val.length;
      const re = /\S+/g;
      let match;
      while ((match = re.exec(val)) !== null) {
        count++;
        if (count === 3000) {
          cutIndex = match.index + match[0].length;
          break;
        }
      }
      setRemarkDraft(val.slice(0, cutIndex));
      toast.warning('Maximum 3000 words limit reached');
    }
  };

  const wordCount = countWords(remarkDraft);

  const saveStatus = async () => {
    if (wordCount > 3000) {
      toast.error('Remark cannot exceed 3000 words');
      return;
    }
    try {
      await api.put(`/tasks/${id}`, {
        status: statusDraft,
        remark: remarkDraft.trim() || undefined,
      });
      toast.success('Task updated');
      setRemarkDraft('');
      load();
      onChanged && onChanged();
    } catch (e) { toast.error(e.message); }
  };
  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/${id}/comments`, { text: comment });
      setComment('');
      await load();
      const newTotal = sortedComments.length + 1;
      setCommentPage(Math.ceil(newTotal / COMMENTS_PER_PAGE));
    } catch (e) {
      toast.error(e.message);
    }
  };
  const uploadFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      e.target.value = '';
      return;
    }
    const fd = new FormData(); fd.append('file', file);
    try { await api.upload(`/tasks/${id}/attachments`, fd); toast.success('File attached'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const eff = effectiveStatus(t);
  const leadsTask = !!(categories.find((c) => c.key === (t.category || 'general')) || {}).leadsUpload;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}><i className="ph ph-arrow-left"></i> Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t.code} · {t.projectName}</div>
            <h2 style={{ margin: '4px 0' }}>{t.name}</h2>
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              <PriorityBadge priority={t.priority} /><StatusBadge status={eff} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 14 }}>
              <div><div className="text-secondary" style={{ fontSize: '0.75rem' }}>Assignee</div><strong>{t.assignedToName || '—'}</strong></div>
              <div><div className="text-secondary" style={{ fontSize: '0.75rem' }}>Reviewer</div><strong>{t.reviewerName || '—'}</strong></div>
              <div><div className="text-secondary" style={{ fontSize: '0.75rem' }}>Est. Hours</div><strong>{t.estimatedHours ?? '—'}</strong></div>
              <div><div className="text-secondary" style={{ fontSize: '0.75rem' }}>Start</div><strong>{fmtDate(t.startDate)}</strong></div>
              <div><div className="text-secondary" style={{ fontSize: '0.75rem' }}>Due</div><strong>{fmtDate(t.endDate)}</strong></div>
            </div>

            {(() => {
              const cat = categories.find((c) => c.key === (t.category || 'general'));
              if (!cat || cat.key === 'general') return null;
              const vals = t.customData || {};
              return (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color,#e2e8f0)' }}>
                  <span className="badge" style={{ background: `${cat.color}18`, color: cat.color, fontWeight: 600 }}>
                    <i className={`ph ${cat.icon}`}></i> {cat.name}
                  </span>
                  {cat.fields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 10 }}>
                      {cat.fields.map((fld) => {
                        const v = vals[fld.key];
                        return (
                          <div key={fld.key}>
                            <div className="text-secondary" style={{ fontSize: '0.72rem' }}>{fld.label}</div>
                            {fld.type === 'url' && v
                              ? <a href={v} target="_blank" rel="noreferrer"><i className="ph ph-link"></i> Open</a>
                              : <strong>{v || '—'}</strong>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Marked Area: Highlighted Description & Highlighted Attachments */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Highlighted Description */}
              <div style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #10b981',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#059669',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <i className="ph ph-notepad" style={{ fontSize: '0.95rem' }}></i>
                  Description
                </div>
                <p style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  fontWeight: 500,
                }}>
                  {t.description ? t.description : <span className="text-muted" style={{ fontWeight: 400, fontStyle: 'italic' }}>No description provided.</span>}
                </p>
              </div>

              {/* Highlighted Attachments Box */}
              <div style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #3b82f6',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <i className="ph ph-paperclip" style={{ fontSize: '0.95rem' }}></i>
                    Attachments ({t.attachments?.length || 0})
                  </div>
                  <label className="btn btn-sm btn-secondary" style={{ padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <i className="ph ph-upload"></i> Upload<input type="file" hidden onChange={uploadFile} />
                  </label>
                </div>

                {t.attachments && t.attachments.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {t.attachments.map((a) => (
                      <a key={a.id} href={assetUrl(a.url)} target="_blank" rel="noreferrer" download
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '6px 12px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: 7,
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          textDecoration: 'none',
                          fontWeight: 600,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}>
                        <i className="ph ph-file-text" style={{ color: '#2563eb', fontSize: '1rem' }}></i>
                        <span>{a.originalName || a.filename}</span>
                        <i className="ph ph-download-simple" style={{ color: '#64748b', marginLeft: 4 }}></i>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.82rem' }}>
                    <i className="ph ph-info" style={{ color: '#94a3b8' }}></i>
                    <span>No attachments uploaded yet. Click Upload to attach files (up to 10MB).</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Lead contacts (Excel import) for categories that use it (e.g. Sales) */}
          {leadsTask && <LeadsPanel taskId={t.id} canEdit={canEdit || isOwner} />}

          {/* Comments */}
          <Card title={`Comments (${sortedComments.length})`}>
            {sortedComments.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 14px' }}>
                No comments yet. Write a message below to start the conversation.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pagedComments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ph ph-user-circle" style={{ color: '#059669', fontSize: '1.15rem' }}></i>
                          <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{c.userName}</strong>
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.74rem' }}>{fmtDateTime(c.createdAt)}</span>
                      </div>
                      <div style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', paddingLeft: 24 }}>
                        {c.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Page-wise Pagination Controls */}
                {totalCommentPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 2px 4px',
                    marginTop: 10,
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                  }}>
                    <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                      Showing {(Math.min(commentPage, totalCommentPages) - 1) * COMMENTS_PER_PAGE + 1}–{Math.min(Math.min(commentPage, totalCommentPages) * COMMENTS_PER_PAGE, sortedComments.length)} of {sortedComments.length}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={commentPage <= 1}
                        onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        <i className="ph ph-caret-left"></i> Prev
                      </button>
                      <span style={{ fontWeight: 600, color: '#334155', padding: '0 4px', fontSize: '0.78rem' }}>
                        Page {Math.min(commentPage, totalCommentPages)} / {totalCommentPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={commentPage >= totalCommentPages}
                        onClick={() => setCommentPage((p) => Math.min(totalCommentPages, p + 1))}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        Next <i className="ph ph-caret-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Downside: Latest Reply Input Box */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                className="form-control"
                placeholder="Write a comment or reply…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
              />
              <button
                className="btn btn-primary"
                onClick={addComment}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 16px', whiteSpace: 'nowrap' }}
              >
                <i className="ph ph-paper-plane-right"></i> Post
              </button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(canEdit || isOwner) && (
            <Card title="Update Status">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {TASK_UPDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Remark</label>
                  <span style={{ fontSize: '0.75rem', color: wordCount > 3000 ? '#ef4444' : 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
                    {wordCount}/3000
                  </span>
                </div>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Enter remark…"
                  value={remarkDraft}
                  onChange={handleRemarkChange}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveStatus}>Save Update</button>
            </Card>
          )}

          <Card title={`Timesheets (${t.timesheets.length})`}>
            {t.timesheets.length === 0 ? <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No timesheets logged.</p> :
              t.timesheets.map((ts) => (
                <div key={ts.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{ts.employeeName}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{ts.totalHours}h</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '2px 8px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.74rem',
                          fontWeight: 500,
                        }}
                        title="View Remarks & Timesheet Details"
                        onClick={() => openTimesheetDetail(ts)}
                      >
                        <i className="ph ph-eye"></i> View
                      </button>
                    </div>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                    {ts.workDate} · {ts.fromTime}–{ts.toTime}
                  </div>
                  {ts.remarks && (
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#475569',
                      marginTop: 4,
                      fontStyle: 'italic',
                      background: '#f8fafc',
                      padding: '3px 6px',
                      borderRadius: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <i className="ph ph-chat-text" style={{ marginRight: 4, color: '#059669' }}></i>
                      {ts.remarks}
                    </div>
                  )}
                </div>
              ))}
          </Card>

          <LinksPanel parentType="task" parentId={t.id} />

          <Card title="Activity / Updates">
            {t.updates.length === 0 ? <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No updates yet.</p> :
              t.updates.map((u) => (
                <div key={u.id} style={{ fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div><strong>{u.userName}</strong> <span className="text-secondary">{u.updateType}</span>
                    {u.oldValue && <> {u.oldValue} → <strong>{u.newValue}</strong></>}</div>
                  {u.remark && <div className="text-muted">“{u.remark}”</div>}
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>{fmtDate(u.createdAt)}</div>
                </div>
              ))}
          </Card>
        </div>
      </div>

      {selectedTs && (
        <Modal
          title={`Timesheet Details · ${selectedTs.code || selectedTs.id}`}
          onClose={() => setSelectedTs(null)}
          size="md"
          footer={<button className="btn btn-secondary" onClick={() => setSelectedTs(null)}>Close</button>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Employee</div>
              <strong style={{ fontSize: '0.92rem' }}>{selectedTs.employeeName || '—'}</strong>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Status</div>
              <StatusBadge status={selectedTs.status || 'Submitted'} />
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Work Date</div>
              <strong>{fmtDate(selectedTs.workDate)}</strong>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Logged Hours</div>
              <strong>{selectedTs.totalHours}h <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>({selectedTs.fromTime} – {selectedTs.toTime})</span></strong>
            </div>
            {selectedTs.createdAt && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Updated / Logged At</div>
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>{fmtDate(selectedTs.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Highlighted Remarks */}
          <div style={{
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            borderRadius: 8,
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#059669',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <i className="ph ph-chat-text" style={{ fontSize: '0.9rem' }}></i>
              Employee Remarks
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {selectedTs.remarks ? selectedTs.remarks : <span className="text-muted" style={{ fontStyle: 'italic' }}>No remarks provided by employee.</span>}
            </p>
          </div>

          {/* Images if any */}
          {selectedTs.images && selectedTs.images.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Screen / Images ({selectedTs.images.length})</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedTs.images.map((im) => (
                  <a key={im.id} href={assetUrl(im.url)} target="_blank" rel="noreferrer">
                    <img src={assetUrl(im.url)} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Files if any */}
          {selectedTs.files && selectedTs.files.length > 0 && (
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Attachments ({selectedTs.files.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedTs.files.map((fl) => (
                  <a key={fl.id} href={assetUrl(fl.url)} target="_blank" rel="noreferrer" download
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.82rem', textDecoration: 'none', color: '#0f172a', background: '#f8fafc' }}>
                    <i className="ph ph-file" style={{ color: '#059669' }}></i>
                    <span style={{ flex: 1 }}>{fl.originalName || fl.filename}</span>
                    <i className="ph ph-download-simple" style={{ color: '#64748b' }}></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default function Tasks({ navigate, navParams }) {
  const { user } = useAuth();
  const canManage = user.role !== 'Worker';
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('All');
  const [priorityF, setPriorityF] = useState('All');
  const [categoryF, setCategoryF] = useState('All');
  const [categories, setCategories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailId, setDetailId] = useState(navParams?.taskId || null);
  const [confirmDel, setConfirmDel] = useState(null);
  const { sorted, sort, toggle } = useSortable(tasks);
  const catOf = (key) => categories.find((c) => c.key === (key || 'general'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tl, pl, emp, cats] = await Promise.all([
        api.get(`/tasks?search=${encodeURIComponent(search)}&status=${statusF}&priority=${priorityF}&category=${categoryF}`),
        api.get('/projects'),
        canManage ? api.get('/employees') : Promise.resolve([]),
        api.get('/categories'),
      ]);
      setTasks(tl); setProjects(pl); setEmployees(emp); setCategories(cats);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search, statusF, priorityF, categoryF, canManage]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const doDelete = async () => {
    try { await api.del(`/tasks/${confirmDel.id}`); toast.success('Task deleted'); setConfirmDel(null); load(); }
    catch (e) { toast.error(e.message); }
  };
  const markComplete = async (t) => {
    try { await api.put(`/tasks/${t.id}`, { status: 'Completed', progress: 100 }); toast.success('Marked complete'); load(); }
    catch (e) { toast.error(e.message); }
  };

  if (detailId) return <TaskDetail id={detailId} projects={projects} employees={employees} categories={categories}
    onBack={() => { setDetailId(null); load(); }} onChanged={load} />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search tasks…" />
        <select className="form-control" style={{ width: 150 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" style={{ width: 140 }} value={priorityF} onChange={(e) => setPriorityF(e.target.value)}>
          <option value="All">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="form-control" style={{ width: 180 }} value={categoryF} onChange={(e) => setCategoryF(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <ExportButton path={`/exports/tasks?status=${statusF}`} filename="Task_Report.xlsx" />
        {canManage && <button className="btn btn-primary" onClick={() => setCreating(true)}><i className="ph ph-plus"></i> Create Task</button>}
      </div>

      {loading ? <Spinner /> : tasks.length === 0 ? (
        <EmptyState icon="ph-check-square" title="No tasks found"
          message={search || statusF !== 'All' ? 'Try adjusting filters.' : 'No tasks yet.'}
          action={canManage && !search ? <button className="btn btn-primary" onClick={() => setCreating(true)}>Create Task</button> : null} />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <th>Task ID</th>
                <SortHeader label="Task Name" sortKey="name" sort={sort} onToggle={toggle} />
                <SortHeader label="Project" sortKey="projectName" sort={sort} onToggle={toggle} />
                <SortHeader label="Due Date" sortKey="endDate" sort={sort} onToggle={toggle} />
                <SortHeader label="Priority" sortKey="priority" sort={sort} onToggle={toggle} />
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, idx) => {
                const eff = effectiveStatus(t);
                const c = catOf(t.category);
                const done = c ? c.doneStatuses.includes(t.status) : ['Completed', 'Closed'].includes(t.status);
                return (
                  <tr key={t.id} className="clickable-row" onClick={() => setDetailId(t.id)}>
                    <td className="text-muted">{idx + 1}</td>
                    <td style={{ fontSize: '0.8rem' }}>{t.code || t.id}</td>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.projectName || '—'}</td>
                    <td><DateCell date={t.endDate} overdue={eff === 'Overdue'} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={statusBucket(eff, t.status)} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <RowActions actions={[
                        { icon: 'ph-check', title: 'Mark complete', tone: 'success', show: canManage && !done, onClick: () => markComplete(t) },
                        { icon: 'ph-eye', title: 'View', tone: 'primary', onClick: () => setDetailId(t.id) },
                        { icon: 'ph-pencil-simple', title: 'Edit', tone: 'warning', show: canManage, onClick: () => setEditTask(t) },
                        { icon: 'ph-trash', title: 'Delete', tone: 'danger', show: canManage, onClick: () => setConfirmDel(t) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editTask) && <TaskForm task={editTask} projects={projects} employees={employees} categories={categories}
        onClose={() => { setCreating(false); setEditTask(null); }} onSaved={() => { setCreating(false); setEditTask(null); load(); }} />}
      {confirmDel && <ConfirmDialog title="Delete Task" message={`Delete "${confirmDel.name}"? This cannot be undone.`}
        confirmLabel="Delete" onClose={() => setConfirmDel(null)} onConfirm={doDelete} />}
    </div>
  );
}
