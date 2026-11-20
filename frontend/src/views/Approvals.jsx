import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Spinner, EmptyState, Modal, StatusBadge, RowActions, SortHeader, DateCell, useSortable, toast,
} from '../components/ui';

export default function Approvals() {
  const { user } = useAuth();
  const canDecide = user.role === 'Admin';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('Pending');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const { sorted, sort, toggle } = useSortable(rows);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.get(`/profile/change-requests?status=${statusF}`)); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusF]);
  useEffect(() => { load(); }, [load]);

  const approve = async (r) => {
    try { await api.put(`/profile/change-requests/${r.id}/approve`); toast.success('Change approved & applied'); load(); }
    catch (e) { toast.error(e.message); }
  };
  const doReject = async () => {
    try { await api.put(`/profile/change-requests/${rejecting.id}/reject`, { reason }); toast.success('Change rejected'); setRejecting(null); setReason(''); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Profile Change Approvals</h3>
        <div style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 160 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="All">All</option><option>Pending</option><option>Approved</option><option>Rejected</option>
        </select>
      </div>

      {loading ? <Spinner /> : sorted.length === 0 ? (
        <EmptyState icon="ph-check-circle" title="No requests" message="Employee email / phone change requests appear here for review." />
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>S.NO</th>
                <SortHeader label="Employee" sortKey="employeeName" sort={sort} onToggle={toggle} />
                <SortHeader label="Field" sortKey="field" sort={sort} onToggle={toggle} />
                <th>Current Value</th>
                <th>Requested Value</th>
                <SortHeader label="Requested" sortKey="requestedAt" sort={sort} onToggle={toggle} />
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <th>Reason</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={r.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td><strong>{r.employeeName}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{r.field}</td>
                  <td className="text-secondary">{r.oldValue || '—'}</td>
                  <td><strong>{r.newValue}</strong></td>
                  <td><DateCell date={r.requestedAt} withTime /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-secondary" style={{ maxWidth: 180, fontSize: '0.82rem' }}>{r.reason || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <RowActions actions={[
                      { icon: 'ph-check', title: 'Approve', tone: 'success', show: canDecide && r.status === 'Pending', onClick: () => approve(r) },
                      { icon: 'ph-x', title: 'Reject', tone: 'danger', show: canDecide && r.status === 'Pending', onClick: () => { setRejecting(r); setReason(''); } },
                    ]} />
                    {r.status !== 'Pending' && <span className="text-muted" style={{ fontSize: '0.78rem' }}>Reviewed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejecting && (
        <Modal title="Reject Change Request" onClose={() => setRejecting(null)} size="sm"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={doReject}>Reject</button>
          </>}>
          <p className="text-secondary" style={{ marginBottom: 10 }}>
            Rejecting <strong>{rejecting.employeeName}</strong>'s request to change {rejecting.field} to
            <strong> {rejecting.newValue}</strong>.
          </p>
          <div className="form-group">
            <label className="form-label">Reason (shown to the employee)</label>
            <textarea className="form-control" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Please verify with HR first" />
          </div>
        </Modal>
      )}
    </div>
  );
}
