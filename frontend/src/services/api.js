// Centralized, authenticated API client for the whole frontend.
// All views import { api } from '../services/api' instead of calling fetch directly.

// In production the app is served by the backend, so use a relative /api base
// (same origin). In dev (Vite on :5173) talk to the backend on :5001.
const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  (import.meta.env && import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

// Asset base = API base without the trailing /api (for /uploads/... image URLs)
export const ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');
export const API_BASE_URL = API_BASE;

const TOKEN_KEY = 'projectmatrix_token';

let authToken = null;
try {
  authToken = localStorage.getItem(TOKEN_KEY) || null;
} catch (_) {
  authToken = null;
}

export function setToken(token) {
  authToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {
    /* ignore storage errors (private mode) */
  }
}

export function getToken() {
  return authToken;
}

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function authHeaders(extra = {}) {
  const h = { ...extra };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

async function parse(resp) {
  const text = await resp.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      // token invalid/expired → notify the app to log out
      try { window.dispatchEvent(new CustomEvent('pm:unauthorized')); } catch (_) {}
    }
    const detail = (data && (data.detail || data.message)) || resp.statusText || 'Request failed';
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function request(method, path, body) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parse(resp);
}

// Build a query string from an object (skips null/undefined/'')
export function qs(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const api = {
  base: API_BASE,
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  del: (path) => request('DELETE', path),

  // multipart/form-data upload (FormData already built by caller)
  upload: async (path, formData, method = 'POST') => {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(), // no Content-Type → browser sets multipart boundary
      body: formData,
    });
    return parse(resp);
  },

  // GET returning a Blob (for Excel export downloads)
  blob: async (path) => {
    const resp = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    if (!resp.ok) return parse(resp);
    return resp.blob();
  },
};

// Trigger a browser download for a blob response
export async function download(path, filename) {
  const blob = await api.blob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
