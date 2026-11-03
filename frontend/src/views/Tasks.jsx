// src/views/Tasks.jsx
import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/date';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Tasks({ subKey }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States for Creation
  const [selectedProject, setSelectedProject] = useState('');
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Summary / List View Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail View State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const fetchData = async () => {
    try {
      const [taskRes, projRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`, { headers: { 'x-user-id': user?.id || '1' } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user?.id || '1' } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user?.id || '1' } }).catch(() => ({ ok: false }))
      ]);
      
      const tList = taskRes.ok ? await taskRes.json() : [];
      const pList = projRes.ok ? await projRes.json() : [];
      const eList = empRes.ok ? await empRes.json() : [];

      setTasks(tList);
      setProjects(pList);
      setEmployees(eList);

      if (pList.length > 0 && !selectedProject) setSelectedProject(pList[0].id);
      if (eList.length > 0 && !assignedTo) setAssignedTo(eList[0].id);
      if (tList.length > 0 && !selectedTaskId) setSelectedTaskId(tList[0].id);
    } catch (e) {
      console.error('Failed to load tasks database:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // Load Task Detail when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId) {
      fetch(`${API_BASE_URL}/tasks/${selectedTaskId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setTaskDetail(data);
        })
        .catch(err => console.error('Failed to load task detail:', err));
    }
  }, [selectedTaskId]);

  // CREATE TASK HANDLER
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName,
          description,
          projectId: selectedProject,
          priority,
          startDate,
          endDate,
          assignedTo
        })
      });

      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [newTask, ...prev]);
        setTaskName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        alert('Task created successfully!');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // DRAG AND DROP HANDLERS FOR KANBAN WITH PERSISTENCE
  const onDragStart = (e, taskId) => e.dataTransfer.setData('text/plain', taskId);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (e, columnStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const newProgress = (columnStatus === 'Completed') ? 100 : (columnStatus === 'Open' ? 0 : undefined);
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: columnStatus,
          progress: newProgress !== undefined ? newProgress : t.progress
        };
      }
      return t;
    }));

    // Persist to Backend API
    try {
      await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: columnStatus,
          progress: newProgress
        })
      });
    } catch (err) {
      console.error('Failed to persist task status change:', err);
    }
  };

  // SUBTASK TOGGLE
  const handleToggleSubtask = async (subtaskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/subtasks/${subtaskId}/toggle`, { method: 'PUT' });
      if (res.ok) {
        const updatedSub = await res.json();
        setTaskDetail(prev => {
          if (!prev) return prev;
          const updatedSubs = prev.subtasks.map(s => s.id === subtaskId ? updatedSub : s);
          const doneCount = updatedSubs.filter(s => s.isDone).length;
          const prog = updatedSubs.length > 0 ? Math.round((doneCount / updatedSubs.length) * 100) : prev.progress;
          return { ...prev, subtasks: updatedSubs, progress: prog };
        });
        // Refresh task list
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // ADD SUBTASK
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !taskDetail) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskDetail.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() })
      });
      if (res.ok) {
        const sub = await res.json();
        setTaskDetail(prev => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), sub]
        }));
        setNewSubtaskTitle('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  // ADD COMMENT
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !taskDetail) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskDetail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '1',
          userName: user?.name || 'Admin User',
          text: newCommentText.trim()
        })
      });
      if (res.ok) {
        const c = await res.json();
        setTaskDetail(prev => ({
          ...prev,
          comments: [...(prev.comments || []), c]
        }));
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // REVIEW APPROVAL HANDLER
  const handleReviewAction = async (taskId, newStatus) => {
    try {
      const progress = newStatus === 'Completed' ? 100 : 50;
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progress })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, progress } : t));
        alert(`Task has been marked as ${newStatus}!`);
      }
    } catch (err) {
      console.error('Failed to update review status:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // --- SUB VIEW: CREATE TASK ---
  if (subKey === 'create') {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Create Task</h3>
        <form onSubmit={handleSubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-control" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">General (No Project)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Task Name</label>
            <input type="text" className="form-control" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g. Update Dashboard UI" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" style={{ resize: 'vertical', minHeight: '80px' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-control" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Save Task</button>
        </form>
      </div>
    );
  }

  // --- SUB VIEW: MY TASKS ---
  if (subKey === 'my') {
    const myTasks = tasks.filter(t => t.assignedTo === user?.id || t.assignedTo === '1');
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>My Tasks</h3>
        </div>
        <div className="table-responsive card">
          <table className="table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">You have no tasks assigned.</td></tr>
              ) : myTasks.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.id}</strong></td>
                  <td>{t.name}</td>
                  <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                  <td>{formatDate(t.endDate)}</td>
                  <td>{t.progress}%</td>
                  <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SUB VIEW: TASK LIST ---
  if (subKey === 'list' || !subKey || subKey === 'summary') {
    const filteredTasks = tasks.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      return matchSearch && matchStatus;
    });

    return (
      <div>
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="grid-cols-2" style={{ gap: '10px' }}>
            <input type="text" className="form-control" placeholder="Search task name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="table-responsive card">
          <table className="table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No tasks found.</td></tr>
              ) : filteredTasks.map(t => {
                const emp = employees.find(e => e.id === t.assignedTo);
                return (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{emp ? emp.name : 'Unassigned'}</td>
                    <td>{formatDate(t.endDate)}</td>
                    <td>{t.progress}%</td>
                    <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SUB VIEW: KANBAN BOARD ---
  if (subKey === 'board') {
    const columns = [
      { key: 'Open', label: 'To Do' },
      { key: 'In Progress', label: 'In Progress' },
      { key: 'Review', label: 'In Review' },
      { key: 'Completed', label: 'Done' }
    ];

    return (
      <div className="kanban-board">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key || (col.key === 'Open' && t.status === 'Assigned') || (col.key === 'Completed' && t.status === 'Closed'));
          return (
            <div key={col.key} className={`kanban-column kanban-col-${col.key.toLowerCase().replace(' ', '-')}`} onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.key)}>
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.label}</span>
                <span className="kanban-card-count">{colTasks.length}</span>
              </div>
              <div className="kanban-cards">
                {colTasks.map(t => {
                  const assignee = employees.find(e => e.id === t.assignedTo);
                  return (
                    <div key={t.id} className="kanban-card" draggable onDragStart={(e) => onDragStart(e, t.id)}>
                      <div className="kanban-card-title">{t.name}</div>
                      <div className="kanban-card-meta">
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <span>{formatDate(t.endDate)}</span>
                      </div>
                      <div className="kanban-card-footer">
                        <span className="kanban-card-assignee">👤 {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- SUB VIEW: CALENDAR ---
  if (subKey === 'calendar') {
    const sortedTasks = [...tasks].sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
    return (
      <div className="card">
        <div className="card-header-flex">
          <h3>Task Calendar & Deadlines</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Due Date</th>
                <th>Task Name</th>
                <th>Project</th>
                <th>Assigned To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                const emp = employees.find(e => e.id === t.assignedTo);
                return (
                  <tr key={t.id}>
                    <td><strong>{formatDate(t.endDate)}</strong></td>
                    <td>{t.name}</td>
                    <td>{proj ? proj.name : 'General'}</td>
                    <td>{emp ? emp.name : 'Unassigned'}</td>
                    <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SUB VIEW: TASK DETAIL ---
  if (subKey === 'detail') {
    return (
      <div className="grid-cols-2" style={{ gap: '20px' }}>
        {/* Task Selection List */}
        <div className="card">
          <div className="card-header-flex">
            <h3>Select Task</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTaskId(t.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: selectedTaskId === t.id ? 'var(--color-primary-glow)' : 'var(--bg-main)',
                  border: selectedTaskId === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>{t.name}</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t.id} • Due {formatDate(t.endDate)}</div>
                </div>
                <span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Details Panel with Subtasks and Comments */}
        <div className="card">
          {taskDetail ? (
            <div>
              <div className="card-header-flex">
                <div>
                  <h3>{taskDetail.name}</h3>
                  <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{taskDetail.id} • {taskDetail.priority} Priority</div>
                </div>
                <span className={`badge badge-${taskDetail.status.toLowerCase().replace(' ', '-')}`}>{taskDetail.status}</span>
              </div>

              <p style={{ margin: '14px 0', color: 'var(--text-secondary)' }}>{taskDetail.description || 'No description provided.'}</p>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span>Progress</span>
                  <strong>{taskDetail.progress}%</strong>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${taskDetail.progress}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.3s' }}></div>
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '12px' }}>Subtasks Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {(taskDetail.subtasks || []).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" checked={s.isDone} onChange={() => handleToggleSubtask(s.id)} />
                      <span style={{ textDecoration: s.isDone ? 'line-through' : 'none', color: s.isDone ? 'var(--text-muted)' : 'var(--text-primary)' }}>{s.title}</span>
                    </div>
                  ))}
                  {(taskDetail.subtasks || []).length === 0 && (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>No subtasks created yet.</div>
                  )}
                </div>
                <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add a new checklist subtask..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">Add</button>
                </form>
              </div>

              {/* Discussion Comments */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ marginBottom: '12px' }}>Discussion & Comments</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', maxHeight: '180px', overflowY: 'auto' }}>
                  {(taskDetail.comments || []).map(c => (
                    <div key={c.id} style={{ padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <strong>{c.userName}</strong>
                        <span>{c.createdAt}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>{c.text}</div>
                    </div>
                  ))}
                  {(taskDetail.comments || []).length === 0 && (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>No comments on this task yet.</div>
                  )}
                </div>
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Post</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              Select a task on the left to inspect details.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- SUB VIEW: REVIEW & CLOSURE ---
  if (subKey === 'review') {
    const reviewTasks = tasks.filter(t => t.status === 'Review');
    return (
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>Review & Closure</h3>
            <p className="text-secondary mt-2 mb-4" style={{ fontSize: '0.85rem' }}>Tasks pending Project Manager and Team Lead verification before final completion.</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewTasks.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No tasks currently awaiting review.</td></tr>
              ) : reviewTasks.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.id}</strong></td>
                  <td>{t.name}</td>
                  <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                  <td>{t.progress}%</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleReviewAction(t.id, 'Completed')}>Approve & Complete</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReviewAction(t.id, 'In Progress')}>Request Changes</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
