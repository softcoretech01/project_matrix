import React, { useEffect, useState, useCallback } from 'react';
import { api, assetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Spinner, EmptyState, Modal, ConfirmDialog, SearchBox, StatusBadge, ExportButton, toast, fmtDate,
  SortHeader, RowActions, DateCell, useSortable,
} from '../components/ui';
import TimesheetForm from '../components/TimesheetForm';
import LinksPanel from '../components/LinksPanel';

function TimesheetDetail({ ts, canReview, onClose, onChanged }) {
  const setStatus = async (status) => {
    try { await api.put(`/timesheets/${ts.id}/status`, { status }); toast.success(`Timesheet ${status.toLowerCase()}`); onChanged(); onClose(); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <Modal title={`Timesheet ${ts.id}`} onClose={onClose} size="lg"
      footer={canReview && ts.status !== 'Approved' ? (
        <>
          <button className="btn btn-danger" onClick={() => setStatus('Rejected')}>Reject</button>
          <button className="btn btn-success" onClick={() => setStatus('Approved')}>Approve</button>
        </>
      ) : <button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        {[['Employee', ts.employeeName], ['Date', fmtDate(ts.workDate)], ['Status', null],
          ['Project', ts.projectName || ts.projectId], ['Task', ts.taskName || ts.taskId],
          ['Hours', `${ts.totalHours}h (${ts.fromTime}–${ts.toTime})`]].map(([k, v]) => (
          <div key={k}><div className="text-secondary" style={{ fontSize: '0.78rem' }}>{k}</div>
            {v === null ? <StatusBadge status={ts.status} /> : <strong>{v}</strong>}</div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="text-secondary" style={{ fontSize: '0.78rem' }}>Remarks</div>
        <p style={{ whiteSpace: 'pre-wrap' }}>{ts.remarks || '—'}</p>
      </div>
      {ts.images && ts.images.length > 0 && (
        <div>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginBottom: 6 }}>Images ({ts.images.length})</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ts.images.map((im) => (
              <a key={im.id} href={assetUrl(im.url)} target="_blank" rel="noreferrer">
                <img src={assetUrl(im.url)} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border,#334155)' }} />
              </a>
            ))}
          </div>
        </div>
      )}
      {ts.files && ts.files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="text-secondary" style={{ fontSize: '0.78rem', marginBottom: 6 }}>Files ({ts.files.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ts.files.map((fl) => {
              const ext = (fl.originalName || fl.filename || '').split('.').pop().toLowerCase();
              const icon = ['xlsx', 'xls', 'csv'].includes(ext) ? 'ph-file-xls'
                : ext === 'pdf' ? 'ph-file-pdf'
                : ['doc', 'docx'].includes(ext) ? 'ph-file-doc' : 'ph-file-text';
              return (
                <a key={fl.id} href={assetUrl(fl.url)} target="_blank" rel="noreferrer" download
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none' }}>
                  <i className={`ph ${icon}`} style={{ color: '#059669', fontSize: '1.1rem' }}></i>
                  <span style={{ flex: 1, color: 'var(--text,#0f172a)' }}>{fl.originalName || fl.filename}</span>
                  <i className="ph ph-download-simple" style={{ color: '#64748b' }}></i>
                </a>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color,#e2e8f0)' }}>
        <LinksPanel parentType="timesheet" parentId={ts.id} compact />
      </div>
    </Modal>
  );
}

export default function Timesheets() {
  const { user } = useAuth();
  const canReview = user.role === 'Admin' || user.role === 'Master';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('All');
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await api.get(`/timesheets?search=${encodeURIComponent(search)}`)); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const shown = statusF === 'All' ? list : list.filter((t) => t.status === statusF);
  const { sorted, sort, toggle } = useSortable(shown);
  const openDetail = async (id) => {
    try { setDetail(await api.get(`/timesheets/${id}`)); } catch (e) { toast.error(e.message); }
  };
  const approve = async (id, status) => {
    try { await api.put(`/timesheets/${id}/status`, { status }); toast.success(`Timesheet ${status.toLowerCase()}`); load(); }
    catch (e) { toast.error(e.message); }
  };
  const remove = async (id) => {
    try { await api.del(`/timesheets/${id}`); toast.success('Timesheet deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search timesheets…" />
        <select className="form-control" style={{ width: 160 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option><option>Submitted</option><option>Approved</option><option>Rejected</option>
        </select>
        <div style={{ flex: 1 }} />
        <ExportButton path="/exports/timesheets" filename="Timesheet_Report.xlsx" />
        <button className="btn btn-primary" onClick={() => setCreating(true)}><i className="ph ph-plus"></i> New Timesheet</button>
      </div>

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState icon="ph-clock" title="No timesheets" message="Log your work hours with a new timesheet."
          action={<button className="btn btn-primary" onClick={() => setCreating(true)}>New Timesheet</button>} />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <SortHeader label="Date" sortKey="workDate" sort={sort} onToggle={toggle} />
                <SortHeader label="Employee" sortKey="employeeName" sort={sort} onToggle={toggle} />
                <SortHeader label="Project" sortKey="projectName" sort={sort} onToggle={toggle} />
                <SortHeader label="Task" sortKey="taskName" sort={sort} onToggle={toggle} />
                <th>From</th><th>To</th>
                <SortHeader label="Hours" sortKey="totalHours" sort={sort} onToggle={toggle} />
                <th>Images</th>
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, idx) => (
                <tr key={t.id} className="clickable-row" onClick={() => openDetail(t.id)}>
                  <td className="text-muted">{idx + 1}</td>
                  <td><DateCell date={t.workDate} /></td>
                  <td>{t.employeeName}</td>
                  <td>{t.projectName || t.projectId || '—'}</td>
                  <td>{t.taskName || t.taskId || '—'}</td>
                  <td>{t.fromTime}</td>
                  <td>{t.toTime}</td>
                  <td><strong>{t.totalHours}h</strong></td>
                  <td>{t.images ? t.images.length : 0} <i className="ph ph-image"></i></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
                      { icon: 'ph-check', title: 'Approve', tone: 'success', show: canReview && t.status !== 'Approved', onClick: () => approve(t.id, 'Approved') },
                      { icon: 'ph-eye', title: 'View', tone: 'primary', onClick: () => openDetail(t.id) },
                      { icon: 'ph-trash', title: 'Delete', tone: 'danger', onClick: () => remove(t.id) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <TimesheetForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {detail && <TimesheetDetail ts={detail} canReview={canReview} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}
