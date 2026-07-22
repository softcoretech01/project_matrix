// src/views/Tasks.jsx
import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/date';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Tasks({ subKey }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Cascading States for Creation
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [estimatedHours, setEstimatedHours] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [reviewerId, setReviewerId] = useState('');

  // Progress modal state
  const [progressModal, setProgressModal] = useState({ isOpen: false, task: null, progress: 0, remarks: '', status: '' });

  // Summary View Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const fetchData = async () => {
    try {
      const [taskRes, cliRes, projRes, modRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/clients`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/modules`, { headers: { 'x-user-id': user.id } }),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id } })
      ]);
      if (!taskRes.ok || !cliRes.ok || !projRes.ok || !modRes.ok || !empRes.ok) {
        throw new Error('One or more API requests failed.');
      }

      const tList = await taskRes.json();
      const cList = await cliRes.json();
      const pList = await projRes.json();
      const mList = await modRes.json();
      const eList = await empRes.json();

      setTasks(tList);
      setClients(cList.filter(c => c.status === 'Active'));
      setProjects(pList.filter(p => p.status === 'Active'));
      setModules(mList.filter(m => m.status === 'Active'));
      setEmployees(eList.filter(e => e.status === 'Active'));

      // Pre-fill dropdown defaults
      if (cList.length > 0) setSelectedClient(cList[0].id);
      if (eList.length > 0) {
        setAssignedTo(eList[0].id);
        setReviewerId(eList.find(e => e.role === 'PM' || e.role === 'Team Lead')?.id || eList[0].id);
      }
    } catch (e) {
      console.error('Failed to load tasks database:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // Handle Client Cascading
  useEffect(() => {
    const matchingProjects = projects.filter(p => p.clientId === selectedClient);
    if (matchingProjects.length > 0) {
      setSelectedProject(matchingProjects[0].id);
    } else {
      setSelectedProject('');
    }
  }, [selectedClient, projects]);

  // Handle Project Cascading
  useEffect(() => {
    const matchingModules = modules.filter(m => m.projectId === selectedProject);
    if (matchingModules.length > 0) {
      setSelectedModule(matchingModules[0].id);
    } else {
      setSelectedModule('');
    }
  }, [selectedProject, modules]);

  // SUBMIT TASK CREATION
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedModule) {
      alert('Please select a valid Project Module.');
      return;
    }

    const newTask = {
      name: taskName,
      description,
      projectId: selectedProject,
      moduleId: selectedModule,
      priority,
      estimatedHours,
      startDate,
      endDate,
      assignedTo,
      reviewerId,
      status: 'Open',
      progress: 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(newTask)
      });

      if (res.ok) {
        alert('Task created successfully!');
        // Reset form
        setTaskName('');
        setDescription('');
        fetchData();
      } else {
        alert('Failed to create task.');
      }
    } catch (err) {
      alert('Error creating task: ' + err.message);
    }
  };

  // DRAG AND DROP HANDLERS FOR KANBAN
  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, columnStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    if (targetTask.status === columnStatus) return;

    // Restriction check: Employees can update status, but moving to "Closed" is reserved for PMs / Reviewers in Task Closure view
    if (columnStatus === 'Closed' && user.role === 'Employee') {
      alert('Only Project Managers or Reviewers can mark tasks as Closed in Approvals.');
      return;
    }

    let updatedFields = { status: columnStatus };
    if (columnStatus === 'Completed') {
      updatedFields.progress = 100;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ ...targetTask, ...updatedFields })
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedFields } : t));
      } else {
        alert('Failed to update task status.');
      }
    } catch (err) {
      alert('Error dragging task: ' + err.message);
    }
  };

  // PROGRESS UPDATE SUBMIT
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    const { task, progress, remarks, status } = progressModal;

    const updatedTask = {
      ...task,
      progress,
      status: status || task.status
    };

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(updatedTask)
      });

      if (res.ok) {
        alert('Task progress updated!');
        setProgressModal({ isOpen: false, task: null, progress: 0, remarks: '', status: '' });
        fetchData();
      } else {
        alert('Failed to update progress.');
      }
    } catch (err) {
      alert('Error updating progress: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // --- SUB VIEW 1: CREATE TASK ---
  if (subKey === 'create') {
    const clientProjects = projects.filter(p => p.clientId === selectedClient);
    const projectModules = modules.filter(m => m.projectId === selectedProject);

    return (
      <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Create Task & Allocate Resources</h3>
        <form onSubmit={handleSubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label className="form-label">Client</label>
            <select className="form-control" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} required>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-control" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} required>
              <option value="" disabled>Select Project</option>
              {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Module</label>
            <select className="form-control" value={selectedModule} onChange={e => setSelectedModule(e.target.value)} required>
              <option value="" disabled>Select Module</option>
              {projectModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Task Name</label>
            <input type="text" className="form-control" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g. Stock Entry Screen UI" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" style={{ resize: 'vertical', minHeight: '80px' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <input type="number" className="form-control" value={estimatedHours} onChange={e => setEstimatedHours(parseInt(e.target.value) || 0)} min="1" required />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Planned Start Date</label>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Planned End Date</label>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Assigned Employee</label>
              <select className="form-control" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reviewer</label>
              <select className="form-control" value={reviewerId} onChange={e => setReviewerId(e.target.value)} required>
                {employees.filter(e => e.role === 'PM' || e.role === 'Team Lead' || e.role === 'Admin').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Create & Assign Task</button>
        </form>
      </div>
    );
  }

  // --- SUB VIEW 2: MY TASKS ---
  if (subKey === 'my') {
    const myTasks = tasks.filter(t => t.assignedTo === user.id);
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>My Assigned Tasks</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Effort Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No tasks assigned to you.</td></tr>
              ) : myTasks.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.id}</strong></td>
                  <td>{t.name}</td>
                  <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                  <td>{formatDate(t.endDate)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.progress}%</span>
                      <progress value={t.progress} max="100" style={{ accentColor: 'var(--color-primary)', width: '60px' }} />
                    </div>
                  </td>
                  <td>{t.loggedHours}h spent / {t.estimatedHours}h est.</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setProgressModal({ isOpen: true, task: t, progress: t.progress, remarks: '', status: t.status })}>
                      Update Progress
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PROGRESS MODAL */}
        {progressModal.isOpen && (
          <div className="modal-overlay active" onClick={() => setProgressModal({ isOpen: false, task: null, progress: 0, remarks: '', status: '' })}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleProgressSubmit}>
                <div className="modal-header">
                  <h3 className="modal-title">Update Progress: {progressModal.task?.name}</h3>
                  <button type="button" className="modal-close-btn" onClick={() => setProgressModal({ isOpen: false, task: null, progress: 0, remarks: '', status: '' })}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Completion percentage ({progressModal.progress}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="form-control"
                        value={progressModal.progress}
                        onChange={e => setProgressModal(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Task Status</label>
                      <select
                        className="form-control"
                        value={progressModal.status}
                        onChange={e => setProgressModal(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Ready for Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        placeholder="Add details about task milestones..."
                        value={progressModal.remarks}
                        onChange={e => setProgressModal(prev => ({ ...prev, remarks: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Attachments (Mock Upload)</label>
                      <input type="file" className="form-control" disabled />
                      <small className="text-muted">Supports logs, blueprints, screenshots.</small>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setProgressModal({ isOpen: false, task: null, progress: 0, remarks: '', status: '' })}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Submit Update</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SUB VIEW 3: KANBAN BOARD ---
  if (subKey === 'board') {
    const columns = [
      { key: 'Open', label: 'Open' },
      { key: 'Assigned', label: 'Assigned' },
      { key: 'In Progress', label: 'In Progress' },
      { key: 'Review', label: 'Review' },
      { key: 'Completed', label: 'Completed' },
      { key: 'Closed', label: 'Closed' }
    ];

    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>Task Board (Kanban)</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Drag and drop cards across columns to change progress states.</p>
        </div>

        <div className="kanban-board">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div
                key={col.key}
                className="kanban-column"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <div className="kanban-column-header">
                  <span className="kanban-column-title">{col.label}</span>
                  <span className="kanban-card-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map(t => {
                    const assignee = employees.find(e => e.id === t.assignedTo);
                    return (
                      <div
                        key={t.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => onDragStart(e, t.id)}
                      >
                        <div className="kanban-card-title">{t.name}</div>
                        <div className="kanban-card-meta">
                          <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                          <span>Due: {formatDate(t.endDate)}</span>
                        </div>
                        <div className="kanban-card-footer">
                          <span className="kanban-card-assignee">👤 {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{t.progress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- SUB VIEW 4: ADMIN SUMMARY (READ ONLY) ---
  if (subKey === 'summary') {
    const filteredTasks = tasks.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      const matchProject = projectFilter ? t.projectId === projectFilter : true;
      return matchSearch && matchStatus && matchProject;
    });

    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <h3>Task Summary Dashboard</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Global monitoring of all tasks. Read-only view.</p>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="grid-cols-2" style={{ gap: '10px' }}>
            <div>
              <input type="text" className="form-control" placeholder="Search task ID or name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select className="form-control" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Project</th>
                <th>Task Name</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No tasks found.</td></tr>
              ) : filteredTasks.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                const emp = employees.find(e => e.id === t.assignedTo);
                return (
                  <tr key={t.id}>
                    <td><strong>{t.id}</strong></td>
                    <td>{proj ? proj.name : t.projectId}</td>
                    <td>{t.name}</td>
                    <td>{emp ? emp.name : 'Unassigned'}</td>
                    <td>{formatDate(t.endDate)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.progress}%</span>
                        <progress value={t.progress} max="100" style={{ accentColor: 'var(--color-primary)', width: '60px' }} />
                      </div>
                    </td>
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

  return null;
}
