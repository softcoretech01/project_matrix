// Reusable UI primitives built on the existing index.css design system.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { download } from '../services/api';

// Export-to-Excel button
export function ExportButton({ path, filename, label = 'Export Excel' }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await download(path, filename); }
    catch (e) { toast.error('Export failed: ' + (e.message || e)); }
    finally { setBusy(false); }
  };
  return (
    <button className="btn btn-secondary btn-sm" onClick={go} disabled={busy}>
      <i className="ph ph-file-xls"></i> {busy ? 'Exporting…' : label}
    </button>
  );
}

// --------------------------------------------------------------------------
// Status / priority colour system (spec calendar colour coding)
// --------------------------------------------------------------------------
export const STATUS_COLORS = {
  'To Do': '#64748b',
  'Not Started': '#64748b',
  'In Progress': '#3b82f6',
  'Pending': '#f59e0b',
  'On Hold': '#f59e0b',
  'Completed': '#10b981',
  'Closed': '#10b981',
  'Approved': '#10b981',
  'Submitted': '#3b82f6',
  'Overdue': '#ef4444',
  'Cancelled': '#9ca3af',
  'Review': '#8b5cf6',
  'Active': '#10b981',
  'Inactive': '#64748b',
};

export const PRIORITY_COLORS = {
  Critical: '#dc2626', High: '#ef4444', Medium: '#f59e0b', Low: '#10b981',
};

// Compute the *effective* status for a task (adds Overdue), for colour coding.
export function effectiveStatus(task, today = new Date()) {
  if (!task) return 'To Do';
  const done = ['Completed', 'Closed'].includes(task.status);
  if (!done && task.endDate) {
    const due = new Date(task.endDate + 'T23:59:59');
    if (!isNaN(due) && due < today) return 'Overdue';
  }
  return task.status || 'To Do';
}

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#64748b';
  return (
    <span className="badge" style={{
      background: `${color}22`, color, border: `1px solid ${color}55`,
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {status || '—'}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || '#64748b';
  return (
    <span className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontWeight: 600 }}>
      {priority || '—'}
    </span>
  );
}

// --------------------------------------------------------------------------
// Spinner / Loading
// --------------------------------------------------------------------------
export function Spinner({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '28px', gap: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
      <i className="ph ph-circle-notch spin" style={{ fontSize: '2rem' }}></i>
      <span>{label}</span>
    </div>
  );
}

// --------------------------------------------------------------------------
// Empty state
// --------------------------------------------------------------------------
export function EmptyState({ icon = 'ph-tray', title = 'Nothing here yet', message = '', action = null }) {
  return (
    <div style={{ textAlign: 'center', padding: '26px 20px', color: 'var(--text-secondary, #94a3b8)' }}>
      <i className={`ph ${icon}`} style={{ fontSize: '2.2rem', opacity: 0.5 }}></i>
      <h3 style={{ marginTop: '10px', marginBottom: '4px', fontSize: '1rem' }}>{title}</h3>
      {message && <p style={{ maxWidth: '420px', margin: '0 auto 12px', fontSize: '0.88rem' }}>{message}</p>}
      {action}
    </div>
  );
}

// --------------------------------------------------------------------------
// Modal
// --------------------------------------------------------------------------
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const widths = { sm: '440px', md: '620px', lg: '860px', xl: '1040px' };
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: widths[size] || widths.md, width: '94%' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <i className="ph ph-x"></i>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Confirm',
  danger = true, onConfirm, onClose, loading }) {
  return (
    <Modal title={title} onClose={onClose} size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }>
      <p className="text-secondary">{message}</p>
    </Modal>
  );
}

// --------------------------------------------------------------------------
// Search box
// --------------------------------------------------------------------------
export function SearchBox({ value, onChange, placeholder = 'Search…', width = '260px' }) {
  return (
    <div className="search-input-wrapper" style={{ width }}>
      <i className="ph ph-magnifying-glass"></i>
      <input className="form-control" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// --------------------------------------------------------------------------
// Toast system (module-level dispatch + <Toaster/> listener mounted in App)
// --------------------------------------------------------------------------
export const toast = {
  show: (message, type = 'success') => {
    try { window.dispatchEvent(new CustomEvent('pm:toast', { detail: { message, type, id: Date.now() + Math.random() } })); } catch (_) {}
  },
  success: (m) => toast.show(m, 'success'),
  error: (m) => toast.show(m, 'error'),
  warning: (m) => toast.show(m, 'warning'),
};

export function Toaster() {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((p) => p.filter((t) => t.id !== id)), []);
  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail;
      setItems((p) => [...p, t]);
      setTimeout(() => remove(t.id), 4000);
    };
    window.addEventListener('pm:toast', onToast);
    return () => window.removeEventListener('pm:toast', onToast);
  }, [remove]);

  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning' };
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
      display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i className={`ph ${icons[t.type] || 'ph-info'}`}></i>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => remove(t.id)}><i className="ph ph-x"></i></button>
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Card wrapper
// --------------------------------------------------------------------------
export function Card({ title, actions, children, style }) {
  return (
    <div className="card" style={style}>
      {(title || actions) && (
        <div className="card-header-flex">
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --------------------------------------------------------------------------
// Sortable table helpers
// --------------------------------------------------------------------------
export function useSortable(rows, initialKey = null, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      av = av == null ? '' : av;
      bv = bv == null ? '' : bv;
      const an = parseFloat(av), bn = parseFloat(bv);
      let cmp;
      if (!isNaN(an) && !isNaN(bn) && typeof av !== 'string') cmp = an - bn;
      else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  return { sorted, sort, toggle };
}

export function SortHeader({ label, sortKey, sort, onToggle, style }) {
  const active = sort && sort.key === sortKey;
  const ico = active ? (sort.dir === 'asc' ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up';
  return (
    <th className="sortable" style={style} onClick={() => onToggle(sortKey)}>
      {label}
      <i className={`ph ${ico} sort-ico`} style={{ opacity: active ? 1 : 0.4 }}></i>
    </th>
  );
}

// --------------------------------------------------------------------------
// Circular row actions
// --------------------------------------------------------------------------
// actions: [{ icon, title, tone: 'success'|'primary'|'warning'|'danger', onClick, show }]
export function RowActions({ actions }) {
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {actions.filter((a) => a && a.show !== false).map((a, i) => (
        <button key={i} className={`icon-btn ${a.tone || ''}`} title={a.title} onClick={a.onClick} disabled={a.disabled}>
          <i className={`ph ${a.icon}`}></i>
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Date cell with clock icon + overdue flag
// --------------------------------------------------------------------------
export function DateCell({ date, overdue = false, withTime = false }) {
  if (!date) return <span className="text-muted">—</span>;
  const dt = new Date(date);
  const text = isNaN(dt) ? date : dt.toLocaleString('en-US',
    withTime ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
             : { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <span className={`date-cell ${overdue ? 'is-overdue' : ''}`}>
      <span className="dc-main"><i className="ph ph-clock" style={{ fontSize: '0.85rem' }}></i>{text}</span>
      {overdue && <span className="dc-overdue">Overdue</span>}
    </span>
  );
}
