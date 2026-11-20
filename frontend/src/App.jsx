// src/App.jsx — ProjectMatrix: Admin / Master / Worker portals
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster, toast, ConfirmDialog } from './components/ui';
import useIdleTracker from './components/useIdleTracker';
import { LiveSignalingProvider } from './components/useLiveSignaling';
import LiveView from './components/LiveView';

import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import Tasks from './views/Tasks';
import CalendarView from './views/Calendar';
import Timesheets from './views/Timesheets';
import Employees from './views/Employees';
import Performance from './views/Performance';
import IdleTime from './views/IdleTime';
import Camera from './views/Camera';
import Reports from './views/Reports';
import Notifications from './views/Notifications';
import Settings from './views/Settings';
import Profile from './views/Profile';
import Approvals from './views/Approvals';

// --------------------------------------------------------------------------
// Portal + navigation configuration (spec §14)
// --------------------------------------------------------------------------
const PORTALS = [
  { key: 'admin', label: 'Admin Portal', icon: 'ph-shield-check',
    desc: 'Full control & analytics', color: '#059669' },
  { key: 'worker', label: 'Worker Portal', icon: 'ph-user-focus',
    desc: 'My work & timesheets', color: '#eab308' },
];

// Default credentials pre-filled per portal (one-click sign-in for the seeded accounts)
const PORTAL_DEFAULTS = {
  admin: { username: 'admin', password: 'admin123' },
  worker: { username: 'ravi', password: 'worker123' },
};

const NAV = {
  Admin: [
    { view: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four' },
    { view: 'projects', label: 'Projects', icon: 'ph-folder-open' },
    { view: 'tasks', label: 'Tasks', icon: 'ph-check-square' },
    { view: 'calendar', label: 'Calendar', icon: 'ph-calendar-blank' },
    { view: 'timesheets', label: 'Timesheets', icon: 'ph-clock' },
    { view: 'employees', label: 'Employees', icon: 'ph-users' },
    { view: 'approvals', label: 'Approvals', icon: 'ph-seal-check' },
    { view: 'performance', label: 'Performance Matrix', icon: 'ph-chart-line-up' },
    { view: 'idletime', label: 'Idle-Time Monitoring', icon: 'ph-timer' },
    { view: 'camera', label: 'Camera Activity Logs', icon: 'ph-camera' },
    { view: 'reports', label: 'Reports', icon: 'ph-chart-bar' },
    { view: 'notifications', label: 'Notifications', icon: 'ph-bell' },
    { view: 'settings', label: 'Settings', icon: 'ph-gear' },
  ],
  Master: [
    { view: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four' },
    { view: 'projects', label: 'Projects', icon: 'ph-folder-open' },
    { view: 'tasks', label: 'Tasks', icon: 'ph-check-square' },
    { view: 'calendar', label: 'Calendar', icon: 'ph-calendar-blank' },
    { view: 'timesheets', label: 'Timesheets', icon: 'ph-clock' },
    { view: 'employees', label: 'Employee Monitoring', icon: 'ph-users' },
    { view: 'reports', label: 'Reports', icon: 'ph-chart-bar' },
  ],
  Worker: [
    { view: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four' },
    { view: 'projects', label: 'My Projects', icon: 'ph-folder-open' },
    { view: 'tasks', label: 'My Tasks', icon: 'ph-check-square' },
    { view: 'calendar', label: 'Calendar', icon: 'ph-calendar-blank' },
    { view: 'timesheets', label: 'My Timesheets', icon: 'ph-clock' },
    { view: 'performance', label: 'My Performance', icon: 'ph-chart-line-up' },
    { view: 'notifications', label: 'Notifications', icon: 'ph-bell' },
    { view: 'profile', label: 'Profile', icon: 'ph-user-circle' },
  ],
};

const VIEWS = {
  dashboard: Dashboard, projects: Projects, tasks: Tasks, calendar: CalendarView,
  timesheets: Timesheets, employees: Employees, performance: Performance,
  idletime: IdleTime, camera: Camera, reports: Reports, notifications: Notifications,
  settings: Settings, profile: Profile, approvals: Approvals,
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// --------------------------------------------------------------------------
// Login / Forgot / Reset screen
// --------------------------------------------------------------------------
function LoginScreen() {
  const { login, forgotPassword, resetPassword, getRememberedEmail } = useAuth();
  const urlToken = new URLSearchParams(window.location.search).get('reset_token');

  const [mode, setMode] = useState(urlToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');            // username or email
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // reset form
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [devLink, setDevLink] = useState('');
  const [resetToken, setResetToken] = useState(urlToken || '');

  useEffect(() => {
    const rem = getRememberedEmail();
    if (rem) { setEmail(rem); setRemember(true); }
  }, [getRememberedEmail]);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your username.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError(''); setDevLink('');
    if (!email.trim()) return setError('Please enter your username or email.');
    setBusy(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res.devResetLink) {
        // No SMTP configured: extract the token so the user can reset in-app
        const tok = res.devResetLink.split('reset_token=')[1] || '';
        setResetToken(tok);
        setDevLink(res.devResetLink);
        toast.success('Reset link ready — set your new password.');
        setMode('reset');
      } else {
        toast.success('A reset link has been sent to your email.');
      }
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 6) return setError('Password must be at least 6 characters.');
    if (newPw !== confirmPw) return setError('Passwords do not match.');
    if (!resetToken) return setError('Reset link is missing or expired. Please request a new one.');
    setBusy(true);
    try {
      await resetPassword(resetToken, newPw);
      toast.success('Password updated. Please sign in.');
      window.history.replaceState({}, '', window.location.pathname);
      setMode('login'); setPassword(''); setNewPw(''); setConfirmPw(''); setResetToken('');
    } catch (err) {
      setError(err.message || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const BRAND = '#059669';

  return (
    <div className="auth-wrapper">
      <div className="auth-visual" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0f172a 100%)` }}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.1 }}>
            Master Your Work.<br />Monitor Performance.
          </h1>
          <p style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '460px', lineHeight: 1.5 }}>
            Projects, tasks, calendar, timesheets and employee performance — one professional,
            fully integrated portal for Admins and Workers.
          </p>
        </div>
        <i className="ph-fill ph-chart-line-up" style={{ position: 'absolute', right: '-5%', bottom: '-8%', fontSize: '32vw', opacity: 0.08 }}></i>
      </div>

      <div className="auth-form-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-logo"><i className="ph-fill ph-lightning"></i> Task <span className="brand-accent">Matrix</span></h2>
            <p className="auth-subtitle">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'reset' && 'Choose a new password'}
            </p>
          </div>

          {error && <div className="text-danger" style={{ marginBottom: 14, fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

          {mode === 'login' && (
            <form onSubmit={submitLogin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" className="form-control form-control-lg" placeholder="username"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="form-control form-control-lg"
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary,#94a3b8)', fontSize: '1.2rem' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    <i className={`ph ${showPw ? 'ph-eye-slash' : 'ph-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <label className="checkbox-group" style={{ margin: 0, cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span className="form-label" style={{ margin: 0 }}>Remember me</span>
                </label>
                <a onClick={() => { setMode('forgot'); setError(''); }}
                  style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: BRAND }}>
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="btn btn-primary" disabled={busy}
                style={{ width: '100%', padding: 14, fontSize: '1.05rem', background: BRAND, borderColor: BRAND }}>
                {busy ? 'Signing in…' : <>Sign In <i className="ph ph-arrow-right" style={{ marginLeft: 8 }}></i></>}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submitForgot}>
              <div className="form-group">
                <label className="form-label">Username or Email</label>
                <input type="text" className="form-control form-control-lg" placeholder="username or name@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {devLink && (
                <div className="card" style={{ padding: 12, marginBottom: 14, fontSize: '0.8rem' }}>
                  <strong>Dev mode (no SMTP configured):</strong>
                  <a href={devLink} style={{ wordBreak: 'break-all', display: 'block', marginTop: 6 }}>{devLink}</a>
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', padding: 14 }}>
                {busy ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }}
                onClick={() => { setMode('login'); setError(''); }}>Back to Sign In</button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={submitReset}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control form-control-lg" value={newPw}
                  onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-control form-control-lg" value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', padding: 14 }}>
                {busy ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }}
                onClick={() => { window.history.replaceState({}, '', window.location.pathname); setMode('login'); }}>
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Application shell
// --------------------------------------------------------------------------
function AppShell() {
  const { user, logout } = useAuth();
  const menu = NAV[user.role] || NAV.Worker;

  const pathView = () => {
    const p = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    return menu.find((m) => m.view === p) ? p : null;
  };
  const [active, setActive] = useState(pathView() || menu[0].view);
  const [collapsed, setCollapsed] = useState(false);
  const [navParams, setNavParams] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Track idle time while logged in
  useIdleTracker(true);

  // Keep the URL path in sync with the active view (clean per-page URLs, no #)
  useEffect(() => {
    const cur = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    if (cur !== active) window.history.replaceState(null, '', `/${active}`);
  }, [active]);

  // React to browser back/forward
  useEffect(() => {
    const onNav = () => { const v = pathView(); if (v) { setActive(v); setNavParams(null); } };
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []); // eslint-disable-line

  // Navigation helper passed to views (e.g. open a specific task/project)
  const navigate = (view, params = null) => {
    if (menu.find((m) => m.view === view)) {
      setActive(view);
      setNavParams(params);
      window.history.pushState(null, '', `/${view}`);
    }
  };

  const ActiveView = VIEWS[active] || (() => null);
  const activeLabel = (menu.find((m) => m.view === active) || {}).label || '';

  return (
    <LiveSignalingProvider>
    <div className="app-wrapper">
      <LiveView />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" style={{ fontSize: '1.4rem' }}><i className="ph-fill ph-lightning"></i></span>
          <span className="sidebar-brand-text">Task <span className="brand-accent">Matrix</span></span>
        </div>
        <nav className="sidebar-menu">
          <div className="menu-section-header"><span>{user.role} Portal</span></div>
          {menu.map((m) => (
            <a key={m.view} className={`menu-item ${active === m.view ? 'active' : ''}`}
              onClick={() => navigate(m.view)}>
              <span style={{ display: 'inline-block', width: 24, textAlign: 'center', fontSize: '1.25rem' }}>
                <i className={`ph ${m.icon}`}></i>
              </span>
              <span>{m.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '?'}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="toggle-sidebar-btn" onClick={() => setCollapsed((c) => !c)}>
              <i className="ph ph-list" style={{ fontSize: '1.25rem' }}></i>
            </button>
            <div className="view-title-container"><h2 className="view-title">{activeLabel}</h2></div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              {menu.find((m) => m.view === 'notifications') && (
                <button className="header-btn" onClick={() => navigate('notifications')} title="Notifications">
                  <i className="ph ph-bell" style={{ fontSize: '1.25rem' }}></i>
                </button>
              )}
              <button className="header-btn" onClick={() => setConfirmLogout(true)} title="Sign Out"
                style={{ color: 'var(--color-danger, #ef4444)' }}>
                <i className="ph ph-sign-out" style={{ fontSize: '1.25rem' }}></i>
              </button>
            </div>
          </div>
        </header>

        <main className="content-body">
          <ActiveView navigate={navigate} navParams={navParams} />
        </main>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          title="Sign out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          onConfirm={() => { setConfirmLogout(false); logout(); }}
          onClose={() => setConfirmLogout(false)}
        />
      )}
    </div>
    </LiveSignalingProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  return user ? <AppShell /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <AppContent />
    </AuthProvider>
  );
}
