// src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, API_BASE_URL } from './context/AuthContext';
import Dashboard from './views/Dashboard';
import Tasks from './views/Tasks';
import Projects from './views/Projects';
import Team from './views/Team';
import Sections from './views/Sections';
import Labels from './views/Labels';
import Reports from './views/Reports';
import Search from './views/Search';
import Notifications from './views/Notifications';
import Profile from './views/Profile';
import Admin from './views/Admin';
import Masters from './views/Masters';

const menuStructure = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ph-house', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  
  { section: 'Tasks', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  { key: 'tasks-my', label: 'My Tasks', icon: 'ph-check-square-offset', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'my' },
  { key: 'tasks-list', label: 'Task List', icon: 'ph-list-dashes', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'list' },
  { key: 'tasks-board', label: 'Kanban Board', icon: 'ph-kanban', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'board' },
  { key: 'tasks-calendar', label: 'Calendar', icon: 'ph-calendar-blank', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'calendar' },
  { key: 'tasks-create', label: 'Create Task', icon: 'ph-plus-circle', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'create' },
  { key: 'tasks-detail', label: 'Task Detail', icon: 'ph-info', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'tasks', sub: 'detail' },
  { key: 'tasks-review', label: 'Review & Closure', icon: 'ph-check-circle', roles: ['Admin', 'PM', 'Team Lead'], viewKey: 'tasks', sub: 'review' },
  
  { section: 'Projects', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  { key: 'projects-list', label: 'Projects', icon: 'ph-folder-open', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'projects', sub: 'list' },
  { key: 'projects-detail', label: 'Project Detail', icon: 'ph-file-text', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'projects', sub: 'detail' },
  
  { section: 'Organization', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  { key: 'team', label: 'Team', icon: 'ph-users', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'team', sub: '' },
  { key: 'sections', label: 'Sections', icon: 'ph-squares-four', roles: ['Admin', 'PM'], viewKey: 'sections', sub: '' },
  { key: 'labels', label: 'Labels', icon: 'ph-tag', roles: ['Admin', 'PM', 'Team Lead'], viewKey: 'labels', sub: '' },
  
  { section: 'Insights & Search', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  { key: 'reports', label: 'Reports', icon: 'ph-chart-bar', roles: ['Admin', 'PM', 'Team Lead', 'Management'], viewKey: 'reports', sub: '' },
  { key: 'search', label: 'Global Search', icon: 'ph-magnifying-glass', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'search', sub: '' },
  
  { section: 'Master Portal', roles: ['Admin', 'Management'] },
  { key: 'masters-clients', label: 'Clients', icon: 'ph-buildings', roles: ['Admin', 'Management'], viewKey: 'masters', sub: 'clients' },
  { key: 'masters-departments', label: 'Departments', icon: 'ph-tree-structure', roles: ['Admin', 'Management'], viewKey: 'masters', sub: 'departments' },
  { key: 'masters-designations', label: 'Designations', icon: 'ph-briefcase', roles: ['Admin', 'Management'], viewKey: 'masters', sub: 'designations' },
  
  { section: 'Admin Portal', roles: ['Admin'] },
  { key: 'admin-roles', label: 'Role Manager', icon: 'ph-shield-check', roles: ['Admin'], viewKey: 'admin', sub: 'roles' },
  { key: 'admin-users', label: 'User Management', icon: 'ph-users-three', roles: ['Admin'], viewKey: 'admin', sub: 'users' },
  { key: 'admin-settings', label: 'System Settings', icon: 'ph-gear', roles: ['Admin'], viewKey: 'admin', sub: 'settings' },

  { section: 'Personal', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'] },
  { key: 'notifications', label: 'Notifications', icon: 'ph-bell', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'notifications', sub: '' },
  { key: 'profile', label: 'Profile / Security', icon: 'ph-user-circle', roles: ['Admin', 'PM', 'Team Lead', 'Employee', 'Management'], viewKey: 'profile', sub: '' }
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    'Tasks': true,
    'Projects': true
  });

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: prev[sectionName] === undefined ? false : !prev[sectionName]
    }));
  };
  
  // Login states
  const [email, setEmail] = useState('admin@taskmanagement.com');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState('');



  useEffect(() => {
    if (!user) {
      const rem = getRememberedEmail();
      if (rem) {
        setEmail(rem);
        setRememberMe(true);
      }
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
        
        {/* Left Side: Premium Visuals */}
        <div className="auth-visual">
          <div style={{ position: 'relative', zIndex: 10 }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.1 }}>
              Master Your Work.<br />Empower Your Team.
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '500px', lineHeight: 1.5 }}>
              The all-in-one professional task management portal built for modern, high-performance teams. Keep projects on track, automate workflows, and collaborate seamlessly.
            </p>
          </div>
          {/* Decorative background icons */}
          <i className="ph-fill ph-kanban" style={{ position: 'absolute', right: '-10%', bottom: '-10%', fontSize: '40vw', opacity: 0.05, transform: 'rotate(-15deg)' }}></i>
          <i className="ph-fill ph-chart-line-up" style={{ position: 'absolute', right: '20%', top: '10%', fontSize: '10vw', opacity: 0.05, transform: 'rotate(15deg)' }}></i>
        </div>

        {/* Right Side: Login Form */}
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2 className="auth-logo">Task Management</h2>
              <p className="auth-subtitle">Sign in to your account</p>
            </div>
            
            <form id="react-login-form" onSubmit={handleLoginSubmit}>
              {authError && <div className="text-danger" style={{ marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600 }}>{authError}</div>}
              
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input
                  type="email"
                  id="login-email"
                  className="form-control form-control-lg"
                  placeholder="name@company.com"
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
                  className="form-control form-control-lg"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group checkbox-group" style={{ marginBottom: '32px' }}>
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <label htmlFor="login-remember" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Remember me on this device</label>
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}>
                Sign In <i className="ph ph-arrow-right" style={{ marginLeft: '8px' }}></i>
              </button>
            </form>
          </div>
        </div>

      </div>
    );
  }

  // --- RENDER APPLICATION SHELL ---

  // Dynamic Header Title compute
  let titleText = activePage.charAt(0).toUpperCase() + activePage.slice(1);
  if (activePage === 'tasks') {
    const titles = {
      my: 'My Tasks', list: 'Task List', board: 'Kanban Board', calendar: 'Calendar',
      create: 'Create Task', detail: 'Task Detail', review: 'Review & Closure'
    };
    titleText = titles[activeSubPage] || 'Tasks';
  } else if (activePage === 'projects') {
    titleText = activeSubPage === 'detail' ? 'Project Detail' : 'Projects';
  } else if (activePage === 'admin') {
    const titles = { roles: 'Role Manager', users: 'User Management', settings: 'System Settings' };
    titleText = titles[activeSubPage] || 'Admin Portal';
  } else if (activePage === 'masters') {
    const titles = { clients: 'Client Master', departments: 'Department Master', designations: 'Designation Master' };
    titleText = titles[activeSubPage] || 'Master Portal';
  } else if (activePage === 'profile') {
    titleText = 'Profile & Security';
  } else if (activePage === 'search') {
    titleText = 'Global Search';
  }

  return (
    <div className="app-wrapper">
      {/* Sidebar navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} id="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" style={{ fontSize: '1.4rem' }}><i className="ph-fill ph-lightning"></i></span>
          <span className="sidebar-brand-text">Task Management</span>
        </div>

        <nav className="sidebar-menu">
          {(() => {
            let currentSection = null;
            return menuStructure.map((item, idx) => {
              if (item.section) {
                currentSection = item.section;
                if (item.roles.includes(user.role)) {
                  const sectionName = item.section;
                  const isExpanded = expandedSections[sectionName] !== false; // Default true if not defined
                  return (
                    <div 
                      key={`sec-${idx}`} 
                      className="menu-section-header" 
                      onClick={() => !sidebarCollapsed && toggleSection(sectionName)}
                    >
                      <span>{sectionName}</span>
                      <i className={`ph-bold ph-caret-${isExpanded ? 'up' : 'down'}`}></i>
                    </div>
                  );
                }
                return null;
              }

              if (item.roles.includes(user.role)) {
                if (currentSection && expandedSections[currentSection] === false && !sidebarCollapsed) {
                  return null;
                }
                
                const viewKey = item.viewKey || item.key.split('-')[0];
                const subKey = item.sub;
                const isActive = activePage === viewKey && activeSubPage === subKey;

                return (
                  <a
                    key={`item-${idx}`}
                    className={`menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => navigateTo(viewKey, subKey)}
                  >
                    <span style={{ display: 'inline-block', width: '24px', textAlign: 'center', fontSize: '1.25rem' }}>
                      <i className={`ph ${item.icon}`}></i>
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              }
              return null;
            });
          })()}
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
              <i className="ph ph-list" style={{ fontSize: '1.25rem' }}></i>
            </button>
            <div className="view-title-container">
              <h2 className="view-title">{titleText}</h2>
            </div>
          </div>

          <div className="header-right">


            <div className="header-actions">
              <button className="header-btn" onClick={() => navigateTo('notifications')} title="Notifications" style={{ position: 'relative' }}>
                <i className="ph ph-bell" style={{ fontSize: '1.25rem' }}></i>
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: 'var(--color-danger)', borderRadius: '50%' }}></span>
              </button>
              <button className="header-btn" onClick={toggleTheme} title="Toggle Theme">
                <i className={theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon'} style={{ fontSize: '1.25rem' }}></i>
              </button>
              <button className="header-btn" onClick={() => setShowLogoutConfirm(true)} title="Sign Out">
                <i className="ph ph-sign-out" style={{ fontSize: '1.25rem' }}></i>
              </button>
            </div>
          </div>
        </header>

        {/* View renderer viewport */}
        <main className="content-body">
          <>
            {activePage === 'dashboard' && <Dashboard navigateTo={navigateTo} />}
            {activePage === 'tasks' && <Tasks subKey={activeSubPage} />}
            {activePage === 'projects' && <Projects subKey={activeSubPage} />}
            {activePage === 'team' && <Team />}
            {activePage === 'sections' && <Sections />}
            {activePage === 'labels' && <Labels />}
            {activePage === 'reports' && <Reports />}
            {activePage === 'search' && <Search />}
            {activePage === 'notifications' && <Notifications />}
            {activePage === 'profile' && <Profile />}
            {activePage === 'admin' && <Admin subKey={activeSubPage} />}
            {activePage === 'masters' && <Masters subKey={activeSubPage} />}
          </>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '32px', animation: 'fadeInScale 0.2s ease-out' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '2rem', marginBottom: '20px' }}>
              <i className="ph-fill ph-warning-circle"></i>
            </div>
            <h3 style={{ marginBottom: '10px' }}>Sign out?</h3>
            <p className="text-secondary" style={{ marginBottom: '24px' }}>Are you sure you want to sign out of the Task Management Portal?</p>
            <div className="flex-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => {
                setShowLogoutConfirm(false);
                logout();
              }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
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
