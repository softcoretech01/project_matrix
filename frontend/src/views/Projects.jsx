import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Projects({ subKey, onViewChange, navigateTo }) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState(subKey === 'detail' ? 'detail' : 'list');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dailyActivity, setDailyActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Search & Filters for Project List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal / Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '', 
    owner: user?.name || 'Sophia Davis', 
    status: 'Active' 
  });

  // Members Tab states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');

  // Sections Tab states
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Role permissions (PDF Section 8 & Page 11)
  const isManagerOrAdmin = ['Admin', 'PM', 'Team Lead', 'Manager', 'Management'].includes(user?.role);
  const isMember = !isManagerOrAdmin;

  // Synchronize view mode with parent
  const switchView = (mode) => {
    setViewMode(mode);
    if (onViewChange) onViewChange(mode);
  };

  // Load all projects with metrics from backend
  const loadProjects = async () => {
    try {
      setLoading(true);
      const [projRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`),
        fetch(`${API_BASE_URL}/employees`).catch(() => null)
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
        const target = selectedProject || data[0];
        if (target) {
          setSelectedProject(target);
          if (subKey === 'detail' || viewMode === 'detail') {
            fetchProjectDetails(target.id);
          }
        }
      }

      if (empRes && empRes.ok) {
        const emps = await empRes.json();
        setEmployeesList(emps);
        if (emps.length > 0 && !newMemberName) {
          setNewMemberName(emps[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load projects/employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    const handleUpdate = () => {
      loadProjects();
      const currentId = projectDetails?.id || selectedProject?.id;
      if (currentId) {
        fetchProjectDetails(currentId);
      }
    };
    window.addEventListener('pm_data_updated', handleUpdate);
    return () => window.removeEventListener('pm_data_updated', handleUpdate);
  }, [subKey]);

  // Fetch daily completed tasks log with date and time
  const fetchDailyActivity = async (projId) => {
    if (!projId) return;
    try {
      setLoadingActivity(true);
      const res = await fetch(`${API_BASE_URL}/projects/${projId}/daily-activity`);
      if (res.ok) {
        const data = await res.json();
        setDailyActivity(data.activity || []);
      }
    } catch (err) {
      console.error('Error fetching project daily activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Fetch project details by ID
  const fetchProjectDetails = async (projId) => {
    if (!projId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projId}`);
      if (res.ok) {
        const detail = await res.json();
        setProjectDetails(detail);
        setSelectedProject(detail);
        fetchDailyActivity(projId);
      }
    } catch (err) {
      console.error('Error fetching project detail:', err);
    }
  };

  useEffect(() => {
    if (subKey === 'detail') setViewMode('detail');
    else if (subKey === 'list') setViewMode('list');
  }, [subKey]);

  // Ensure project details are always loaded whenever entering detail mode
  useEffect(() => {
    if (viewMode === 'detail' || subKey === 'detail') {
      const target = selectedProject || projects[0];
      if (target?.id && (!projectDetails || projectDetails.id !== target.id)) {
        fetchProjectDetails(target.id);
      }
    }
  }, [viewMode, subKey, selectedProject?.id, projects]);

  // Load deep project details (tasks stats, members, sections)
  const openProjectDetail = async (proj) => {
    setSelectedProject(proj);
    switchView('detail');
    fetchProjectDetails(proj.id);
  };

  // Create Project (Admin & Manager only per PDF Section 7.10)
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          owner: newProject.owner || user?.name || 'Admin User'
        })
      });

      if (res.ok) {
        const created = await res.json();
        setNewProject({ name: '', description: '', owner: user?.name || 'Sophia Davis', status: 'Active' });
        setShowCreateModal(false);
        await loadProjects();
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        openProjectDetail(created);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  // Delete Project (Admin / Manager only)
  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? All related project settings will be removed.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        if (selectedProject?.id === projectId) {
          switchView('list');
          setSelectedProject(null);
        }
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // Helper to get currently active project ID
  const getActiveProjectId = () => projectDetails?.id || selectedProject?.id || projects[0]?.id;

  // Add Member to Project (PDF Section 6.4 & Page 4)
  const handleAddMember = async (e) => {
    e.preventDefault();
    const targetId = getActiveProjectId();
    if (!newMemberName.trim() || !targetId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${targetId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMemberName.trim(), role: newMemberRole })
      });
      if (res.ok) {
        const added = await res.json();
        setProjectDetails(prev => ({
          ...prev,
          members: [...(prev?.members || []).filter(m => m.name !== added.name), added]
        }));
        await loadProjects();
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        fetchProjectDetails(targetId);
      }
    } catch (err) {
      console.error('Error adding project member:', err);
    }
  };

  // Remove Member from Project (PDF Section 6.4)
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    const targetId = getActiveProjectId();
    if (!targetId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${targetId}/members/${memberId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjectDetails(prev => ({
          ...prev,
          members: (prev?.members || []).filter(m => m.id !== memberId)
        }));
        await loadProjects();
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        fetchProjectDetails(targetId);
      }
    } catch (err) {
      console.error('Error removing project member:', err);
    }
  };

  // Add Section to Project (PDF Section 6.4 & 7.11)
  const handleAddSection = async (e) => {
    e.preventDefault();
    const targetId = getActiveProjectId();
    if (!newSectionName.trim() || !targetId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${targetId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setProjectDetails(prev => ({
          ...prev,
          sections: [...(prev?.sections || []), added]
        }));
        setNewSectionName('');
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        fetchProjectDetails(targetId);
      }
    } catch (err) {
      console.error('Error adding project section:', err);
    }
  };

  // Rename Section in Project (PDF Section 6.4)
  const handleRenameSection = async (sectionId) => {
    const targetId = getActiveProjectId();
    if (!editingSectionName.trim() || !targetId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${targetId}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSectionName.trim() })
      });
      if (res.ok) {
        setProjectDetails(prev => ({
          ...prev,
          sections: (prev?.sections || []).map(s => s.id === sectionId ? { ...s, name: editingSectionName.trim() } : s)
        }));
        setEditingSectionId(null);
        setEditingSectionName('');
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        fetchProjectDetails(targetId);
      }
    } catch (err) {
      console.error('Error renaming section:', err);
    }
  };

  // Delete Section from Project (PDF Section 6.4)
  const handleDeleteSection = async (sectionId, sectionName) => {
    if (!window.confirm(`Delete section "${sectionName}"?`)) return;
    const targetId = getActiveProjectId();
    if (!targetId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${targetId}/sections/${sectionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjectDetails(prev => ({
          ...prev,
          sections: (prev?.sections || []).filter(s => s.id !== sectionId)
        }));
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
        fetchProjectDetails(targetId);
      }
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  // Open Task List / Board pre-filtered by this project (PDF Section 6.4)
  const navigateToFilteredTasks = (targetSub) => {
    const projName = projectDetails?.name || selectedProject?.name || '';
    if (projName) {
      sessionStorage.setItem('task_project_filter', projName);
    }
    if (navigateTo) {
      navigateTo('tasks', targetSub);
    }
  };

  // Filter projects by role and search criteria
  const filteredProjects = projects.filter(p => {
    // Role filter: Member only sees projects they belong to (or all if unassigned)
    if (isMember && p.members && p.members.length > 0) {
      const isAssigned = p.members.some(m => m.toLowerCase() === (user?.name || '').toLowerCase());
      if (!isAssigned) return false;
    }

    // Status filter
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCode = (p.code || '').toLowerCase().includes(q);
      const matchOwner = (p.owner || '').toLowerCase().includes(q);
      return matchName || matchCode || matchOwner;
    }

    return true;
  });

  // ==========================================
  // DETAIL VIEW (PDF Section 6.4 & 7.10)
  // ==========================================
  if (viewMode === 'detail') {
    const proj = projectDetails || selectedProject || projects[0] || {};
    const membersList = projectDetails?.members || [];
    const sectionsList = projectDetails?.sections || [];
    const totalTasks = projectDetails?.totalTasks || 0;
    const completedTasks = projectDetails?.completedTasks || 0;
    const inProgressTasks = projectDetails?.inProgressTasks || 0;
    const openTasks = projectDetails?.openTasks || 0;
    const reviewTasks = projectDetails?.reviewTasks || 0;
    const overdueTasks = projectDetails?.overdueTasks || 0;
    const progressPct = projectDetails?.progress || (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

    return (
      <div className="card" style={{ padding: '24px' }}>
        {/* Header with Back Button, Project Title, Code & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px' }}>
          <div>
            <button 
              onClick={() => switchView('list')} 
              className="btn btn-secondary" 
              style={{ marginBottom: '10px', fontSize: '13px', padding: '6px 12px' }}
            >
              ← Back to Projects List
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{proj.name}</h2>
              <span className="badge badge-secondary" style={{ fontSize: '12px' }}>{proj.code || 'PRJ-01'}</span>
              <span className="badge badge-primary" style={{ fontSize: '12px' }}>{proj.status || 'Active'}</span>
            </div>
            <p className="text-muted" style={{ margin: '6px 0 0 0', fontSize: '14px' }}>
              {proj.description || 'Enterprise project workspace and delivery milestone tracker.'}
            </p>
          </div>

          {/* Pre-filtered Action Buttons (PDF Section 6.4) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigateToFilteredTasks('list')} 
              className="btn btn-secondary" 
              style={{ fontSize: '13px', padding: '8px 14px' }}
              title="Open Task List pre-filtered by this project"
            >
              📋 View in Task List
            </button>
            <button 
              onClick={() => navigateToFilteredTasks('board')} 
              className="btn btn-secondary" 
              style={{ fontSize: '13px', padding: '8px 14px' }}
              title="Open Kanban Board pre-filtered by this project"
            >
              📊 View on Board
            </button>
            {isManagerOrAdmin && (
              <button 
                onClick={() => navigateToFilteredTasks('create')} 
                className="btn btn-primary" 
                style={{ fontSize: '13px', padding: '8px 14px' }}
                title="Create task inside this project"
              >
                + Add Task
              </button>
            )}
          </div>
        </div>

        {/* Member View Banner Notice */}
        {isMember && (
          <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info)', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', marginBottom: '18px', color: 'var(--text-primary)' }}>
            ℹ️ <strong>Member View:</strong> You are viewing this project as an assigned team contributor. Membership allocations and section structure are managed by Project Managers and Admins.
          </div>
        )}

        {/* Project Detail Tabs Header */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '22px', paddingBottom: '10px', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}
          >
            Overview & Metrics
          </button>
          <button 
            onClick={() => { setActiveTab('daily-log'); fetchDailyActivity(getActiveProjectId()); }} 
            className={`btn ${activeTab === 'daily-log' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}
          >
            📅 Daily Completed Tasks ({dailyActivity.length})
          </button>
          <button 
            onClick={() => setActiveTab('members')} 
            className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}
          >
            Project Members ({membersList.length})
          </button>
          <button 
            onClick={() => setActiveTab('sections')} 
            className={`btn ${activeTab === 'sections' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}
          >
            Sections & Modules ({sectionsList.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & METRICS (PDF Section 6.4) */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Tasks</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem' }}>{totalTasks}</h2>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-success)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Completed</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: 'var(--color-success)' }}>{completedTasks}</h2>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-warning)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: 'var(--color-warning)' }}>{inProgressTasks}</h2>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Awaiting Review</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: '#8b5cf6' }}>{reviewTasks}</h2>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-danger)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Overdue</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: overdueTasks > 0 ? 'var(--color-danger)' : 'inherit' }}>{overdueTasks}</h2>
              </div>
            </div>

            {/* Overall Delivery Progress Bar */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px' }}>Delivery Progress</h4>
                <span style={{ fontSize: '14px', fontWeight: 700, color: progressPct === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                  {progressPct}% Completed
                </span>
              </div>
              <div style={{ height: '10px', background: 'var(--card-bg)', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.4s ease' }} />
              </div>
              <span className="text-muted" style={{ fontSize: '13px' }}>
                {completedTasks} of {totalTasks} deliverables completed and signed off.
              </span>
            </div>

            {/* Project Summary Information */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Project Manager / Owner</span>
                <strong style={{ fontSize: '15px' }}>{proj.owner || 'Admin User'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Project Code</span>
                <strong style={{ fontSize: '15px' }}>{proj.code || 'PRJ-01'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Current Status</span>
                <strong style={{ fontSize: '15px' }}>{proj.status || 'Active'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Formal Review Step</span>
                <strong style={{ fontSize: '15px' }}>{proj.reviewRequired ? 'Required (Review & Closure)' : 'Standard (Direct Close)'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECT MEMBERS (PDF Section 6.4: Replaces allocations) */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>Team Members</h4>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>Members assigned to deliver tasks within this project.</p>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                {membersList.length} Active Members
              </span>
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {membersList.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <p className="text-muted" style={{ margin: 0 }}>No team members assigned yet.</p>
                </div>
              ) : (
                membersList.map(m => (
                  <div 
                    key={m.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'var(--bg-secondary)', 
                      padding: '14px 18px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block' }}>{m.name}</strong>
                        <span className="text-muted" style={{ fontSize: '12px' }}>{m.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '12px' }}>{m.role || 'Contributor'}</span>
                      {isManagerOrAdmin && (
                        <button 
                          onClick={() => handleRemoveMember(m.id, m.name)} 
                          className="btn btn-secondary" 
                          style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                          title="Remove member from project"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Member Form (Admin/Manager only) */}
            {isManagerOrAdmin && (
              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>+ Assign Team Member</h5>
                <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select 
                    className="form-control" 
                    value={newMemberName} 
                    onChange={(e) => setNewMemberName(e.target.value)}
                    style={{ flex: 1, minWidth: '200px', fontSize: '13px' }}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {employeesList.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.designation || emp.role})</option>
                    ))}
                  </select>

                  <select 
                    className="form-control" 
                    value={newMemberRole} 
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    style={{ width: '160px', fontSize: '13px' }}
                  >
                    <option value="Project Lead">Project Lead</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Developer">Developer</option>
                    <option value="Contributor">Contributor</option>
                    <option value="Reviewer">Reviewer</option>
                  </select>

                  <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                    + Add Member
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SECTIONS & MODULES (PDF Section 6.4 & 7.11) */}
        {activeTab === 'sections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>Sections & Modules</h4>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>Organize tasks by functional module within this project.</p>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                {sectionsList.length} Sections
              </span>
            </div>

            {/* Sections List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sectionsList.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <p className="text-muted" style={{ margin: 0 }}>No sections defined for this project.</p>
                </div>
              ) : (
                sectionsList.map(s => (
                  <div 
                    key={s.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'var(--bg-secondary)', 
                      padding: '14px 18px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    {editingSectionId === s.id ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={editingSectionName} 
                          onChange={(e) => setEditingSectionName(e.target.value)}
                          style={{ fontSize: '13px', maxWidth: '300px' }}
                        />
                        <button onClick={() => handleRenameSection(s.id)} className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 10px' }}>Save</button>
                        <button onClick={() => setEditingSectionId(null)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--color-primary)', fontSize: '16px' }}>📁</span>
                        <strong style={{ fontSize: '14px' }}>{s.name}</strong>
                      </div>
                    )}

                    {isManagerOrAdmin && editingSectionId !== s.id && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => { setEditingSectionId(s.id); setEditingSectionName(s.name); }} 
                          className="btn btn-secondary" 
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                          title="Rename section"
                        >
                          Rename
                        </button>
                        <button 
                          onClick={() => handleDeleteSection(s.id, s.name)} 
                          className="btn btn-secondary" 
                          style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                          title="Delete section"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Section Form (Admin/Manager only) */}
            {isManagerOrAdmin && (
              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>+ Add Functional Section</h5>
                <form onSubmit={handleAddSection} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="New section name (e.g. Core Engine, Authentication, UI Polish)..." 
                    value={newSectionName} 
                    onChange={(e) => setNewSectionName(e.target.value)} 
                    style={{ flex: 1, minWidth: '240px', fontSize: '13px' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                    + Add Section
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DAILY PROGRESS & COMPLETED TASKS LOG */}
        {activeTab === 'daily-log' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Daily Completed Work & Delivery Log</h4>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                  Live chronological record of all completed tasks in this project with exact date and time timestamps.
                </p>
              </div>
              <button 
                onClick={() => fetchDailyActivity(getActiveProjectId())} 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                ↻ Refresh Log
              </button>
            </div>

            {loadingActivity ? (
              <div style={{ padding: '40px', textAlign: 'center' }} className="text-muted">Loading daily completed tasks...</div>
            ) : dailyActivity.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '14px' }}>
                  <i className="ph ph-calendar-check"></i>
                </div>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Completed Tasks Yet</h4>
                <p className="text-muted" style={{ margin: '0 auto', fontSize: '13px', maxWidth: '480px' }}>
                  As team members complete project tasks and receive formal review sign-off, completed deliverables with exact date and time timestamps will automatically be recorded here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dailyActivity.map((act) => (
                  <div 
                    key={act.taskId} 
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      padding: '16px 20px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '8px', 
                        background: 'var(--color-success-bg)', 
                        color: 'var(--color-success)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '20px',
                        flexShrink: 0 
                      }}>
                        <i className="ph-bold ph-check"></i>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                            {act.taskCode}
                          </span>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                            {act.title}
                          </strong>
                          <span className="badge" style={{ fontSize: '10px', background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                            ✓ {act.status}
                          </span>
                        </div>
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                          Delivered by: <strong>{act.assignee}</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <i className="ph ph-calendar"></i> {act.date ? formatDate(act.date) : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <i className="ph ph-clock"></i> {act.time}
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (navigateTo) navigateTo('tasks', 'detail');
                        }} 
                        className="btn btn-secondary" 
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        View Details &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // LIST VIEW (PDF Section 7.10)
  // Table: Code, Name, Owner, Members Count, Progress, Status
  // ==========================================
  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Header with Title & "+ New Project" Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Projects Management</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Enterprise portfolio, delivery progress, and project assignments.
          </p>
        </div>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Project
          </button>
        )}
      </div>

      {/* Member Info Notice */}
      {isMember && (
        <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info)', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', color: 'var(--text-primary)' }}>
          ℹ️ <strong>Member View:</strong> Showing projects assigned to you. Project creation and allocations are managed by Project Managers and Admins.
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Search by project name, code, or owner..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            className="form-control" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '13px', width: '130px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Planning">Planning</option>
            <option value="Archived">Archived</option>
          </select>
          <span className="badge badge-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            {filteredProjects.length} Projects
          </span>
        </div>
      </div>

      {/* New Project Modal */}
      {showCreateModal && isManagerOrAdmin && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '22px', borderRadius: '8px', marginBottom: '22px' }}>
          <h4 style={{ margin: '0 0 14px 0' }}>Create New Project</h4>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Project Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Mobile App Redesign" 
                  value={newProject.name} 
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} 
                  required 
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Project Code</label>
                <div style={{ padding: '8px 12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ph-bold ph-lightning"></i> Auto-assigned by system (e.g. PRJ-{String(projects.length + 1).padStart(3, '0')})
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Project Owner / PM</label>
                <select 
                  className="form-control" 
                  value={newProject.owner} 
                  onChange={(e) => setNewProject({ ...newProject, owner: e.target.value })}
                  style={{ fontSize: '13px' }}
                >
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Description</label>
              <textarea 
                className="form-control" 
                placeholder="Key project goals, deliverables, and architecture overview..." 
                rows="2"
                value={newProject.description} 
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} 
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div style={{ padding: '30px', textAlign: 'center' }} className="text-muted">Loading projects...</div>
      )}

      {/* Projects Table per PDF Section 7.10 (Columns: code, name, owner, members count, progress, status) */}
      {!loading && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px 10px' }}>Code</th>
                <th style={{ padding: '12px 10px' }}>Project Name</th>
                <th style={{ padding: '12px 10px' }}>Owner</th>
                <th style={{ padding: '12px 10px' }}>Members</th>
                <th style={{ padding: '12px 10px', minWidth: '180px' }}>Progress</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px 16px', textAlign: 'center' }} className="text-muted">
                    No projects found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(p => {
                  const mCount = p.membersCount ?? (p.members?.length || 0);
                  const prog = p.progress ?? 0;
                  return (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        fontSize: '14px',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <td style={{ padding: '14px 10px' }}>
                        <span className="badge badge-secondary" style={{ fontSize: '12px' }}>{p.code || 'PRJ-01'}</span>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <a 
                          href="#detail" 
                          onClick={(e) => { e.preventDefault(); openProjectDetail(p); }} 
                          style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          {p.name}
                        </a>
                        {p.description && (
                          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.description.length > 60 ? `${p.description.substring(0, 60)}...` : p.description}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>
                        {p.owner || 'Admin User'}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                          👥 {mCount} {mCount === 1 ? 'member' : 'members'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${prog}%`, height: '100%', background: prog === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: '12px', minWidth: '32px', fontWeight: 'bold' }}>{prog}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span className={`badge ${p.status === 'Active' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '12px' }}>
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '12px' }} 
                            onClick={() => openProjectDetail(p)}
                          >
                            View Details
                          </button>
                          {isManagerOrAdmin && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} 
                              onClick={() => handleDeleteProject(p.id, p.name)}
                              title="Delete project"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
