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

  // Summary View Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      const [taskRes, projRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`, { headers: { 'x-user-id': user.id } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user.id } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id } }).catch(() => ({ ok: false }))
      ]);
      
      const tList = taskRes.ok ? await taskRes.json() : [];
      const pList = projRes.ok ? await projRes.json() : [];
      const eList = empRes.ok ? await empRes.json() : [];

      setTasks(tList);
      setProjects(pList);
      setEmployees(eList);

      if (pList.length > 0) setSelectedProject(pList[0].id);
      if (eList.length > 0) setAssignedTo(eList[0].id);
    } catch (e) {
      console.error('Failed to load tasks database:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // DRAG AND DROP HANDLERS FOR KANBAN
  const onDragStart = (e, taskId) => e.dataTransfer.setData('text/plain', taskId);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (e, columnStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: columnStatus, progress: columnStatus === 'Completed' || columnStatus === 'Closed' ? 100 : t.progress } : t));
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
        <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
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
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Save Task</button>
        </form>
      </div>
    );
  }

  // --- SUB VIEW: MY TASKS ---
  if (subKey === 'my') {
    const myTasks = tasks.filter(t => t.assignedTo === user.id);
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
  if (subKey === 'list') {
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
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <h3>Task Calendar</h3>
        <p className="text-muted">A full-page calendar view of upcoming deadlines will appear here.</p>
      </div>
    );
  }

  // --- SUB VIEW: TASK DETAIL ---
  if (subKey === 'detail') {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <h3>Task Detail Hub</h3>
        <p className="text-muted">Select a task from the list or board to view full details (description, subtasks, comments, attachments).</p>
      </div>
    );
  }

  // --- SUB VIEW: REVIEW & CLOSURE ---
  if (subKey === 'review') {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <h3>Review & Closure</h3>
        <p className="text-muted">Tasks pending review by Project Managers and Team Leads will appear here.</p>
      </div>
    );
  }

  return null;
}
