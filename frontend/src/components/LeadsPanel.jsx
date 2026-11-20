import React, { useEffect, useState, useCallback } from 'react';
import { api, download } from '../services/api';
import { Card, EmptyState, StatusBadge, toast } from './ui';

const LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];
const PER_PAGE = 10;

export default function LeadsPanel({ taskId, canEdit = true }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setLeads(await api.get(`/leads?taskId=${taskId}`)); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [taskId]);
  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { toast.error('Please choose an .xlsx file'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.upload(`/leads/upload?taskId=${taskId}`, fd);
      toast.success(`Imported ${res.imported} lead(s)${res.skipped ? `, skipped ${res.skipped}` : ''}`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const setStatus = async (id, status) => {
    try { await api.put(`/leads/${id}/status`, { status }); setLeads((p) => p.map((l) => l.id === id ? { ...l, status } : l)); }
    catch (e) { toast.error(e.message); }
  };
  const remove = async (id) => {
    try { await api.del(`/leads/${id}`); setLeads((p) => p.filter((l) => l.id !== id)); }
    catch (e) { toast.error(e.message); }
  };

  const summary = LEAD_STATUSES.reduce((a, s) => ({ ...a, [s]: leads.filter((l) => l.status === s).length }), {});

  const pageCount = Math.max(1, Math.ceil(leads.length / PER_PAGE));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);
  const start = (page - 1) * PER_PAGE;
  const pageLeads = leads.slice(start, start + PER_PAGE);

  return (
    <Card title={<span><i className="ph ph-users-three" style={{ marginRight: 6 }}></i>Lead Contacts ({leads.length})</span>}
      actions={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => download('/leads/template', 'Leads_Template.xlsx')}>
            <i className="ph ph-download-simple"></i> Template
          </button>
          {leads.length > 0 && (
            <button className="btn btn-sm btn-secondary" onClick={() => download(`/leads/export?taskId=${taskId}`, 'Leads.xlsx')}>
              <i className="ph ph-file-xls"></i> Export
            </button>
          )}
          {canEdit && (
            <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
              <i className="ph ph-upload-simple"></i> {uploading ? 'Importing…' : 'Upload Excel'}
              <input type="file" hidden accept=".xlsx" onChange={upload} disabled={uploading} />
            </label>
          )}
        </div>
      }>
      {leads.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.8rem' }}>
          {LEAD_STATUSES.map((s) => <span key={s} className="text-secondary">{s}: <strong>{summary[s]}</strong></span>)}
        </div>
      )}

      {loading ? null : leads.length === 0 ? (
        <EmptyState icon="ph-table" title="No leads yet"
          message="Upload an Excel sheet of lead contacts (Name, Email, Phone, Company, Status, Source, Notes). Download the template to get the format." />
      ) : (
        <div className="table-responsive" style={{ border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10 }}>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th>Status</th>{canEdit && <th></th>}</tr>
            </thead>
            <tbody>
              {pageLeads.map((l, i) => (
                <tr key={l.id}>
                  <td className="text-muted">{start + i + 1}</td>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.company || '—'}</td>
                  <td>{l.phone || '—'}</td>
                  <td>{l.email || '—'}</td>
                  <td>
                    {canEdit ? (
                      <select className="form-control" style={{ height: 32, padding: '2px 28px 2px 8px', width: 130 }}
                        value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}>
                        {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : <StatusBadge status={l.status} />}
                  </td>
                  {canEdit && (
                    <td style={{ textAlign: 'center' }}>
                      <button className="icon-btn danger" title="Remove" style={{ width: 30, height: 30, minWidth: 30 }}
                        onClick={() => remove(l.id)}><i className="ph ph-trash"></i></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length > PER_PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: '0.85rem' }}>
          <span className="text-secondary">
            Showing {start + 1}–{Math.min(start + PER_PAGE, leads.length)} of {leads.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <i className="ph ph-caret-left"></i> Prev
            </button>
            <span className="text-secondary">Page <strong>{page}</strong> / {pageCount}</span>
            <button className="btn btn-sm btn-secondary" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              Next <i className="ph ph-caret-right"></i>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
