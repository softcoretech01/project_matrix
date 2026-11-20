import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Spinner, EmptyState, Modal, ConfirmDialog, SearchBox, StatusBadge, ExportButton, toast, fmtDate,
  SortHeader, RowActions, useSortable,
} from '../components/ui';

const ROLES = ['Worker', 'Master', 'Admin'];

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
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="badge" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>{u.role}</span></td>
                  <td>{u.designation || '—'}</td>
                  <td>{u.department || '—'}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
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

      {editing && <EmployeeForm emp={editing.id ? editing : null} currentUser={user}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {confirmDel && <ConfirmDialog title="Delete Employee" message={`Delete "${confirmDel.name}"? This cannot be undone.`}
        confirmLabel="Delete" onClose={() => setConfirmDel(null)} onConfirm={doDelete} />}
    </div>
  );
}
