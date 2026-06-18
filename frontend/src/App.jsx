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

function AppContent() {
  const { user, login, logout, switchUser, theme, toggleTheme, getRememberedEmail } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [activeSubPage, setActiveSubPage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dropdown list for developer profile switcher
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (user) {
      // Load all employees list for the header quick-switch dropdown
      fetch(`${API_BASE_URL}/employees`)
        .then(res => res.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to load quick switcher users:', err));
    }
  }, [user]);

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

  // QUICK DEV LOGIN
  const handleQuickLogin = (quickEmail) => {
    const quickPass = quickEmail.includes('admin') ? 'admin' : 'password123';
    setEmail(quickEmail);
    setPassword(quickPass);
    // Submit in next tick
    setTimeout(() => {
      const form = document.getElementById('react-login-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  // DEVELOPER SWAP PROFILE
  const handleProfileSwitch = async (id) => {
    try {
      await switchUser(id);
      setActivePage('dashboard');
      setActiveSubPage('');
      alert('Profile switched successfully!');
    } catch (e) {
      alert('Error switching profile: ' + e.message);
    }
  };

  // Navigation Helper
  const navigateTo = (page, subPage = '') => {
    setActivePage(page);
    setActiveSubPage(subPage);
  };

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

          <div className="quick-login-panel">
            <div className="quick-login-title">Quick Test Logins (Demo Profiles)</div>
            <div className="quick-login-grid">
              <button className="quick-login-btn" onClick={() => handleQuickLogin('admin@projectmatrix.com')}>Admin</button>
              <button className="quick-login-btn" onClick={() => handleQuickLogin('sophia@projectmatrix.com')}>PM</button>
              <button className="quick-login-btn" onClick={() => handleQuickLogin('liam@projectmatrix.com')}>Team Lead</button>
              <button className="quick-login-btn" onClick={() => handleQuickLogin('ravi@projectmatrix.com')}>Employee 1</button>
              <button className="quick-login-btn" onClick={() => handleQuickLogin('kumar@projectmatrix.com')}>Employee 2</button>
              <button className="quick-login-btn" onClick={() => handleQuickLogin('emily@projectmatrix.com')}>Management</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER APPLICATION SHELL ---

  // Generate Menu Items depending on Active Role
  const menuStructure = [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
    
    { section: 'Master Management', roles: ['Admin'] },
    { key: 'masters-employees', label: 'Employee Master', icon: '👥', roles: ['Admin'], sub: 'employees' },
    { key: 'masters-clients', label: 'Client Master', icon: '💼', roles: ['Admin'], sub: 'clients' },
    { key: 'masters-projects', label: 'Project Master', icon: '📁', roles: ['Admin'], sub: 'projects' },
    { key: 'masters-modules', label: 'Module Master', icon: '📦', roles: ['Admin'], sub: 'modules' },
    { key: 'masters-holidays', label: 'Holiday Master', icon: '📅', roles: ['Admin'], sub: 'holidays' },

    { section: 'Planning & Tasks', roles: ['PM', 'Team Lead', 'Employee'] },
    { key: 'masters-projects-pm', label: 'Projects & Modules', icon: '📁', roles: ['PM'], viewKey: 'masters', sub: 'projects' },
    { key: 'resources-allocate', label: 'Project Allocation', icon: '➕', roles: ['PM'], viewKey: 'resources', sub: 'allocations' },
    { key: 'resources-planner', label: 'Resource Planner', icon: '📅', roles: ['PM'], viewKey: 'resources', sub: 'planner' },
    { key: 'tasks-create', label: 'Create Tasks', icon: '📝', roles: ['PM'], viewKey: 'tasks', sub: 'create' },
    { key: 'tasks-my', label: 'My Tasks', icon: '☑️', roles: ['Employee'], viewKey: 'tasks', sub: 'my' },
    { key: 'tasks-board', label: 'Task Kanban Board', icon: '📋', roles: ['PM', 'Team Lead', 'Employee'], viewKey: 'tasks', sub: 'board' },

    { section: 'Timesheets & Leaves', roles: ['Employee', 'PM', 'Team Lead'] },
    { key: 'timesheets-daily', label: 'Daily Timesheet', icon: '🕒', roles: ['Employee'], viewKey: 'timesheets', sub: 'daily' },
    { key: 'timesheets-weekly', label: 'Weekly Timesheet', icon: '📅', roles: ['Employee'], viewKey: 'timesheets', sub: 'weekly' },
    { key: 'timesheets-history', label: 'Timesheet History', icon: '📜', roles: ['Employee'], viewKey: 'timesheets', sub: 'history' },
    { key: 'leaves-apply', label: 'Apply Leave', icon: '✈️', roles: ['Employee'], viewKey: 'leaves', sub: 'apply' },

    { section: 'Approvals & Controls', roles: ['PM', 'Team Lead'] },
    { key: 'approvals-timesheets', label: 'Timesheet Approvals', icon: '✅', roles: ['PM', 'Team Lead'], viewKey: 'approvals', sub: 'timesheets' },
    { key: 'approvals-tasks', label: 'Task review & Closure', icon: '📦', roles: ['PM'], viewKey: 'approvals', sub: 'tasks' },
    { key: 'leaves-approve', label: 'Leave Approvals', icon: '📜', roles: ['PM'], viewKey: 'leaves', sub: 'approve' },

    { section: 'Reports & Settings', roles: ['Management', 'PM', 'Team Lead', 'Admin'] },
    { key: 'reports', label: 'Management Reports', icon: '📊', roles: ['Management', 'PM', 'Team Lead'], sub: '' },
    { key: 'admin-roles', label: 'Role Manager', icon: '🛡️', roles: ['Admin'], viewKey: 'admin', sub: 'roles' }
  ];

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
          <div className="user-avatar">{user.name.split(' ').map(n=>n[0]).join('')}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
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
            {/* Quick switcher in header */}
            <div className="dev-sandbox-selector">
              <span>Test Profile:</span>
              <select value={user.id} onChange={e => handleProfileSwitch(e.target.value)}>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.role}] {emp.name}
                  </option>
                ))}
              </select>
            </div>

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
          {activePage === 'dashboard' && <Dashboard navigateTo={navigateTo} />}
          {activePage === 'masters' && <Masters subKey={activeSubPage} />}
          {activePage === 'resources' && <Resources subKey={activeSubPage} />}
          {activePage === 'tasks' && <Tasks subKey={activeSubPage} />}
          {activePage === 'timesheets' && <Timesheets subKey={activeSubPage} />}
          {activePage === 'approvals' && <Approvals subKey={activeSubPage} />}
          {activePage === 'leaves' && <Leaves subKey={activeSubPage} />}
          {activePage === 'reports' && <Reports />}
          {activePage === 'admin' && <Admin />}
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
