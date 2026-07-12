// src/views/Masters.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Masters({ subKey }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Auxiliary databases for dropdowns
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeProjectFilter, setActiveProjectFilter] = useState('');

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, id: null, fields: {} });

  const fetchData = async (currentSubKey, signal) => {
    setLoading(true);
    try {
      // Load target list
      const res = await fetch(`${API_BASE_URL}/${currentSubKey}`, { headers: { 'x-user-id': user.id }, signal });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      let dataList = await res.json();
      if (!Array.isArray(dataList)) dataList = [];

      // Load helper lists in parallel
      const [empRes, cliRes, projRes, modRes, taskTypeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees`, { headers: { 'x-user-id': user.id }, signal }),
        fetch(`${API_BASE_URL}/clients`, { headers: { 'x-user-id': user.id }, signal }),
        fetch(`${API_BASE_URL}/projects`, { headers: { 'x-user-id': user.id }, signal }),
        fetch(`${API_BASE_URL}/modules`, { headers: { 'x-user-id': user.id }, signal }),
        fetch(`${API_BASE_URL}/task-types`, { headers: { 'x-user-id': user.id }, signal })
      ]);

      if (!empRes.ok) throw new Error(`Request failed: employees ${empRes.status}`);
      if (!cliRes.ok) throw new Error(`Request failed: clients ${cliRes.status}`);
      if (!projRes.ok) throw new Error(`Request failed: projects ${projRes.status}`);
      if (!modRes.ok) throw new Error(`Request failed: modules ${modRes.status}`);
      if (!taskTypeRes.ok) throw new Error(`Request failed: task-types ${taskTypeRes.status}`);

      const emps = await empRes.json();
      const clis = await cliRes.json();
      const projs = await projRes.json();
      const mods = await modRes.json();
      const ttypes = await taskTypeRes.json();

      setEmployees(Array.isArray(emps) ? emps : []);
      setClients(Array.isArray(clis) ? clis : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setModules(Array.isArray(mods) ? mods : []);
      setTaskTypes(Array.isArray(ttypes) ? ttypes : []);

      // PM role restriction on projects
      if (currentSubKey === 'projects' && user.role === 'PM') {
        dataList = dataList.filter(p => p.pmId === user.id);
      }

      if (currentSubKey === 'task-types') {
        setList(Array.isArray(ttypes) ? ttypes : []);
      } else {
        setList(dataList);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Masters fetch failed:', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep previous data visible during navigation — no list clear, no flicker.
    // AbortController cancels any in-flight request from the previous subKey.
    const controller = new AbortController();
    fetchData(subKey, controller.signal);
    return () => controller.abort();
  }, [subKey]);

  // DELETE
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${subKey}/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setList(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to delete record.');
      }
    } catch (e) {
      alert('Error deleting: ' + e.message);
    }
  };

  // OPEN MODAL
  const openModal = (item = null) => {
    let initialFields = {};
    if (subKey === 'employees') {
      initialFields = item ? { ...item } : {
        code: 'EMP' + String(employees.length + 1).padStart(3, '0'),
        name: '', email: '', mobile: '', designation: '', department: 'Engineering',
        managerId: '', costPerHour: 20, role: 'Employee', status: 'Active', password: 'password123'
      };
    } else if (subKey === 'clients') {
      initialFields = item ? { ...item } : { name: '', contactPerson: '', email: '', phone: '', country: '', status: 'Active' };
    } else if (subKey === 'projects') {
      initialFields = item ? { ...item } : { code: '', name: '', clientId: clients[0]?.id || '', pmId: employees[0]?.id || '', startDate: '', endDate: '', estimatedHours: 500, budget: 10000, billable: true, status: 'Active' };
    } else if (subKey === 'modules') {
      initialFields = item ? { ...item } : { projectId: activeProjectFilter || projects[0]?.id || '', name: '', description: '', priority: 'Medium', status: 'Active' };
    } else if (subKey === 'holidays') {
      initialFields = item ? { ...item } : { date: '', name: '', type: 'Public' };
    } else if (subKey === 'task-types') {
      initialFields = item ? { ...item } : { code: 'TT' + String(taskTypes.length + 1).padStart(3, '0'), name: '', description: '', status: 'Active' };
    }

    setModal({
      isOpen: true,
      id: item ? item.id : null,
      fields: initialFields
    });
  };

  // SUBMIT MODAL
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!modal.id;
    const url = isEdit ? `${API_BASE_URL}/${subKey}/${modal.id}` : `${API_BASE_URL}/${subKey}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(modal.fields)
      });

      if (res.ok) {
        setModal({ isOpen: false, id: null, fields: {} });
        fetchData(subKey, new AbortController().signal);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save record.');
      }
    } catch (err) {
      alert('Error saving record: ' + err.message);
    }
  };

  // Filter list by search query and project selector
  let filteredList = list.filter(item => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = Object.values(item).some(val => String(val).toLowerCase().includes(term));
    if (subKey === 'modules' && activeProjectFilter) {
      return matchesSearch && item.projectId === activeProjectFilter;
    }
    return matchesSearch;
  });

  if (subKey === 'task-types') {
    filteredList.sort((a, b) => {
      const numA = parseInt((a.code || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.code || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Loading overlay — sits on top of existing data, no flicker, no white flash */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          padding: '12px 16px', pointerEvents: 'none'
        }}>
          <div className="spin" style={{ width: '20px', height: '20px', border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        </div>
      )}

      <div className="page-actions-bar">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder={`Search ${subKey}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {subKey === 'modules' && (
            <select
              className="form-control"
              style={{ maxWidth: '200px' }}
              value={activeProjectFilter}
              onChange={e => setActiveProjectFilter(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Action Button: Admins can do everything, PMs can manage modules but only view projects */}
        {(user.role === 'Admin' || (subKey === 'modules' && user.role === 'PM')) && (
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
            + Add New
          </button>
        )}
      </div>

      {subKey === 'employees' && renderEmployeesTable(filteredList, openModal, handleDelete)}
      {subKey === 'clients' && renderClientsTable(filteredList, openModal, handleDelete)}
      {subKey === 'projects' && renderProjectsTable(filteredList, clients, employees, openModal, handleDelete, user)}
      {subKey === 'modules' && renderModulesTable(filteredList, projects, openModal, handleDelete, user)}
      {subKey === 'holidays' && renderHolidaysTable(filteredList, handleDelete, openModal)}
      {subKey === 'task-types' && renderTaskTypesTable(filteredList, openModal, handleDelete)}

      {/* REACT CRUD MODAL FRAME */}
      {modal.isOpen && (
        <div className="modal-overlay active" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">{modal.id ? 'Edit Record' : 'Create Record'}</h3>
                <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>✕</button>
              </div>
              <div className="modal-body">
                {subKey === 'employees' && renderEmployeeForm(modal.fields, setModal, employees)}
                {subKey === 'clients' && renderClientForm(modal.fields, setModal)}
                {subKey === 'projects' && renderProjectForm(modal.fields, setModal, clients, employees)}
                {subKey === 'modules' && renderModuleForm(modal.fields, setModal, projects)}
                {subKey === 'holidays' && renderHolidayForm(modal.fields, setModal)}
                {subKey === 'task-types' && renderTaskTypeForm(modal.fields, setModal)}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ isOpen: false, id: null, fields: {} })}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RENDERING COMPONENT TABLES ====================

function renderEmployeesTable(list, onEdit, onDelete) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Cost/Hr</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(emp => (
            <tr key={emp.id}>
              <td><strong>{emp.code}</strong></td>
              <td>{emp.name}</td>
              <td>{emp.email}</td>
              <td>{emp.role}</td>
              <td>${emp.costPerHour}/hr</td>
              <td><span className={`badge badge-${emp.status?.toLowerCase()}`}>{emp.status}</span></td>
              <td>
                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => onEdit(emp)}>✏️</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(emp.id, emp.name)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderClientsTable(list, onEdit, onDelete) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Contact Person</th>
            <th>Email</th>
            <th>Country</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td>{c.contactPerson}</td>
              <td>{c.email}</td>
              <td>{c.country}</td>
              <td><span className={`badge badge-${c.status?.toLowerCase()}`}>{c.status}</span></td>
              <td>
                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => onEdit(c)}>✏️</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(c.id, c.name)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderProjectsTable(list, clients, employees, onEdit, onDelete, user) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Project Name</th>
            <th>Client</th>
            <th>PM</th>
            <th>Timeline</th>
            <th>Status</th>
            {user.role === 'Admin' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {list.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            const pm = employees.find(e => e.id === p.pmId);
            return (
              <tr key={p.id}>
                <td><strong>{p.code}</strong></td>
                <td>{p.name}</td>
                <td>{client ? client.name : 'Unknown'}</td>
                <td>{pm ? pm.name : 'Unassigned'}</td>
                <td><small>{formatDate(p.startDate)} to {formatDate(p.endDate)}</small></td>
                <td><span className={`badge badge-${p.status?.toLowerCase()}`}>{p.status}</span></td>
                {user.role === 'Admin' && (
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => onEdit(p)}>✏️</button>
                    <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(p.id, p.name)}>🗑️</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderModulesTable(list, projects, onEdit, onDelete, user) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Module Name</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(m => {
            const p = projects.find(proj => proj.id === m.projectId);
            return (
              <tr key={m.id}>
                <td><strong>{p ? p.name : 'Unknown'}</strong></td>
                <td>{m.name}</td>
                <td>{m.description || 'No description'}</td>
                <td><span className={`badge badge-${m.priority?.toLowerCase()}`}>{m.priority}</span></td>
                <td><span className={`badge badge-${m.status?.toLowerCase()}`}>{m.status}</span></td>
                <td>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => onEdit(m)}>✏️</button>
                  <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(m.id, m.name)}>🗑️</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderHolidaysTable(list, onDelete, onEdit) {
  return (
    <div className="grid-cols-2">
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday Title</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.sort((a,b)=>(a.date || '').localeCompare(b.date || '')).map(h => (
              <tr key={h.id}>
                <td><strong>{formatDate(h.date)}</strong></td>
                <td>{h.name}</td>
                <td><span className={`badge badge-${h.type === 'Public' ? 'completed' : 'draft'}`}>{h.type}</span></td>
                <td>
                  <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(h.id, h.name)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Holidays Overview</h3>
        <p className="text-secondary mt-4">Rest days added here block timesheet entries warnings for employees on matching dates.</p>
        <button className="btn btn-primary btn-sm mt-4" onClick={() => onEdit()}>+ Add New Holiday</button>
      </div>
    </div>
  );
}

// ==================== RENDERING FORMS IN MODALS ====================

function renderEmployeeForm(fields, setModal, employees) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Employee Code</label>
        <input type="text" className="form-control" value={fields.code || ''} onChange={e=>handleChange('code', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-control" value={fields.email || ''} onChange={e=>handleChange('email', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Mobile</label>
        <input type="text" className="form-control" value={fields.mobile || ''} onChange={e=>handleChange('mobile', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Designation</label>
        <input type="text" className="form-control" value={fields.designation || ''} onChange={e=>handleChange('designation', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Department</label>
        <select className="form-control" value={fields.department || 'Engineering'} onChange={e=>handleChange('department', e.target.value)}>
          <option value="Engineering">Engineering</option>
          <option value="Quality Assurance">Quality Assurance</option>
          <option value="PMO">PMO</option>
          <option value="Executive">Executive</option>
          <option value="Administration">Administration</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Reporting Manager</label>
        <select className="form-control" value={fields.managerId || ''} onChange={e=>handleChange('managerId', e.target.value)}>
          <option value="">None</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Cost per Hour ($)</label>
        <input type="number" className="form-control" value={fields.costPerHour || 0} onChange={e=>handleChange('costPerHour', parseFloat(e.target.value) || 0)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Role</label>
        <select className="form-control" value={fields.role || 'Employee'} onChange={e=>handleChange('role', e.target.value)}>
          <option value="Employee">Employee</option>
          <option value="Team Lead">Team Lead</option>
          <option value="PM">PM</option>
          <option value="Management">Management</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={fields.status || 'Active'} onChange={e=>handleChange('status', e.target.value)}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input type="text" className="form-control" value={fields.password || ''} onChange={e=>handleChange('password', e.target.value)} required />
      </div>
    </div>
  );
}

function renderClientForm(fields, setModal) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Client Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Contact Person</label>
        <input type="text" className="form-control" value={fields.contactPerson || ''} onChange={e=>handleChange('contactPerson', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-control" value={fields.email || ''} onChange={e=>handleChange('email', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input type="text" className="form-control" value={fields.phone || ''} onChange={e=>handleChange('phone', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Country</label>
        <input type="text" className="form-control" value={fields.country || ''} onChange={e=>handleChange('country', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={fields.status || 'Active'} onChange={e=>handleChange('status', e.target.value)}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}

function renderProjectForm(fields, setModal, clients, employees) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  const pms = employees.filter(e => e.role === 'PM' || e.role === 'Team Lead' || e.role === 'Admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Project Code</label>
        <input type="text" className="form-control" value={fields.code || ''} onChange={e=>handleChange('code', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Project Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Client</label>
        <select className="form-control" value={fields.clientId || ''} onChange={e=>handleChange('clientId', e.target.value)} required>
          <option value="" disabled>Select Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Project Manager</label>
        <select className="form-control" value={fields.pmId || ''} onChange={e=>handleChange('pmId', e.target.value)} required>
          <option value="" disabled>Select PM</option>
          {pms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input type="date" className="form-control" value={fields.startDate || ''} onChange={e=>handleChange('startDate', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input type="date" className="form-control" value={fields.endDate || ''} onChange={e=>handleChange('endDate', e.target.value)} required />
        </div>
      </div>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Estimated Hours</label>
          <input type="number" className="form-control" value={fields.estimatedHours || 0} onChange={e=>handleChange('estimatedHours', parseInt(e.target.value) || 0)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Budget ($)</label>
          <input type="number" className="form-control" value={fields.budget || 0} onChange={e=>handleChange('budget', parseFloat(e.target.value) || 0)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Billing Type</label>
        <select className="form-control" value={fields.billable === undefined ? 'true' : String(fields.billable)} onChange={e=>handleChange('billable', e.target.value === 'true')}>
          <option value="true">Billable</option>
          <option value="false">Non-Billable</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={fields.status || 'Active'} onChange={e=>handleChange('status', e.target.value)}>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
    </div>
  );
}

function renderModuleForm(fields, setModal, projects) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Project</label>
        <select className="form-control" value={fields.projectId || ''} onChange={e=>handleChange('projectId', e.target.value)} required>
          <option value="" disabled>Select Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Module Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-control" style={{ resize: 'vertical' }} value={fields.description || ''} onChange={e=>handleChange('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Priority</label>
        <select className="form-control" value={fields.priority || 'Medium'} onChange={e=>handleChange('priority', e.target.value)}>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={fields.status || 'Active'} onChange={e=>handleChange('status', e.target.value)}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}

function renderHolidayForm(fields, setModal) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input type="date" className="form-control" value={fields.date || ''} onChange={e=>handleChange('date', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Holiday Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-control" value={fields.type || 'Public'} onChange={e=>handleChange('type', e.target.value)}>
          <option value="Public">Public (Universal Rest)</option>
          <option value="Company">Company (Paid/Special Off)</option>
        </select>
      </div>
    </div>
  );
}

function renderTaskTypesTable(list, onEdit, onDelete) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id}>
              <td><strong>{t.code}</strong></td>
              <td>{t.name}</td>
              <td>{t.description || '-'}</td>
              <td><span className={`badge badge-${(t.status || 'Active').toLowerCase()}`}>{t.status || 'Active'}</span></td>
              <td>
                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', marginRight: '6px' }} onClick={() => onEdit(t)}>✏️</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => onDelete(t.id, t.name)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTaskTypeForm(fields, setModal) {
  const handleChange = (key, val) => {
    setModal(prev => ({ ...prev, fields: { ...prev.fields, [key]: val } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">Code</label>
        <input type="text" className="form-control" value={fields.code || ''} onChange={e=>handleChange('code', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Task Type Name</label>
        <input type="text" className="form-control" value={fields.name || ''} onChange={e=>handleChange('name', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-control" style={{ resize: 'vertical' }} value={fields.description || ''} onChange={e=>handleChange('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-control" value={fields.status || 'Active'} onChange={e=>handleChange('status', e.target.value)}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}
