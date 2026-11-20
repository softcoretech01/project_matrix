import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Spinner, EmptyState, Modal, ConfirmDialog, SearchBox, StatusBadge, PriorityBadge, ExportButton, toast, fmtDate,
  SortHeader, RowActions, useSortable,
} from '../components/ui';

const ROLES = ['Worker', 'Master', 'Admin'];

const DONE = new Set(['Done', 'Completed', 'Closed']);

// Detail panel: everything assigned to one employee, grouped by project.
function EmployeeDetail({ emp, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/tasks?assignedTo=${encodeURIComponent(emp.id)}`);
        if (alive) setTasks(Array.isArray(data) ? data : []);
      } catch (e) { toast.error(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [emp.id]);

  // Group tasks by project
  const groups = {};
  tasks.forEach((t) => {
    const key = t.projectId || '_none';
    if (!groups[key]) groups[key] = { name: t.projectName || 'No project', tasks: [] };
    groups[key].tasks.push(t);
  });
  const projects = Object.values(groups);
  const open = tasks.filter((t) => !DONE.has(t.status)).length;
  const done = tasks.length - open;

  return (
    <Modal title={`${emp.name} — Assigned Work`} onClose={onClose} size="lg"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, fontSize: '0.85rem' }}>
        <span className="badge" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>{emp.role}</span>
        {emp.designation && <span className="text-secondary">{emp.designation}</span>}
        {emp.department && <span className="text-secondary">· {emp.department}</span>}
        <div style={{ flex: 1 }} />
        <span className="text-secondary">Projects: <strong>{projects.length}</strong></span>
        <span className="text-secondary">Tasks: <strong>{tasks.length}</strong></span>
        <span className="text-secondary">Open: <strong>{open}</strong></span>
        <span className="text-secondary">Done: <strong>{done}</strong></span>
      </div>

      {loading ? <Spinner /> : tasks.length === 0 ? (
        <EmptyState icon="ph-briefcase" title="No work assigned"
          message={`${emp.name} has no tasks or projects assigned yet.`} />
      ) : (
        projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <i className="ph ph-folder-simple" style={{ color: '#059669' }}></i>
              <strong>{p.name}</strong>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>({p.tasks.length} task{p.tasks.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="table-responsive" style={{ border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10 }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Task</th><th>Priority</th><th>Status</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {p.tasks.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="text-secondary">{t.endDate ? fmtDate(t.endDate) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}

function EmployeeForm({ emp, currentUser, onClose, onSaved }) {
  const editing = !!emp;
  const [f, setF] = useState(emp || {
    name: '', email: '', password: '', role: 'Worker', designation: '', department: 'Engineering', phone: '', status: 'Active',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // Only Admin can create/assign Admin or Master
  const availableRoles = currentUser.role === 'Admin' ? ROLES : ['Worker'];

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Name is required');
    if (!editing && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return toast.error('Valid email required');
    setBusy(true);
    try {
      const payload = { ...f };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.put(`/employees/${emp.id}`, payload);
      else await api.post('/employees', payload);
      toast.success(`Employee ${editing ? 'updated' : 'added'}`);
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={editing ? 'Edit Employee' : 'Add Employee'} onClose={onClose} size="md"
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-control" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{editing ? 'Reset Password (optional)' : 'Password'}</label>
            <input type="password" className="form-control" value={f.password || ''}
              placeholder={editing ? 'Leave blank to keep' : 'Default: worker123'} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={f.role} onChange={(e) => set('role', e.target.value)}>
              {availableRoles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-control" value={f.designation} onChange={(e) => set('designation', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-control" value={f.department} onChange={(e) => set('department', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={f.status} onChange={(e) => set('status', e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user.role === 'Admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('All');
  const [editing, setEditing] = useState(null);     // emp object or {} for new
  const [viewing, setViewing] = useState(null);     // emp whose work we're viewing
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await api.get(`/employees?search=${encodeURIComponent(search)}`)); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const shown = roleF === 'All' ? list : list.filter((u) => u.role === roleF);
  const { sorted, sort, toggle } = useSortable(shown);

  const doDelete = async () => {
    try { await api.del(`/employees/${confirmDel.id}`); toast.success('Employee deleted'); setConfirmDel(null); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search employees…" />
        <select className="form-control" style={{ width: 150 }} value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="All">All Roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <ExportButton path="/exports/employees" filename="Employee_Report.xlsx" />
        <button className="btn btn-primary" onClick={() => setEditing({})}><i className="ph ph-user-plus"></i> Add Employee</button>
      </div>

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState icon="ph-users" title="No employees found" />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <th>Code</th>
                <SortHeader label="Name" sortKey="name" sort={sort} onToggle={toggle} />
                <SortHeader label="Email" sortKey="email" sort={sort} onToggle={toggle} />
                <SortHeader label="Role" sortKey="role" sort={sort} onToggle={toggle} />
                <SortHeader label="Designation" sortKey="designation" sort={sort} onToggle={toggle} />
                <SortHeader label="Department" sortKey="department" sort={sort} onToggle={toggle} />
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, idx) => (
                <tr key={u.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td style={{ fontSize: '0.8rem' }}>{u.code}</td>
                  <td>
                    <button type="button" className="link-btn" title="View assigned projects & tasks"
                      onClick={() => setViewing(u)}
                      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--primary,#059669)', fontWeight: 600 }}>
                      {u.name}
                    </button>
                  </td>
                  <td>{u.email}</td>
                  <td><span className="badge" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>{u.role}</span></td>
                  <td>{u.designation || '—'}</td>
                  <td>{u.department || '—'}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
                      { icon: 'ph-eye', title: 'View work', tone: 'primary', onClick: () => setViewing(u) },
                      { icon: 'ph-pencil-simple', title: 'Edit', tone: 'warning', onClick: () => setEditing(u) },
                      { icon: 'ph-trash', title: 'Delete', tone: 'danger', show: isAdmin && u.id !== user.id, onClick: () => setConfirmDel(u) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <EmployeeDetail emp={viewing} onClose={() => setViewing(null)} />}
      {editing && <EmployeeForm emp={editing.id ? editing : null} currentUser={user}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {confirmDel && <ConfirmDialog title="Delete Employee" message={`Delete "${confirmDel.name}"? This cannot be undone.`}
        confirmLabel="Delete" onClose={() => setConfirmDel(null)} onConfirm={doDelete} />}
    </div>
  );
}
