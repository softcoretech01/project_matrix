import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Card, toast } from './ui';

// Visual meta per link type
const TYPE_META = {
  github: { icon: 'ph-github-logo', color: '#24292f', label: 'GitHub' },
  figma: { icon: 'ph-figma-logo', color: '#a259ff', label: 'Figma' },
  drive: { icon: 'ph-google-drive-logo', color: '#1fa463', label: 'Drive' },
  maps: { icon: 'ph-map-pin', color: '#ea4335', label: 'Maps' },
  api: { icon: 'ph-brackets-angle', color: '#0ea5e9', label: 'API' },
  docs: { icon: 'ph-file-text', color: '#6366f1', label: 'Docs' },
  other: { icon: 'ph-link-simple', color: '#64748b', label: 'Link' },
};

export default function LinksPanel({ parentType, parentId, title = 'Links & Resources', compact = false }) {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!parentId) return;
    try { setLinks(await api.get(`/links?parentType=${parentType}&parentId=${encodeURIComponent(parentId)}`)); }
    catch (_) {}
  }, [parentType, parentId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!url.trim()) return toast.error('Enter a URL');
    setBusy(true);
    try {
      await api.post('/links', { parentType, parentId, url: url.trim(), label: label.trim() });
      setUrl(''); setLabel(''); setAdding(false); load();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await api.del(`/links/${id}`); setLinks((p) => p.filter((l) => l.id !== id)); }
    catch (e) { toast.error(e.message); }
  };

  const body = (
    <>
      {links.length === 0 && !adding && (
        <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 8px' }}>No links yet.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {links.map((l) => {
          const m = TYPE_META[l.linkType] || TYPE_META.other;
          return (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', background: `${m.color}18`, color: m.color }}>
                <i className={`ph-fill ${m.icon}`}></i>
              </span>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontSize: '0.85rem',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.url}>
                {l.label || m.label} <span className="text-muted" style={{ fontSize: '0.72rem' }}>· {l.url.replace(/^https?:\/\//, '').slice(0, 28)}</span>
              </a>
              <button className="icon-btn danger" title="Remove" style={{ width: 26, height: 26, minWidth: 26 }}
                onClick={() => remove(l.id)}><i className="ph ph-x"></i></button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input className="form-control" placeholder="https://github.com/… / figma / drive / maps …"
            value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="form-control" placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={add} disabled={busy}>{busy ? 'Adding…' : 'Add Link'}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setUrl(''); setLabel(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>
          <i className="ph ph-link"></i> Add Link
        </button>
      )}
    </>
  );

  if (compact) {
    return (
      <div>
        <div className="form-label" style={{ marginBottom: 8 }}>{title}</div>
        {body}
      </div>
    );
  }
  return <Card title={title}>{body}</Card>;
}
