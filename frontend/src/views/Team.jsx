import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Team({ navigateTo }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, taskRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees`).catch(() => null),
        fetch(`${API_BASE_URL}/tasks`).catch(() => null)
      ]);

      if (empRes && empRes.ok) {
        setEmployees(await empRes.json());
      }
      if (taskRes && taskRes.ok) {
        setTasks(await taskRes.json());
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Instant real-time update whenever any employee or task is added/modified
    window.addEventListener('pm_data_updated', fetchData);
    return () => window.removeEventListener('pm_data_updated', fetchData);
  }, []);

  const getActiveTaskCount = (empName) => {
    return tasks.filter(t => t.assignee === empName && ['Open', 'In Progress'].includes(t.status)).length;
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search.trim() ||
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const rolesList = ['All', 'Admin', 'PM', 'Team Lead', 'Employee', 'Management'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-secondary)', 
        padding: '16px 20px', 
        borderRadius: '12px', 
        flexWrap: 'wrap', 
        gap: '14px', 
        border: '1px solid var(--border-color)' 
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 700 }}>Team Directory</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
            Meet our active team members, designations, and availability.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="badge badge-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            👥 {employees.length} Members
          </span>
          {user?.role === 'Admin' && (
            <button 
              onClick={() => navigateTo && navigateTo('admin', 'users')}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="ph-bold ph-user-plus"></i> Manage Users
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-secondary)', 
        padding: '12px 16px', 
        borderRadius: '10px', 
        flexWrap: 'wrap', 
        gap: '10px', 
        border: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search team member by name, email, or designation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {rolesList.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '14px' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Responsive Team Cards Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }} className="text-muted">
          Loading team members...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <p className="text-muted" style={{ margin: 0 }}>No team members match your filter or search.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', 
          gap: '16px' 
        }}>
          {filteredEmployees.map(emp => {
            const activeTasks = getActiveTaskCount(emp.name);
            const isAvailable = activeTasks === 0;
            const initials = (emp.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div
                key={emp.id}
                className="card"
                style={{
                  margin: 0,
                  padding: '20px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Top Row: Avatar + Name + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px var(--color-primary-glow, rgba(99,102,241,0.3))'
                  }}>
                    {initials}
                  </div>

                  <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {emp.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
                      {emp.designation || 'Team Member'}
                    </span>
                  </div>
                </div>

                {/* Middle Info: Email & Role Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '3px 8px' }}>
                    {emp.role}
                  </span>
                  
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: isAvailable ? 'var(--color-success-bg, rgba(34,197,94,0.15))' : 'var(--color-info-bg, rgba(59,130,246,0.15))',
                    color: isAvailable ? 'var(--color-success)' : 'var(--color-info)'
                  }}>
                    ● {isAvailable ? 'Available' : 'Active'}
                  </span>
                </div>

                {/* Bottom Row: Email Contact */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  <i className="ph ph-envelope" style={{ marginRight: '6px' }}></i>
                  {emp.email}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
