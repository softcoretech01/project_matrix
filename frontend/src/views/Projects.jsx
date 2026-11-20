import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LinksPanel from '../components/LinksPanel';
import {
  Spinner, Card, EmptyState, Modal, ConfirmDialog, SearchBox, StatusBadge, PriorityBadge,
  ExportButton, toast, fmtDate, SortHeader, RowActions, DateCell, useSortable,
} from '../components/ui';

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function Progress({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border,#334155)' }}>
        <div style={{ width: `${value || 0}%`, height: '100%', borderRadius: 4,
          background: value >= 100 ? '#10b981' : '#6366f1' }}></div>
      </div>
      <span className="text-secondary" style={{ fontSize: '0.78rem', width: 34 }}>{value || 0}%</span>
    </div>
  );
}

function ProjectForm({ project, employees, onClose, onSaved }) {
  const { user } = useAuth();
  const editing = !!project;
  const [f, setF] = useState(project || {
    name: '', code: '', description: '', ownerId: user?.id || '', priority: 'Medium',
    status: 'Not Started', progress: 0, startDate: '', endDate: '', reviewRequired: true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const ownerDisplayName = editing
    ? (project.ownerName || employees.find((e) => e.id === f.ownerId)?.name || user?.name || '—')
    : (user?.name || employees.find((e) => e.id === f.ownerId)?.name || '—');

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Project name is required');
    setBusy(true);
    try {
      const payload = {
        ...f,
        ownerId: editing ? f.ownerId : (user?.id || f.ownerId),
      };
      if (editing) await api.put(`/projects/${project.id}`, payload);
      else await api.post('/projects', payload);
      toast.success(`Project ${editing ? 'updated' : 'created'}`);
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={editing ? 'Edit Project' : 'New Project'} onClose={onClose} size="lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save Project'}</button>
      </>}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Project Name *</label>
          <input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Owner</label>
            <input
              type="text"
              className="form-control"
              value={ownerDisplayName}
              disabled
              readOnly
              style={{ cursor: 'not-allowed', opacity: 0.85 }}
              title="Project owner is permanently set to the creator"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Status</label>
            <select className="form-control" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" className="form-control" value={f.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input type="date" className="form-control" value={f.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ProjectDetail({ id, employees, canManage, onBack, onChanged, navigate }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addMember, setAddMember] = useState(false);
  const [memberId, setMemberId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setP(await api.get(`/projects/${id}`)); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!p) return <EmptyState icon="ph-folder" title="Project not found" />;

  const saveMember = async () => {
    if (!memberId) return;
    try { await api.post(`/projects/${id}/members`, { employeeId: memberId }); setAddMember(false); setMemberId(''); load(); toast.success('Member added'); }
    catch (e) { toast.error(e.message); }
  };
  const removeMember = async (mid) => {
    try { await api.del(`/projects/${id}/members/${mid}`); load(); } catch (e) { toast.error(e.message); }
  };
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { await api.upload(`/projects/${id}/attachments`, fd); toast.success('File uploaded'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}><i className="ph ph-arrow-left"></i> Back to Projects</button>
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}><i className="ph ph-pencil"></i> Edit</button>}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{p.code}</div>
            <h2 style={{ margin: '4px 0' }}>{p.name}</h2>
            <p className="text-secondary" style={{ maxWidth: 640 }}>{p.description || 'No description.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <PriorityBadge priority={p.priority} /><StatusBadge status={p.status} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 16 }}>
          <div><div className="text-secondary" style={{ fontSize: '0.78rem' }}>Owner</div><strong>{p.ownerName || '—'}</strong></div>
          <div><div className="text-secondary" style={{ fontSize: '0.78rem' }}>Start</div><strong>{fmtDate(p.startDate)}</strong></div>
          <div><div className="text-secondary" style={{ fontSize: '0.78rem' }}>Due</div><strong>{fmtDate(p.endDate)}</strong></div>
          <div><div className="text-secondary" style={{ fontSize: '0.78rem' }}>Tasks</div><strong>{p.completedTasksCount}/{p.tasksCount} done</strong></div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title={`Tasks (${p.tasks.length})`}>
          {p.tasks.length === 0 ? <EmptyState icon="ph-check-square" title="No tasks" /> : (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Task</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {p.tasks.map((t) => (
                    <tr key={t.id} className="clickable-row" onClick={() => navigate('tasks', { taskId: t.id })}>
                      <td>{t.name}</td><td>{t.assignedToName || '—'}</td><td>{fmtDate(t.endDate)}</td>
                      <td><PriorityBadge priority={t.priority} /></td><td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title={<span>Members ({p.members.length})</span>}
            actions={canManage && <button className="btn btn-sm btn-secondary" onClick={() => setAddMember(true)}><i className="ph ph-plus"></i></button>}>
            {p.members.length === 0 ? <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No members yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.members.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{m.employeeName} <span className="text-muted" style={{ fontSize: '0.75rem' }}>({m.role})</span></span>
                    {canManage && <button className="btn btn-sm" onClick={() => removeMember(m.id)} style={{ color: '#ef4444' }}><i className="ph ph-x"></i></button>}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title={`Attachments (${p.attachments.length})`}>
            {p.attachments.map((a) => (
              <a key={a.id} href={api.base.replace('/api', '') + a.url} target="_blank" rel="noreferrer"
                style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6 }}>
                <i className="ph ph-paperclip"></i> {a.filename}
              </a>
            ))}
            {canManage && (
              <label className="btn btn-sm btn-secondary" style={{ marginTop: 8, cursor: 'pointer' }}>
                <i className="ph ph-upload"></i> Upload
                <input type="file" hidden onChange={uploadFile} />
              </label>
            )}
          </Card>
          <LinksPanel parentType="project" parentId={p.id} />
        </div>
      </div>

      {editing && <ProjectForm project={p} employees={employees}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); onChanged && onChanged(); }} />}
      {addMember && (
        <Modal title="Add Member" onClose={() => setAddMember(false)} size="sm"
          footer={<><button className="btn btn-secondary" onClick={() => setAddMember(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveMember}>Add</button></>}>
          <select className="form-control" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">— Select employee —</option>
            {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Modal>
      )}
    </div>
  );
}

export default function Projects({ navigate, navParams }) {
  const { user } = useAuth();
  const canManage = user.role === 'Admin' || user.role === 'Master';
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('All');
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(navParams?.projectId || null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pl, emp] = await Promise.all([
        api.get(`/projects?search=${encodeURIComponent(search)}&status=${statusF}`),
        canManage ? api.get('/employees') : Promise.resolve([]),
      ]);
      setProjects(pl); setEmployees(emp);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search, statusF, canManage]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const { sorted, sort, toggle } = useSortable(projects);
  const [editProject, setEditProject] = useState(null);

  const doDelete = async (force = false) => {
    setDelLoading(true);
    try {
      await api.del(`/projects/${confirmDel.id}${force ? '?force=true' : ''}`);
      toast.success('Project deleted'); setConfirmDel(null); load();
    } catch (e) {
      if (e.status === 409) { setConfirmDel({ ...confirmDel, needsForce: true, msg: e.message }); }
      else toast.error(e.message);
    } finally { setDelLoading(false); }
  };

  if (detailId) {
    return <ProjectDetail id={detailId} employees={employees} canManage={canManage}
      onBack={() => setDetailId(null)} onChanged={load} navigate={navigate} />;
  }

  return (
    <div>
      <div className="page-actions-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search projects…" />
        <select className="form-control" style={{ width: 170 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {canManage && <ExportButton path="/exports/projects" filename="Projects_Report.xlsx" />}
        {canManage && <button className="btn btn-primary" onClick={() => setCreating(true)}><i className="ph ph-plus"></i> New Project</button>}
      </div>

      {loading ? <Spinner /> : projects.length === 0 ? (
        <EmptyState icon="ph-folder-open" title="No projects found"
          message={search || statusF !== 'All' ? 'Try adjusting your search or filter.' : 'Create your first project to get started.'}
          action={canManage && !search ? <button className="btn btn-primary" onClick={() => setCreating(true)}>New Project</button> : null} />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <SortHeader label="Project" sortKey="name" sort={sort} onToggle={toggle} />
                <SortHeader label="Owner" sortKey="ownerName" sort={sort} onToggle={toggle} />
                <SortHeader label="Priority" sortKey="priority" sort={sort} onToggle={toggle} />
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <th>Tasks</th>
                <SortHeader label="Due Date" sortKey="endDate" sort={sort} onToggle={toggle} />
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <tr key={p.id} className="clickable-row" onClick={() => setDetailId(p.id)}>
                  <td className="text-muted">{idx + 1}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.ownerName || '—'}</td>
                  <td><PriorityBadge priority={p.priority} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.completedTasksCount}/{p.tasksCount}</td>
                  <td><DateCell date={p.endDate} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
                      { icon: 'ph-eye', title: 'View', tone: 'primary', onClick: () => setDetailId(p.id) },
                      { icon: 'ph-pencil-simple', title: 'Edit', tone: 'warning', show: canManage, onClick: () => setEditProject(p) },
                      { icon: 'ph-trash', title: 'Delete', tone: 'danger', show: canManage, onClick: () => setConfirmDel(p) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editProject) && <ProjectForm project={editProject} employees={employees}
        onClose={() => { setCreating(false); setEditProject(null); }}
        onSaved={() => { setCreating(false); setEditProject(null); load(); }} />}
      {confirmDel && (
        <ConfirmDialog
          title="Delete Project"
          message={confirmDel.needsForce ? confirmDel.msg : `Delete "${confirmDel.name}"? This cannot be undone.`}
          confirmLabel={confirmDel.needsForce ? 'Delete Anyway' : 'Delete'}
          loading={delLoading}
          onClose={() => setConfirmDel(null)}
          onConfirm={() => doDelete(confirmDel.needsForce)} />
      )}
    </div>
  );
}
