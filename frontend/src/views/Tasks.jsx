import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Calendar from './Calendar';
import { formatDate, formatDateTime } from '../utils/date';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:8000/api';

export default function Tasks({ subKey, onTabChange }) {
  const { user } = useAuth();
  const isManagerOrAdmin = ['Admin', 'PM', 'Team Lead', 'Manager', 'Management'].includes(user?.role);
  const isMember = !isManagerOrAdmin;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsList, setProjectsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([
    { name: 'Admin User', designation: 'Administrator', role: 'Admin', status: 'Active' },
    { name: 'Sophia Davis', designation: 'Project Manager', role: 'PM', status: 'Active' },
    { name: 'Liam Miller', designation: 'Team Lead', role: 'Team Lead', status: 'Active' },
    { name: 'Emily Watson', designation: 'Executive Director', role: 'Management', status: 'Active' },
    { name: 'Priya', designation: 'Frontend Developer', role: 'Employee', status: 'Active' }
  ]);

  // Employee real-time availability helpers (Strictly no task count numbers displayed per requirement)
  const getEmployeeActiveTaskCount = (empName) => {
    return tasks.filter(t => t.assignee === empName && ['Open', 'In Progress'].includes(t.status)).length;
  };

  const getEmployeeAvailability = (empName) => {
    const count = getEmployeeActiveTaskCount(empName);
    if (count === 0) return { status: 'Available', color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Available' };
    if (count <= 2) return { status: 'Active', color: 'var(--color-info)', bg: 'var(--color-info-bg)', label: 'Active' };
    return { status: 'Busy', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Busy' };
  };

  const [rawProjects, setRawProjects] = useState([]);

  // Filter assignable employees: Strictly excludes Admin and filters by selected project's members if defined
  const getAssignableEmployees = () => {
    const nonAdmins = employeesList.filter(emp => {
      const role = typeof emp === 'object' ? emp.role : '';
      const name = typeof emp === 'object' ? emp.name : emp;
      const email = typeof emp === 'object' ? emp.email : '';
      const isAdmin = (role && role.toLowerCase() === 'admin') ||
                      (name && name.toLowerCase().includes('admin')) ||
                      (email && email.toLowerCase().includes('admin'));
      return !isAdmin;
    });

    const currentProject = rawProjects.find(p => p.name === newTask.project || p.id === newTask.project);
    if (currentProject && Array.isArray(currentProject.members) && currentProject.members.length > 0) {
      const projectMembers = nonAdmins.filter(emp => {
        const empName = typeof emp === 'object' ? emp.name : emp;
        return currentProject.members.includes(empName) || (user?.name && empName === user.name);
      });
      if (projectMembers.length > 0) return projectMembers;
    }

    return nonAdmins;
  };

  const [newTask, setNewTask] = useState({ 
    title: '', 
    project: '', 
    priority: 'Medium', 
    assignee: user?.name || 'Priya', 
    dueDate: '',
    description: '' 
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const selectedTaskRef = useRef(selectedTask);
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  const [activeTab, setActiveTab] = useState(subKey || 'list');
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [mySearch, setMySearch] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('All');
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState('All');
  const [boardProjectFilter, setBoardProjectFilter] = useState('All');
  const [boardAssigneeFilter, setBoardAssigneeFilter] = useState('All');
  const [boardPriorityFilter, setBoardPriorityFilter] = useState('All');
  const [reopenTaskId, setReopenTaskId] = useState(null);
  const [reopenComment, setReopenComment] = useState('');
  const [reviewSubTab, setReviewSubTab] = useState('pending');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Synchronize active tab locally and notify parent navigation
  const changeTab = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Fetch all tasks from backend database
  const loadTasks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);

        // Always refresh selectedTask with complete subtasks and comments from server
        const currentTargetId = selectedTaskRef.current?.id || (data.length > 0 ? data[0].id : null);
        if (currentTargetId) {
          try {
            const detailRes = await fetch(`${API_BASE_URL}/tasks/${currentTargetId}`);
            if (detailRes.ok) {
              const fullDetail = await detailRes.json();
              setSelectedTask(fullDetail);
            }
          } catch (e) {
            console.error('Error loading detailed task info:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tasks from backend:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch projects and employees for dropdowns
  const loadMetadata = async () => {
    try {
      const [projRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`).catch(() => null),
        fetch(`${API_BASE_URL}/employees`).catch(() => null)
      ]);

      if (projRes && projRes.ok) {
        const projs = await projRes.json();
        setRawProjects(projs);
        if (projs.length) {
          setProjectsList(projs.map(p => p.name));
          setNewTask(prev => ({ ...prev, project: prev.project || projs[0].name }));
        }
      }

      if (empRes && empRes.ok) {
        const emps = await empRes.json();
        if (emps.length) setEmployeesList(emps);
      }
    } catch (err) {
      console.warn('Could not load projects/employees metadata:', err);
    }
  };

  // Auto-align assignee to available related project members
  useEffect(() => {
    const assignables = getAssignableEmployees();
    if (assignables.length > 0) {
      const isCurrentValid = assignables.some(e => (typeof e === 'object' ? e.name : e) === newTask.assignee);
      if (!isCurrentValid) {
        const first = assignables[0];
        setNewTask(prev => ({ ...prev, assignee: typeof first === 'object' ? first.name : first }));
      }
    }
  }, [newTask.project, employeesList, rawProjects]);

  useEffect(() => {
    loadTasks();
    loadMetadata();

    const handleUpdate = () => {
      loadTasks(true); // silent background refresh so no UI flicker
      loadMetadata();
    };
    window.addEventListener('pm_data_updated', handleUpdate);
    return () => window.removeEventListener('pm_data_updated', handleUpdate);
  }, []);

  // Sync subKey if passed from parent props and apply project pre-filter (PDF Section 6.4)
  useEffect(() => {
    if (subKey && subKey !== activeTab) {
      setActiveTab(subKey);
    }
    // Instant refresh whenever subKey changes so all views stay 100% in sync!
    loadTasks();
    loadMetadata();

    const preProj = sessionStorage.getItem('task_project_filter');
    if (preProj) {
      setBoardProjectFilter(preProj);
      setListSearch(preProj);
      setNewTask(prev => ({ ...prev, project: preProj }));
    }
  }, [subKey]);

  // Auto-select and load full task details whenever in detail tab
  useEffect(() => {
    if (activeTab === 'detail' && tasks.length > 0) {
      const target = selectedTaskRef.current || tasks[0];
      if (target?.id) {
        handleSelectTask(target);
      }
    }
  }, [activeTab, tasks.length]);

  // Load detailed info (subtasks & comments) when selecting a task
  const handleSelectTask = async (task) => {
    setSelectedTask(task);
    changeTab('detail');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${task.id}`);
      if (res.ok) {
        const detailedData = await res.json();
        setSelectedTask(detailedData);
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
    }
  };

  // Create new task via POST API
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          status: newTask.status || 'Open',
          createdBy: user?.name ? `${user.name} (${user.role})` : 'Sophia Davis (PM)',
          assignedBy: user?.name ? `${user.name} (${user.role})` : 'Sophia Davis (PM)'
        })
      });

      if (res.ok) {
        const createdItem = await res.json();
        setTasks(prev => [createdItem, ...prev]);
        setNewTask({ 
          title: '', 
          project: projectsList[0] || 'Portal V2', 
          priority: 'Medium', 
          assignee: user?.name || 'Sophia Davis', 
          dueDate: '',
          description: '',
          status: 'Open'
        });
        window.dispatchEvent(new CustomEvent('pm_data_updated', { detail: createdItem }));
        changeTab('list');
      } else {
        alert('Failed to create task in backend');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Error connecting to backend server');
    }
  };

  // Update status via PATCH API
  const updateStatus = async (id, newStatus) => {
    // Optimistic UI update
    const prog = (newStatus === 'Closed' || newStatus === 'Completed') ? 100 : (newStatus === 'Review' ? 85 : (newStatus === 'In Progress' ? 50 : 0));
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, progress: prog } : t));
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask(prev => ({ ...prev, status: newStatus, progress: prog }));
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progress: prog })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask(updated);
        }
        window.dispatchEvent(new CustomEvent('pm_data_updated', { detail: updated }));
      } else {
        loadTasks(); // rollback on failure
      }
    } catch (err) {
      console.error('Error updating status in backend:', err);
      loadTasks();
    }
  };

  // Add a comment to the selected task
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    try {
      const authorName = user?.name || 'Sophia Davis';
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment, author: authorName })
      });
      if (res.ok) {
        const added = await res.json();
        setSelectedTask(prev => ({
          ...prev,
          comments: [...(prev.comments || []), added]
        }));
        setNewComment('');
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Delete a comment (PDF Section 6.5)
  const handleDeleteComment = async (commentId) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedTask(prev => ({
          ...prev,
          comments: (prev.comments || []).filter(c => c.id !== commentId)
        }));
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Add a subtask to the selected task (PDF Section 6.6)
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim() || !selectedTask) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtask.trim(), isDone: false })
      });
      if (res.ok) {
        const added = await res.json();
        setSelectedTask(prev => ({
          ...prev,
          subtasks: [...(prev?.subtasks || []), added]
        }));
        setNewSubtask('');
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  // Toggle subtask status (PDF Section 6.6: Tick subtask)
  const handleToggleSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updated = await res.json();
        const currentSubs = selectedTask.subtasks || [];
        const newSubs = currentSubs.map(s => s.id === subtaskId ? updated : s);
        const doneCount = newSubs.filter(s => s.isDone).length;
        const newProg = newSubs.length > 0 ? Math.round((doneCount / newSubs.length) * 100) : selectedTask.progress;

        setSelectedTask(prev => ({ ...prev, subtasks: newSubs, progress: newProg }));
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, progress: newProg } : t));

        // Save progress to backend task
        await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: newProg })
        });

        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  // Delete a subtask (PDF Section 6.6)
  const handleDeleteSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const currentSubs = selectedTask.subtasks || [];
        const newSubs = currentSubs.filter(s => s.id !== subtaskId);
        const doneCount = newSubs.filter(s => s.isDone).length;
        const newProg = newSubs.length > 0 ? Math.round((doneCount / newSubs.length) * 100) : 0;

        setSelectedTask(prev => ({ ...prev, subtasks: newSubs, progress: newProg }));
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, progress: newProg } : t));

        await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: newProg })
        });

        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  // Update a single task field in place (PDF Section 6.1)
  const handleUpdateTaskField = async (field, val) => {
    if (!selectedTask) return;
    setSelectedTask(prev => ({ ...prev, [field]: val }));
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, [field]: val } : t));

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('pm_data_updated'));
      }
    } catch (err) {
      console.error(`Error updating task ${field}:`, err);
    }
  };

  // Delete task with confirmation (PDF Section 6.1)
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        window.dispatchEvent(new CustomEvent('pm_data_updated', { detail: { id: taskId, deleted: true } }));
        changeTab('list');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Sign off & Close task (PDF Section 7.12 & 9.1: Close -> Closed)
  const handleSignOffTask = async (taskId, notes = '') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Closed', progress: 100 } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => ({ ...prev, status: 'Closed', progress: 100 }));
    }

    try {
      await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed', progress: 100 })
      });

      const authorName = user?.name || 'Sophia Davis';
      await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[Formal Closure Sign-Off]: Task reviewed, approved, and closed${notes ? `: ${notes}` : '.'}`,
          author: authorName
        })
      });
    } catch (err) {
      console.error('Error signing off task:', err);
    }
    window.dispatchEvent(new CustomEvent('pm_data_updated'));
    await loadTasks();
  };

  // Reopen task with feedback comment (PDF Section 7.12 & 9.1: Reopen -> In Progress with comment to assignee)
  const handleReopenTask = async (taskId) => {
    updateStatus(taskId, 'In Progress');
    if (reopenComment.trim()) {
      try {
        const authorName = user?.name || 'Sophia Davis';
        await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[Reopened for Review]: ${reopenComment}`,
            author: authorName
          })
        });
      } catch (err) {
        console.error('Error posting reopen feedback comment:', err);
      }
    }
    setReopenTaskId(null);
    setReopenComment('');
    window.dispatchEvent(new CustomEvent('pm_data_updated'));
    await loadTasks();
  };

  // Reopen closed task (PDF Section 9.2: Reopen from Closed – Manager/Admin only)
  const handleReopenClosedTask = async (taskId) => {
    updateStatus(taskId, 'In Progress');
    if (reopenComment.trim()) {
      try {
        const authorName = user?.name || 'Sophia Davis';
        await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[Reopened from Closed]: ${reopenComment}`,
            author: authorName
          })
        });
      } catch (err) {
        console.error('Error posting reopen from closed comment:', err);
      }
    }
    setReopenTaskId(null);
    setReopenComment('');
    window.dispatchEvent(new CustomEvent('pm_data_updated'));
    await loadTasks();
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }} className="text-muted">
          Loading tasks...
        </div>
      )}

      {/* 1. MY TASKS (PDF Section 7.4: Pre-filtered Task List with filters, sorting & row click to Task Detail) */}
      {!loading && activeTab === 'my' && (() => {
        const currentName = (user?.name || '').toLowerCase();
        const rawMyTasks = tasks.filter(t => {
          const assigned = (t.assignee || '').toLowerCase();
          return assigned.includes(currentName) || currentName.includes(assigned);
        });

        const filteredMyTasks = rawMyTasks.filter(t => {
          const matchesSearch = !mySearch || 
            (t.title && t.title.toLowerCase().includes(mySearch.toLowerCase())) ||
            (t.project && t.project.toLowerCase().includes(mySearch.toLowerCase()));
          const matchesStatus = myStatusFilter === 'All' || t.status === myStatusFilter;
          return matchesSearch && matchesStatus;
        });

        const inProgressCount = rawMyTasks.filter(t => t.status === 'In Progress').length;
        const completedCount = rawMyTasks.filter(t => ['Completed', 'Closed'].includes(t.status)).length;
        const openCount = rawMyTasks.filter(t => ['Open', 'Assigned'].includes(t.status)).length;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>TOTAL ASSIGNED</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px' }}>{rawMyTasks.length}</h3>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid var(--color-info)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>IN PROGRESS</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--color-info)' }}>{inProgressCount}</h3>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid var(--color-warning)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>OPEN / PENDING</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--color-warning)' }}>{openCount}</h3>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid var(--color-success)' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>COMPLETED</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--color-success)' }}>{completedCount}</h3>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="Search tasks by title or project..."
                  className="form-control"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                  value={mySearch}
                  onChange={(e) => setMySearch(e.target.value)}
                />
                {mySearch && (
                  <button 
                    onClick={() => setMySearch('')} 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter Chips & Create Button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['All', 'Open', 'In Progress', 'Completed', 'Closed'].map(st => (
                    <button
                      key={st}
                      onClick={() => setMyStatusFilter(st)}
                      className={`btn ${myStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '16px' }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setNewTask(prev => ({ 
                      ...prev, 
                      assignee: user?.name || prev.assignee,
                      project: prev.project || projectsList[0] || 'Personal / Internal'
                    }));
                    changeTab('create');
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  title="Create a new task assigned to yourself"
                >
                  <i className="ph-bold ph-plus"></i> + Create My Task
                </button>
              </div>
            </div>

            {/* My Tasks Table per PDF Section 7.4 */}
            <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '12px 16px' }}>Task Title</th>
                    <th style={{ padding: '12px' }}>Project</th>
                    <th style={{ padding: '12px' }}>Assigned By</th>
                    <th style={{ padding: '12px' }}>Priority</th>
                    <th style={{ padding: '12px' }}>Due Date</th>
                    <th style={{ padding: '12px', minWidth: '120px' }}>Progress</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMyTasks.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '36px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span className="text-muted" style={{ fontSize: '14px' }}>
                            {rawMyTasks.length === 0 
                              ? `No tasks currently assigned to ${user?.name || 'you'}.` 
                              : 'No tasks match your search or filter.'}
                          </span>
                          <button 
                            onClick={() => changeTab('create')} 
                            className="btn btn-primary" 
                            style={{ fontSize: '12px', marginTop: '6px' }}
                          >
                            + Create / Assign Task
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMyTasks.map(t => {
                      const prog = typeof t.progress === 'number' ? t.progress : 0;
                      return (
                        <tr 
                          key={t.id} 
                          style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', transition: 'background 0.2s' }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                                  {t.code || `TSK-${String(t.id).padStart(3, '0')}`}
                                </span>
                                <a 
                                  href="#detail" 
                                  onClick={(e) => { e.preventDefault(); handleSelectTask(t); }} 
                                  style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}
                                >
                                  {t.title}
                                </a>
                              </div>
                              {t.description && (
                                <span className="text-muted" style={{ fontSize: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }} className="text-muted">
                            <span style={{ fontWeight: '500' }}>{t.project || 'General'}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                background: 'rgba(99, 102, 241, 0.15)', 
                                color: 'var(--color-primary)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 700, 
                                fontSize: '10px' 
                              }}>
                                {(t.assignedBy || t.createdBy || 'Sophia Davis').charAt(0).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {t.assignedBy || t.createdBy || 'Sophia Davis (PM)'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                background: t.priority === 'High' ? 'var(--color-danger-bg)' : t.priority === 'Medium' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                                color: t.priority === 'High' ? 'var(--color-danger)' : t.priority === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'
                              }}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }} className="text-muted">
                            {t.dueDate ? formatDate(t.dueDate) : 'No due date'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${prog}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '28px' }}>{prog}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span 
                              className={`badge badge-${t.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`}
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-block' }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleSelectTask(t)} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              Open Details →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 2. TASK LIST (PDF Section 6.2: Search box, Quick tabs, Progress bar, click to Task Detail) */}
      {!loading && activeTab === 'list' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];

        const filteredTasks = tasks.filter(t => {
          const matchesSearch = !listSearch ||
            (t.title && t.title.toLowerCase().includes(listSearch.toLowerCase())) ||
            (t.project && t.project.toLowerCase().includes(listSearch.toLowerCase())) ||
            (t.assignee && t.assignee.toLowerCase().includes(listSearch.toLowerCase()));

          let matchesTab = true;
          if (listFilter === 'In Progress') {
            matchesTab = t.status === 'In Progress';
          } else if (listFilter === 'Completed') {
            matchesTab = ['Completed', 'Closed'].includes(t.status);
          } else if (listFilter === 'Overdue') {
            matchesTab = Boolean(t.dueDate && t.dueDate < todayStr && !['Completed', 'Closed'].includes(t.status));
          }

          return matchesSearch && matchesTab;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search & Quick Tabs Toolbar per PDF Section 6.2 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="Search all tasks by title, project, or assignee..."
                  className="form-control"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                />
                {listSearch && (
                  <button 
                    onClick={() => setListSearch('')} 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Tabs & New Task Action */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['All', 'In Progress', 'Completed', 'Overdue'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setListFilter(tab)}
                      className={`btn ${listFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '16px' }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => changeTab('create')}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  title="Create a new task assignment"
                >
                  <i className="ph-bold ph-plus"></i> + New Task
                </button>
              </div>
            </div>

            {/* Task List Table */}
            <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '12px 16px' }}>Task Title</th>
                    <th style={{ padding: '12px' }}>Project</th>
                    <th style={{ padding: '12px' }}>Assignee</th>
                    <th style={{ padding: '12px' }}>Assigned By</th>
                    <th style={{ padding: '12px' }}>Priority</th>
                    <th style={{ padding: '12px' }}>Due Date</th>
                    <th style={{ padding: '12px', minWidth: '120px' }}>Progress</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '36px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span className="text-muted" style={{ fontSize: '14px' }}>
                            {tasks.length === 0 ? 'No tasks found. Use "+ Create Task" to add one!' : 'No tasks match your search or filter.'}
                          </span>
                          <button 
                            onClick={() => changeTab('create')} 
                            className="btn btn-primary" 
                            style={{ fontSize: '12px', marginTop: '6px' }}
                          >
                            + Create Task
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(t => {
                      const prog = typeof t.progress === 'number' ? t.progress : 0;
                      return (
                        <tr 
                          key={t.id} 
                          style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', transition: 'background 0.2s' }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                                  {t.code || `TSK-${String(t.id).padStart(3, '0')}`}
                                </span>
                                <a 
                                  href="#detail" 
                                  onClick={(e) => { e.preventDefault(); handleSelectTask(t); }} 
                                  style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}
                                >
                                  {t.title}
                                </a>
                              </div>
                              {t.description && (
                                <span className="text-muted" style={{ fontSize: '12px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }} className="text-muted">{t.project}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: '500' }}>{t.assignee}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                background: 'rgba(16, 185, 129, 0.15)', 
                                color: 'var(--color-success)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 700, 
                                fontSize: '10px' 
                              }}>
                                {(t.assignedBy || t.createdBy || 'Sophia Davis').charAt(0).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {t.assignedBy || t.createdBy || 'Sophia Davis (PM)'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                background: t.priority === 'High' ? 'var(--color-danger-bg)' : t.priority === 'Medium' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                                color: t.priority === 'High' ? 'var(--color-danger)' : t.priority === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'
                              }}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }} className="text-muted">{t.dueDate ? formatDate(t.dueDate) : 'N/A'}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${prog}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '28px' }}>{prog}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span 
                              className={`badge badge-${t.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`}
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-block' }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleSelectTask(t)} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              Open Details →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 3. KANBAN BOARD (PDF Section 7.6: Filter bar, Drag to change status, click card to open detail, + to add) */}
      {!loading && activeTab === 'board' && (() => {
        const boardColumns = ['Open', 'In Progress', 'Review', 'Completed', 'Closed'];

        // Apply filters
        const filteredBoardTasks = tasks.filter(t => {
          const matchProj = boardProjectFilter === 'All' || t.project === boardProjectFilter;
          const matchAssignee = boardAssigneeFilter === 'All' || t.assignee === boardAssigneeFilter;
          const matchPriority = boardPriorityFilter === 'All' || t.priority === boardPriorityFilter;
          return matchProj && matchAssignee && matchPriority;
        });

        // Step-by-step unidirectional workflow (Open -> In Progress -> Review -> Closed, No Undo)
        const handleMoveNext = (e, task) => {
          e.stopPropagation();
          const nextStatusMap = {
            'Open': 'In Progress',
            'In Progress': 'Review',
            'Review': 'Closed'
          };
          const targetStatus = nextStatusMap[task.status];
          if (!targetStatus) return;

          const isMemberRole = !['Admin', 'PM', 'Team Lead', 'Manager', 'Management'].includes(user?.role);
          if (targetStatus === 'Closed' && isMemberRole) {
            alert('Members cannot close tasks directly. Manager/PM authorizes formal sign-off in Review & Closure.');
            return;
          }

          updateStatus(task.id, targetStatus);
        };

        const handleDragStart = (e, taskId) => {
          setDraggedTaskId(taskId);
          e.dataTransfer.setData('text/plain', taskId);
          e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e, colStatus) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverCol !== colStatus) {
            setDragOverCol(colStatus);
          }
        };

        const handleDragLeave = (e, colStatus) => {
          if (dragOverCol === colStatus) {
            setDragOverCol(null);
          }
        };

        const handleDrop = (e, targetStatus) => {
          e.preventDefault();
          setDragOverCol(null);
          const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
          setDraggedTaskId(null);

          if (!taskId) return;
          const task = tasks.find(t => t.id === taskId);
          if (!task || task.status === targetStatus) return;

          const isMemberRole = !['Admin', 'PM', 'Team Lead', 'Manager', 'Management'].includes(user?.role);
          if (targetStatus === 'Closed' && isMemberRole) {
            alert('Members cannot close tasks directly. Manager/PM authorizes formal sign-off in Review & Closure.');
            return;
          }

          updateStatus(taskId, targetStatus);
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Filter Bar per PDF Section 7.6 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
              <span className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Filters:</span>
              
              <select 
                value={boardProjectFilter} 
                onChange={(e) => setBoardProjectFilter(e.target.value)} 
                className="form-control" 
                style={{ width: 'auto', fontSize: '13px', padding: '6px 10px' }}
              >
                <option value="All">All Projects</option>
                {projectsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select 
                value={boardAssigneeFilter} 
                onChange={(e) => setBoardAssigneeFilter(e.target.value)} 
                className="form-control" 
                style={{ width: 'auto', fontSize: '13px', padding: '6px 10px' }}
              >
                <option value="All">All Assignees</option>
                {employeesList.filter(emp => {
                  const r = typeof emp === 'object' ? emp.role : '';
                  const n = typeof emp === 'object' ? emp.name : emp;
                  return !(r === 'Admin' || (n && n.toLowerCase().includes('admin')));
                }).map(emp => {
                  const empName = typeof emp === 'object' ? emp.name : emp;
                  return <option key={empName} value={empName}>{empName}</option>;
                })}
              </select>

              <select 
                value={boardPriorityFilter} 
                onChange={(e) => setBoardPriorityFilter(e.target.value)} 
                className="form-control" 
                style={{ width: 'auto', fontSize: '13px', padding: '6px 10px' }}
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {(boardProjectFilter !== 'All' || boardAssigneeFilter !== 'All' || boardPriorityFilter !== 'All') && (
                <button 
                  onClick={() => {
                    setBoardProjectFilter('All');
                    setBoardAssigneeFilter('All');
                    setBoardPriorityFilter('All');
                  }} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Kanban Columns Horizontal Workflow */}
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start', WebkitOverflowScrolling: 'touch' }}>
              {boardColumns.map(colStatus => {
                const columnTasks = filteredBoardTasks.filter(t => t.status === colStatus);
                const isOver = dragOverCol === colStatus;
                return (
                  <div 
                    key={colStatus} 
                    onDragOver={(e) => handleDragOver(e, colStatus)}
                    onDragLeave={(e) => handleDragLeave(e, colStatus)}
                    onDrop={(e) => handleDrop(e, colStatus)}
                    style={{ 
                      flex: '1 1 240px',
                      minWidth: '240px',
                      background: isOver ? 'var(--card-bg)' : 'var(--bg-secondary)', 
                      padding: '14px', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      minHeight: '420px',
                      border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--border-color)',
                      boxShadow: isOver ? '0 0 16px var(--color-primary-glow, rgba(99,102,241,0.2))' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Column Header with Title, Count and "+" Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{colStatus}</span>
                        <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>{columnTasks.length}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setNewTask(prev => ({ ...prev, status: colStatus }));
                          changeTab('create');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '14px', lineHeight: 1 }}
                        title={`Add task to ${colStatus}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Column Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {columnTasks.length === 0 ? (
                        <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                          No tasks in this stage
                        </div>
                      ) : (
                        columnTasks.map(t => {
                          const prog = typeof t.progress === 'number' ? t.progress : 0;
                          return (
                            <div 
                              key={t.id} 
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onClick={() => handleSelectTask(t)}
                              className="card" 
                              style={{ 
                                padding: '14px', 
                                background: 'var(--card-bg)', 
                                margin: 0, 
                                borderRadius: '6px',
                                borderLeft: `4px solid ${t.priority === 'High' ? 'var(--color-danger)' : t.priority === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'}`, 
                                cursor: 'grab',
                                opacity: draggedTaskId === t.id ? 0.45 : 1,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{t.title}</strong>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    fontSize: '10px', 
                                    padding: '2px 6px',
                                    background: t.priority === 'High' ? 'var(--color-danger-bg)' : t.priority === 'Medium' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                                    color: t.priority === 'High' ? 'var(--color-danger)' : t.priority === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'
                                  }}
                                >
                                  {t.priority}
                                </span>
                              </div>

                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                <span>{t.project}</span>
                              </div>

                              {prog > 0 && (
                                <div style={{ marginBottom: '8px' }}>
                                  <div style={{ background: 'var(--bg-secondary)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${prog}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '3px' }} />
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.assignee}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    By: {t.assignedBy || t.createdBy || 'Sophia Davis (PM)'}
                                  </span>
                                </div>
                                <span>{t.dueDate ? formatDate(t.dueDate) : 'No due date'}</span>
                              </div>

                              {/* Forward Step Action Button (No Undo) */}
                              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {t.status !== 'Closed' ? (
                                  <button
                                    onClick={(e) => handleMoveNext(e, t)}
                                    className="btn btn-primary"
                                    style={{
                                      fontSize: '11px',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                    title={`Move to next status (${t.status === 'Open' ? 'In Progress' : t.status === 'In Progress' ? 'Review' : 'Closed'})`}
                                  >
                                    <span>Next</span>
                                    <i className="ph-bold ph-arrow-right" style={{ fontSize: '10px' }}></i>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="ph-fill ph-check-circle"></i> Closed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 4. CALENDAR VIEW (PDF Section 6.10: Month view, click to open Task Detail) */}
      {!loading && activeTab === 'calendar' && (
        <Calendar 
          tasks={tasks} 
          onSelectTask={handleSelectTask} 
          onNavigateCreate={(dateStr) => {
            setNewTask(prev => ({ ...prev, dueDate: dateStr || '' }));
            changeTab('create');
          }}
          embedded={true} 
        />
      )}

      {/* 5. CREATE TASK (Enterprise Responsive 2-Column Layout) */}
      {!loading && activeTab === 'create' && (
        <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: '20px', alignItems: 'start' }}>
          
          {/* COLUMN 1: Task Specifications */}
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Task Details & Deliverables</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>Define the scope, deliverables, and timeline for this task.</p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Task Title *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter task summary or objective..." 
                value={newTask.title} 
                onChange={e => setNewTask({...newTask, title: e.target.value})} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
              <textarea 
                className="form-control" 
                placeholder="Detailed task description, acceptance criteria, and technical deliverables..." 
                rows="5"
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Priority</label>
                <select className="form-control" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Due Date</label>
                <input type="date" className="form-control" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px', fontSize: '14px', fontWeight: 600 }}>
              Create Task Assignment
            </button>
          </div>

          {/* COLUMN 2: Project & Team Member Allocation */}
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Project & Member Allocation</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>Select destination project and allocate to an available team member.</p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Project *</label>
              {projectsList.length > 0 ? (
                <select className="form-control" value={newTask.project} onChange={e => setNewTask({...newTask, project: e.target.value})}>
                  <option value="">Select project...</option>
                  {projectsList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="Personal / Internal">Personal / Internal</option>
                </select>
              ) : (
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter project name..." 
                  value={newTask.project} 
                  onChange={e => setNewTask({...newTask, project: e.target.value})} 
                />
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Assignee *</label>
                {user?.name && (
                  <button
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, assignee: user.name }))}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    title="Quick self-assign to yourself"
                  >
                    <i className="ph-bold ph-user"></i> Assign to Myself ({user.name})
                  </button>
                )}
              </div>
              <select className="form-control" value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})}>
                <option value="">Select available member...</option>
                {user?.name && !getAssignableEmployees().some(e => (typeof e === 'object' ? e.name : e) === user.name) && (
                  <option value={user.name}>{user.name} (Myself)</option>
                )}
                {getAssignableEmployees().map(emp => {
                  const empName = typeof emp === 'object' ? emp.name : emp;
                  const empDesig = typeof emp === 'object' ? emp.designation : 'Team Member';
                  const avail = getEmployeeAvailability(empName);
                  const isSelf = empName === user?.name;
                  return (
                    <option key={empName} value={empName}>
                      {empName} {isSelf ? '(Myself)' : ''} — {empDesig} [{avail.status}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Interactive Team Availability & Workload Grid */}
            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                  Available Team Members (Click to Assign):
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '10px' }}>
                  {getAssignableEmployees().length} Available
                </span>
              </div>

              {getAssignableEmployees().length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                  No eligible team members allocated to this project.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {getAssignableEmployees().map(emp => {
                    const empName = typeof emp === 'object' ? emp.name : emp;
                    const empDesig = typeof emp === 'object' ? emp.designation : 'Team Member';
                    const isSelected = newTask.assignee === empName;
                    const avail = getEmployeeAvailability(empName);

                    return (
                      <div
                        key={empName}
                        onClick={() => setNewTask(prev => ({ ...prev, assignee: empName }))}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                          border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Click to assign task to ${empName}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {empName.charAt(0).toUpperCase()}
                          </span>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {empName}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {empDesig}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: avail.bg,
                          color: avail.color,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          ● {avail.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </form>
      )}

      {/* 5. TASK DETAIL (Modern 2-Column Enterprise Layout & Empty State) */}
      {!loading && activeTab === 'detail' && selectedTask && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', alignItems: 'start' }} className="task-detail-grid">
          
          {/* LEFT COLUMN: Main Task Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Breadcrumb & Task Header */}
            <div style={{ background: 'var(--bg-secondary)', padding: '22px 24px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }} className="text-muted">
                  <button 
                    onClick={() => changeTab('list')} 
                    className="btn btn-secondary" 
                    style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}
                    title="Back to Task List"
                  >
                    &larr; Back to List
                  </button>
                  <span>Projects &rsaquo; <strong>{selectedTask.project}</strong></span>
                </div>
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                  {selectedTask.code || `TSK-${String(selectedTask.id).padStart(3, '0')}`}
                </span>
              </div>

              <h2 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {selectedTask.title}
              </h2>

              {/* Task Description */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Description & Deliverables
                </label>
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', background: 'var(--card-bg)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {selectedTask.description || 'No description provided for this task.'}
                </div>
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="card" style={{ padding: '20px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ph-bold ph-check-square" style={{ color: 'var(--color-primary)', fontSize: '18px' }}></i>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Subtasks Checklist</h4>
                </div>
                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  {(selectedTask.subtasks || []).filter(s => s.isDone).length} of {(selectedTask.subtasks || []).length} completed
                </span>
              </div>

              {/* Mini Subtask Progress Bar */}
              {(selectedTask.subtasks || []).length > 0 && (
                <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', height: '6px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.round(((selectedTask.subtasks || []).filter(s => s.isDone).length / (selectedTask.subtasks || []).length) * 100)}%`, 
                    background: 'var(--color-success)', 
                    height: '100%', 
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}

              {/* Subtask Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {(selectedTask.subtasks && selectedTask.subtasks.length > 0) ? (
                  selectedTask.subtasks.map(s => (
                    <div 
                      key={s.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 14px', 
                        background: 'var(--card-bg)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0, flex: 1 }}>
                        <input 
                          type="checkbox" 
                          checked={Boolean(s.isDone)} 
                          onChange={() => handleToggleSubtask(s.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                        />
                        <span style={{ 
                          fontSize: '13px', 
                          textDecoration: s.isDone ? 'line-through' : 'none', 
                          opacity: s.isDone ? 0.5 : 1,
                          color: 'var(--text-primary)'
                        }}>
                          {s.title}
                        </span>
                      </label>
                      <button 
                        onClick={() => handleDeleteSubtask(s.id)} 
                        className="btn" 
                        style={{ padding: '2px 8px', fontSize: '13px', color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title="Delete subtask"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted" style={{ margin: '8px 0', fontSize: '13px', textAlign: 'center' }}>No subtasks created yet.</p>
                )}
              </div>

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Add new subtask item..." 
                  value={newSubtask} 
                  onChange={e => setNewSubtask(e.target.value)} 
                  style={{ fontSize: '13px', padding: '9px 12px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '9px 16px', whiteSpace: 'nowrap' }}>
                  + Add Item
                </button>
              </form>
            </div>

            {/* Team Discussion & Activity */}
            <div className="card" style={{ padding: '20px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <i className="ph-bold ph-chats-circle" style={{ color: 'var(--color-primary)', fontSize: '18px' }}></i>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Team Discussion & Updates</h4>
              </div>

              {/* Comments Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {(selectedTask.comments && selectedTask.comments.length > 0) ? (
                  selectedTask.comments.map(c => (
                    <div key={c.id} style={{ padding: '14px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }} className="text-muted">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: 'var(--color-primary-glow)', 
                            color: 'var(--color-primary)', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '11px' 
                          }}>
                            {(c.author || 'U').charAt(0).toUpperCase()}
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{c.author}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{c.createdAt ? formatDateTime(c.createdAt) : ''}</span>
                          {(c.author === user?.name || ['Admin', 'PM'].includes(user?.role)) && (
                            <button 
                              onClick={() => handleDeleteComment(c.id)} 
                              className="btn" 
                              style={{ padding: '0 4px', fontSize: '12px', color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              title="Delete comment"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', paddingLeft: '32px' }}>
                        {c.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted" style={{ margin: '8px 0', fontSize: '13px', textAlign: 'center' }}>
                    No updates posted yet. Leave a note or comment for the team.
                  </p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Write a comment or progress update..." 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  style={{ fontSize: '13px', padding: '9px 12px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '9px 16px', whiteSpace: 'nowrap' }}>
                  Post Comment
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT COLUMN: Sidebar Task Attributes & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' }}>
            
            {/* Workflow Quick Actions Card */}
            <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '0.5px' }}>
                Workflow Actions
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedTask.status !== 'Review' && selectedTask.status !== 'Closed' && (
                  <button 
                    onClick={() => updateStatus(selectedTask.id, 'Review')} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '13px', padding: '9px', color: 'var(--color-primary)', borderColor: 'var(--color-primary)', justifyContent: 'center' }}
                    title="Submit task for formal managerial review"
                  >
                    <i className="ph-bold ph-paper-plane-tilt" style={{ marginRight: '6px' }}></i>
                    Send for Review
                  </button>
                )}
                {selectedTask.status !== 'Completed' && selectedTask.status !== 'Closed' && (
                  <button 
                    onClick={() => handleUpdateTaskField('status', 'Completed')} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '13px', padding: '9px', color: 'var(--color-success)', borderColor: 'var(--color-success)', justifyContent: 'center' }}
                  >
                    ✓ Mark Complete
                  </button>
                )}
                {isManagerOrAdmin && ['Review', 'Completed'].includes(selectedTask.status) && (
                  <button 
                    onClick={() => handleSignOffTask(selectedTask.id)} 
                    className="btn btn-primary" 
                    style={{ width: '100%', fontSize: '13px', padding: '9px', background: 'var(--color-success)', borderColor: 'var(--color-success)', justifyContent: 'center' }}
                  >
                    ✓ Sign Off & Close
                  </button>
                )}
                {isManagerOrAdmin && (
                  <button 
                    onClick={() => handleDeleteTask(selectedTask.id)} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '12px', padding: '8px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', justifyContent: 'center' }}
                    title="Permanently remove task"
                  >
                    <i className="ph ph-trash" style={{ marginRight: '6px' }}></i>
                    Delete Task
                  </button>
                )}
              </div>
            </div>

            {/* Task Attributes Meta Card */}
            <div className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', letterSpacing: '0.5px' }}>
                Task Details
              </label>

              {/* Status */}
              <div>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Status</span>
                <span 
                  className={`badge badge-${selectedTask.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`}
                  style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '4px', display: 'inline-block' }}
                >
                  {selectedTask.status}
                </span>
              </div>

              {/* Assignee */}
              <div>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Assignee</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'var(--color-primary-glow)', 
                    color: 'var(--color-primary)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '12px' 
                  }}>
                    {(selectedTask.assignee || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedTask.assignee || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Assigned By */}
              <div>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Assigned By</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: 'var(--color-success)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '12px' 
                  }}>
                    {(selectedTask.assignedBy || selectedTask.createdBy || 'Sophia Davis').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                      {selectedTask.assignedBy || selectedTask.createdBy || 'Sophia Davis (PM)'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Project Lead / Assignor</span>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Priority</span>
                <span 
                  className="badge" 
                  style={{ 
                    fontSize: '12px',
                    padding: '5px 12px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    background: selectedTask.priority === 'High' ? 'var(--color-danger-bg)' : selectedTask.priority === 'Medium' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                    color: selectedTask.priority === 'High' ? 'var(--color-danger)' : selectedTask.priority === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'
                  }}
                >
                  {selectedTask.priority || 'Medium'}
                </span>
              </div>

              {/* Due Date */}
              <div>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Due Date</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ph ph-calendar" style={{ fontSize: '16px', color: 'var(--text-muted)' }}></i>
                  <span>{selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'No Due Date'}</span>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Progress</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{selectedTask.progress || 0}%</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedTask.progress || 0}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* EMPTY STATE: When in detail tab and no task is selected */}
      {!loading && activeTab === 'detail' && !selectedTask && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '14px'
            }}>
              <i className="ph ph-clipboard-text"></i>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Task Selected
            </h3>
            <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 18px auto' }}>
              Choose any task from below to view full specifications, checklist items, and team discussion.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => changeTab('create')} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
                + Create New Task
              </button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Available Tasks (Click to Open Detail):</span>
                <span className="badge badge-secondary">{tasks.length} Total</span>
              </div>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <th style={{ padding: '10px 16px' }}>Task Title</th>
                    <th style={{ padding: '10px' }}>Project</th>
                    <th style={{ padding: '10px' }}>Assignee</th>
                    <th style={{ padding: '10px' }}>Priority</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr 
                      key={t.id} 
                      onClick={() => handleSelectTask(t)}
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '13px', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-primary)' }}>{t.title}</td>
                      <td style={{ padding: '12px' }} className="text-muted">{t.project}</td>
                      <td style={{ padding: '12px' }}>{t.assignee}</td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 6px' }}>{t.priority}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${t.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`} style={{ padding: '3px 8px', fontSize: '11px' }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                          View Detail →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. REVIEW & CLOSURE (PDF Section 7.12, 9.1 & 9.2: Close -> Closed, Reopen -> In Progress with comment) */}
      {!loading && activeTab === 'review' && (() => {
        const isManagerOrAdmin = ['Admin', 'PM', 'Team Lead', 'Manager', 'Management'].includes(user?.role);
        const reviewPendingTasks = tasks.filter(t => ['Completed', 'Review'].includes(t.status));
        const closedTasks = tasks.filter(t => t.status === 'Closed');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Review & Closure Sign-off</h4>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                  Formal managerial sign-off and closure workflow per enterprise standard.
                </p>
              </div>
              
              {/* Review Sub-Tabs (Pending vs Closed) */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => { setReviewSubTab('pending'); setReopenTaskId(null); }}
                  className={`btn ${reviewSubTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Pending Review ({reviewPendingTasks.length})
                </button>
                <button 
                  onClick={() => { setReviewSubTab('closed'); setReopenTaskId(null); }}
                  className={`btn ${reviewSubTab === 'closed' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Formally Closed ({closedTasks.length})
                </button>
              </div>
            </div>

            {!isManagerOrAdmin && (
              <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info)', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                ℹ️ <strong>Member Notice:</strong> Tasks submitted for review appear here. Formal closure sign-off requires Project Manager (Sophia Davis) or Admin authorization.
              </div>
            )}

            {/* PENDING REVIEW SUB-VIEW */}
            {reviewSubTab === 'pending' && (
              reviewPendingTasks.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>All Tasks Cleared!</h4>
                  <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                    There are currently no completed tasks pending formal review or closure.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {reviewPendingTasks.map(t => (
                    <div 
                      key={t.id} 
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '18px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <a 
                              href="#detail" 
                              onClick={(e) => { e.preventDefault(); handleSelectTask(t); }} 
                              style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'none', cursor: 'pointer' }}
                            >
                              {t.title}
                            </a>
                            <span 
                              className="badge" 
                              style={{ 
                                fontSize: '11px', 
                                background: t.priority === 'High' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)', 
                                color: t.priority === 'High' ? 'var(--color-danger)' : 'var(--color-warning)' 
                              }}
                            >
                              {t.priority}
                            </span>
                            <span 
                              className="badge" 
                              style={{ 
                                fontSize: '11px', 
                                background: t.status === 'Review' ? 'var(--color-info-bg)' : 'var(--color-success-bg)', 
                                color: t.status === 'Review' ? 'var(--color-info)' : 'var(--color-success)' 
                              }}
                            >
                              {t.status}
                            </span>
                          </div>
                          <span className="text-muted" style={{ fontSize: '13px' }}>
                            Assignee: <strong>{t.assignee}</strong> | Project: <strong>{t.project}</strong> | Due: {t.dueDate ? formatDate(t.dueDate) : 'N/A'}
                          </span>
                          {t.description && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {t.description}
                            </p>
                          )}
                        </div>

                        {isManagerOrAdmin && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              onClick={() => setReopenTaskId(reopenTaskId === t.id ? null : t.id)} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              ↺ Request Changes / Reopen
                            </button>
                            <button 
                              onClick={() => handleSignOffTask(t.id)} 
                              className="btn btn-primary" 
                              style={{ fontSize: '12px', padding: '6px 14px', background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                            >
                              ✓ Sign Off & Close
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Reopen with Feedback Input (PDF Section 7.12 & 9.1: Reopen with comment to assignee) */}
                      {reopenTaskId === t.id && (
                        <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label className="text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>
                            Feedback for {t.assignee}:
                          </label>
                          <textarea 
                            className="form-control" 
                            rows="2" 
                            placeholder="Describe required changes or reasons for reopening..."
                            value={reopenComment} 
                            onChange={(e) => setReopenComment(e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => { setReopenTaskId(null); setReopenComment(''); }} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleReopenTask(t.id)} 
                              className="btn btn-primary" 
                              style={{ fontSize: '12px', padding: '4px 12px', background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
                            >
                              Reopen to In Progress
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* FORMALLY CLOSED SUB-VIEW (PDF Section 9.2: Reopen from Closed - Manager/Admin only) */}
            {reviewSubTab === 'closed' && (
              closedTasks.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Formally Closed Tasks</h4>
                  <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                    Tasks signed off by management will appear here as permanent record.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {closedTasks.map(t => (
                    <div 
                      key={t.id} 
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '18px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <a 
                              href="#detail" 
                              onClick={(e) => { e.preventDefault(); handleSelectTask(t); }} 
                              style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'none', cursor: 'pointer' }}
                            >
                              {t.title}
                            </a>
                            <span 
                              className="badge" 
                              style={{ 
                                fontSize: '11px', 
                                background: 'var(--color-success-bg)', 
                                color: 'var(--color-success)' 
                              }}
                            >
                              Closed ✓
                            </span>
                            <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                              100% Progress
                            </span>
                          </div>
                          <span className="text-muted" style={{ fontSize: '13px' }}>
                            Completed by <strong>{t.assignee}</strong> | Project: <strong>{t.project}</strong> | Due: {t.dueDate ? formatDate(t.dueDate) : 'N/A'}
                          </span>
                          {t.description && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {t.description}
                            </p>
                          )}
                        </div>

                        {isManagerOrAdmin && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              onClick={() => setReopenTaskId(reopenTaskId === t.id ? null : t.id)} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                              title="Reopen task from Closed status"
                            >
                              ↺ Reopen Task
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Reopen from Closed Input (PDF Section 9.2: Reopen from Closed - Manager/Admin only) */}
                      {reopenTaskId === t.id && (
                        <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label className="text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>
                            Reason for reopening closed task:
                          </label>
                          <textarea 
                            className="form-control" 
                            rows="2" 
                            placeholder="Explain reason for reopening (e.g. additional requirements, bug fix)..."
                            value={reopenComment} 
                            onChange={(e) => setReopenComment(e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => { setReopenTaskId(null); setReopenComment(''); }} 
                              className="btn btn-secondary" 
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleReopenClosedTask(t.id)} 
                              className="btn btn-primary" 
                              style={{ fontSize: '12px', padding: '4px 12px', background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
                            >
                              Reopen to In Progress
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })()}
    </div>
  );
}
