// src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, API_BASE_URL } from './context/AuthContext';
import Dashboard from './views/Dashboard';
import Masters from './views/Masters';
import Resources from './views/Resources';
import Tasks from './views/Tasks';
import Timesheets from './views/Timesheets';
import Approvals from './views/Approvals';
import Leaves from './views/Leaves';
import Reports from './views/Reports';
import Admin from './views/Admin';

const menuStructure = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  
  { section: 'Master Management', roles: ['Admin'] },
  { key: 'masters-employees', label: 'Employee Master', icon: '👥', roles: ['Admin'], viewKey: 'masters', sub: 'employees' },
  { key: 'masters-clients', label: 'Client Master', icon: '💼', roles: ['Admin'], viewKey: 'masters', sub: 'clients' },
  { key: 'masters-projects', label: 'Project Master', icon: '📁', roles: ['Admin'], viewKey: 'masters', sub: 'projects' },
  { key: 'masters-modules', label: 'Module Master', icon: '📦', roles: ['Admin'], viewKey: 'masters', sub: 'modules' },
  { key: 'masters-holidays', label: 'Holiday Master', icon: '📅', roles: ['Admin'], viewKey: 'masters', sub: 'holidays' },
  { key: 'masters-tasktypes', label: 'Task Types', icon: '🏷️', roles: ['Admin'], viewKey: 'masters', sub: 'task-types' },

  { section: 'Planning & Tasks', roles: ['Admin', 'PM', 'Team Lead', 'Employee'] },
  { key: 'resources-allocate', label: 'Project Allocation', icon: '➕', roles: ['Admin', 'PM'], viewKey: 'resources', sub: 'allocations' },
  { key: 'resources-planner', label: 'Resource Planner', icon: '📅', roles: ['Admin', 'PM'], viewKey: 'resources', sub: 'planner' },
  { key: 'tasks-create', label: 'Create Tasks', icon: '📝', roles: ['PM'], viewKey: 'tasks', sub: 'create' },
  { key: 'tasks-my', label: 'My Tasks', icon: '☑️', roles: ['PM', 'Team Lead', 'Employee'], viewKey: 'tasks', sub: 'my' },
  { key: 'tasks-board', label: 'Task Kanban Board', icon: '📋', roles: ['PM', 'Team Lead', 'Employee'], viewKey: 'tasks', sub: 'board' },

  { section: 'Monitoring', roles: ['Admin'] },
  { key: 'monitoring-tasks', label: 'Task Summary', icon: '📊', roles: ['Admin'], viewKey: 'tasks', sub: 'summary' },
  { key: 'monitoring-leaves', label: 'Leave Summary', icon: '✈️', roles: ['Admin'], viewKey: 'leaves', sub: 'summary' },
  { key: 'monitoring-timesheets', label: 'Timesheet Summary', icon: '🕒', roles: ['Admin'], viewKey: 'timesheets', sub: 'summary' },

  { section: 'Timesheets & Leaves', roles: ['Employee', 'PM', 'Team Lead'] },
  { key: 'timesheets-daily', label: 'Daily Timesheet', icon: '🕒', roles: ['Employee', 'PM', 'Team Lead'], viewKey: 'timesheets', sub: 'daily' },
  { key: 'timesheets-weekly', label: 'Weekly Timesheet', icon: '📅', roles: ['Employee', 'PM', 'Team Lead'], viewKey: 'timesheets', sub: 'weekly' },
  { key: 'timesheets-history', label: 'Timesheet History', icon: '📜', roles: ['Employee', 'PM', 'Team Lead'], viewKey: 'timesheets', sub: 'history' },
  { key: 'leaves-apply', label: 'Apply Leave', icon: '✈️', roles: ['Employee', 'PM', 'Team Lead'], viewKey: 'leaves', sub: 'apply' },

  { section: 'Approvals & Controls', roles: ['PM', 'Team Lead'] },
  { key: 'approvals-timesheets', label: 'Timesheet Approvals', icon: '✅', roles: ['PM', 'Team Lead'], viewKey: 'approvals', sub: 'timesheets' },
  { key: 'approvals-tasks', label: 'Task review & Closure', icon: '📦', roles: ['PM', 'Team Lead'], viewKey: 'approvals', sub: 'tasks' },
  { key: 'leaves-approve', label: 'Leave Approvals', icon: '📜', roles: ['PM', 'Team Lead'], viewKey: 'leaves', sub: 'approve' },

  { section: 'Reports & Settings', roles: ['Admin', 'Management', 'PM'] },
  { key: 'reports', label: 'Management Reports', icon: '📊', roles: ['Admin', 'Management', 'PM'], viewKey: 'reports', sub: '' },
  { key: 'admin-roles', label: 'Role Manager', icon: '🛡️', roles: ['Admin'], viewKey: 'admin', sub: 'roles' }
];

const hasAccess = (role, page, subPage) => {
  if (!role) return false;
  const targetItem = menuStructure.find(m => m.key && (m.viewKey || m.key.split('-')[0]) === page && (!m.sub || m.sub === subPage));
  return targetItem && targetItem.roles && targetItem.roles.includes(role);
};

function AppContent() {
  const { user, login, logout, theme, toggleTheme, getRememberedEmail } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [activeSubPage, setActiveSubPage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState('');



  useEffect(() => {
    if (!user) {
      setEmail(getRememberedEmail());
      setRememberMe(!!getRememberedEmail());
    }
  }, [user, getRememberedEmail]);

  // LOGIN TRIGGER
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setAuthError(err.message);
    }
  };



  // Navigation Helper
  const navigateTo = (page, subPage = '') => {
    if (!hasAccess(user?.role, page, subPage)) {
      setActivePage('dashboard');
      setActiveSubPage('');
      return;
    }
    setActivePage(page);
    setActiveSubPage(subPage);
  };

  useEffect(() => {
    if (user && activePage !== 'dashboard' && !hasAccess(user.role, activePage, activeSubPage)) {
      setActivePage('dashboard');
      setActiveSubPage('');
    }
  }, [user, activePage, activeSubPage]);

  // --- RENDER LOGIN IF NO USER ---
  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">ProjectMatrix</h1>
            <p className="auth-subtitle">Project & Timesheet Management System</p>
          </div>
          
          <form id="react-login-form" onSubmit={handleLoginSubmit}>
            {authError && <div className="text-danger" style={{ marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600 }}>{authError}</div>}
            
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                type="email"
                id="login-email"
                className="form-control"
                placeholder="name@projectmatrix.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group checkbox-group" style={{ marginBottom: '24px' }}>
              <input
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="login-remember" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Remember Me</label>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
          </form>


        </div>
      </div>
    );
  }

  // --- RENDER APPLICATION SHELL ---

  // Dynamic Header Title compute
  let titleText = activePage.charAt(0).toUpperCase() + activePage.slice(1);
  if (activePage === 'masters') {
    titleText = `${activeSubPage.charAt(0).toUpperCase() + activeSubPage.slice(1)} Master`;
  } else if (activePage === 'resources') {
    titleText = activeSubPage === 'allocations' ? 'Project Allocation' : 'Resource Capacity Planner';
  } else if (activePage === 'tasks') {
    titleText = activeSubPage === 'create' ? 'Create Tasks' : (activeSubPage === 'my' ? 'My Tasks' : 'Task Kanban Board');
  } else if (activePage === 'timesheets') {
    titleText = activeSubPage === 'daily' ? 'Daily Timesheet Entry' : (activeSubPage === 'weekly' ? 'Weekly Grid Timesheet' : 'Timesheet History Logs');
  } else if (activePage === 'approvals') {
    titleText = activeSubPage === 'timesheets' ? 'Pending Timesheet Approvals' : 'Task Review & Closure';
  } else if (activePage === 'leaves') {
    titleText = activeSubPage === 'apply' ? 'Leave Application Portal' : 'Leave Approval Board';
  } else if (activePage === 'admin') {
    titleText = 'User & Role Administration';
  }

  return (
    <div className="app-wrapper">
      {/* Sidebar navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} id="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">⚡</span>
          <span className="sidebar-brand-text">ProjectMatrix</span>
        </div>

        <nav className="sidebar-menu">
          {menuStructure.map((item, idx) => {
            if (item.section) {
              if (item.roles.includes(user.role)) {
                return <div key={`sec-${idx}`} className="menu-section-header">{item.section}</div>;
              }
              return null;
            }

            if (item.roles.includes(user.role)) {
              const viewKey = item.viewKey || item.key.split('-')[0];
              const subKey = item.sub;
              const isActive = activePage === viewKey && activeSubPage === subKey;

              return (
                <a
                  key={`item-${idx}`}
                  className={`menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigateTo(viewKey, subKey)}
                >
                  <span style={{ display: 'inline-block', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              );
            }
            return null;
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user.name ? user.name.split(' ').map(n=>n[0]).join('') : '?'}</div>
          <div className="user-info">
            <span className="user-name">{user.name || 'User'}</span>
            <span className="user-role">{user.role || 'Role'}</span>
          </div>
        </div>
      </aside>

      {/* Main content frame */}
      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="toggle-sidebar-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              ☰
            </button>
            <div className="view-title-container">
              <h2 className="view-title">{titleText}</h2>
            </div>
          </div>

          <div className="header-right">


            <div className="header-actions">
              <button className="header-btn" onClick={toggleTheme} title="Toggle Theme">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="header-btn" onClick={() => {
                if (window.confirm('Sign out of ProjectMatrix?')) logout();
              }} title="Sign Out">
                🚪
              </button>
            </div>
          </div>
        </header>

        {/* View renderer viewport */}
        <main className="content-body">
          <>
            {activePage === 'dashboard' && <Dashboard navigateTo={navigateTo} />}
            {activePage === 'masters' && <Masters subKey={activeSubPage} />}
            {activePage === 'resources' && <Resources subKey={activeSubPage} />}
            {activePage === 'tasks' && <Tasks subKey={activeSubPage} />}
            {activePage === 'timesheets' && <Timesheets subKey={activeSubPage} />}
            {activePage === 'approvals' && <Approvals subKey={activeSubPage} />}
            {activePage === 'leaves' && <Leaves subKey={activeSubPage} />}
            {activePage === 'reports' && <Reports />}
            {activePage === 'admin' && <Admin />}
          </>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
