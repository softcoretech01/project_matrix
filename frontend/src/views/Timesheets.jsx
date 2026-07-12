// src/views/Timesheets.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

export default function Timesheets({ subKey }) {
  const { user } = useAuth();
  
  // Data lists
  const [timesheets, setTimesheets] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Daily Form State
  const [dailyForm, setDailyForm] = useState({
    date: '2026-06-18', // Current system date mock
    projectId: '',
    moduleId: '',
    taskId: '',
    hours: 8,
    description: ''
  });

  // Weekly Grid State
  const [weeklyRows, setWeeklyRows] = useState([]);

  // Filters for History
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('2026-06');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-user-id': user.id };
      const [tsRes, allocRes, projRes, modRes, taskRes, holRes] = await Promise.all([
        fetch(`${API_BASE_URL}/timesheets`, { headers }),
        fetch(`${API_BASE_URL}/allocations`, { headers }),
        fetch(`${API_BASE_URL}/projects`, { headers }),
        fetch(`${API_BASE_URL}/modules`, { headers }),
        fetch(`${API_BASE_URL}/tasks`, { headers }),
        fetch(`${API_BASE_URL}/holidays`, { headers })
      ]);

      const tss = await tsRes.json();
      const allocs = await allocRes.json();
      const projs = await projRes.json();
      const mods = await modRes.json();
      const tsks = await taskRes.json();
      const hols = await holRes.json();

      setTimesheets(tss.filter(t => t.employeeId === user.id));
      setAllocations(allocs.filter(a => a.employeeId === user.id));
      setProjects(projs);
      setModules(mods);
      
      // Filter tasks assigned to current employee
      const myTasks = tsks.filter(t => t.assignedTo === user.id);
      setTasks(myTasks);
      setHolidays(hols);

      // Pre-fill daily form defaults
      const allocatedProjIds = allocs.filter(a => a.employeeId === user.id).map(a => a.projectId);
      const myActiveProjects = projs.filter(p => allocatedProjIds.includes(p.id) && p.status === 'Active');
      if (myActiveProjects.length > 0) {
        const defaultProjId = myActiveProjects[0].id;
        const matchingMods = mods.filter(m => m.projectId === defaultProjId && m.status === 'Active');
        const defaultModId = matchingMods[0]?.id || '';
        const matchingTasks = myTasks.filter(t => t.projectId === defaultProjId && t.moduleId === defaultModId);
        
        setDailyForm(prev => ({
          ...prev,
          projectId: defaultProjId,
          moduleId: defaultModId,
          taskId: matchingTasks[0]?.id || ''
        }));
      }

      // Initialize Weekly Rows (Current week: June 15 to June 19, 2026)
      const weekDays = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
      const myWeekTss = tss.filter(t => t.employeeId === user.id && weekDays.includes(t.date));

      // Group week timesheets by task ID
      const taskGroups = {};
      myWeekTss.forEach(ts => {
        if (!taskGroups[ts.taskId]) {
          taskGroups[ts.taskId] = {
            projectId: ts.projectId,
            moduleId: ts.moduleId,
            taskId: ts.taskId,
            hours: { '2026-06-15': 0, '2026-06-16': 0, '2026-06-17': 0, '2026-06-18': 0, '2026-06-19': 0 },
            descriptions: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
            timesheetIds: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
            status: ts.status
          };
        }
        taskGroups[ts.taskId].hours[ts.date] = parseFloat(ts.hours);
        taskGroups[ts.taskId].descriptions[ts.date] = ts.description;
        taskGroups[ts.taskId].timesheetIds[ts.date] = ts.id;
      });

      const initialRows = Object.values(taskGroups);
      if (initialRows.length === 0 && myTasks.length > 0) {
        // Seed an empty row to start with if there are no timesheets
        initialRows.push({
          projectId: myTasks[0].projectId,
          moduleId: myTasks[0].moduleId,
          taskId: myTasks[0].id,
          hours: { '2026-06-15': 0, '2026-06-16': 0, '2026-06-17': 0, '2026-06-18': 0, '2026-06-19': 0 },
          descriptions: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
          timesheetIds: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
          status: 'Draft'
        });
      }
      setWeeklyRows(initialRows);

    } catch (e) {
      console.error('Failed to load timesheets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subKey]);

  // DAILY CASCADING CHANGE HANDLERS
  const handleDailyProjChange = (pid) => {
    const matchingMods = modules.filter(m => m.projectId === pid && m.status === 'Active');
    const firstModId = matchingMods[0]?.id || '';
    const matchingTasks = tasks.filter(t => t.projectId === pid && t.moduleId === firstModId);
    setDailyForm(prev => ({
      ...prev,
      projectId: pid,
      moduleId: firstModId,
      taskId: matchingTasks[0]?.id || ''
    }));
  };

  const handleDailyModChange = (mid) => {
    const matchingTasks = tasks.filter(t => t.projectId === dailyForm.projectId && t.moduleId === mid);
    setDailyForm(prev => ({
      ...prev,
      moduleId: mid,
      taskId: matchingTasks[0]?.id || ''
    }));
  };

  // DAILY ENTRY SUBMIT
  const handleDailySubmit = async (e) => {
    e.preventDefault();
    if (!dailyForm.taskId) {
      alert('Please select a valid assigned task.');
      return;
    }
    if (parseFloat(dailyForm.hours) <= 0 || parseFloat(dailyForm.hours) > 24) {
      alert('Hours worked must be between 0.1 and 24.');
      return;
    }

    // Check holiday warning
    const isHoliday = holidays.some(h => h.date === dailyForm.date);
    if (isHoliday) {
      const hol = holidays.find(h => h.date === dailyForm.date);
      if (!window.confirm(`Warning: Selected date falls on holiday "${hol.name}" (${hol.type}). Do you still want to log time?`)) return;
    }

    // Check daily logged total
    const existingDayHours = timesheets
      .filter(ts => ts.date === dailyForm.date)
      .reduce((s, ts) => s + parseFloat(ts.hours), 0);
    if (existingDayHours + parseFloat(dailyForm.hours) > 24) {
      alert(`Cannot log more than 24 hours in a single day. You have already logged ${existingDayHours} hours on ${dailyForm.date}.`);
      return;
    }

    const payload = {
      date: dailyForm.date,
      employeeId: user.id,
      projectId: dailyForm.projectId,
      moduleId: dailyForm.moduleId,
      taskId: dailyForm.taskId,
      hours: parseFloat(dailyForm.hours),
      description: dailyForm.description,
      status: 'Draft'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Daily hours logged as Draft!');
        setDailyForm(prev => ({ ...prev, description: '', hours: 8 }));
        fetchData();
      } else {
        alert('Failed to log daily hours.');
      }
    } catch (err) {
      alert('Error saving timesheet: ' + err.message);
    }
  };

  // --- WEEKLY GRID OPERATIONS ---
  const handleWeeklyRowChange = (index, key, val) => {
    setWeeklyRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      let updated = { ...row, [key]: val };
      
      // Cascading for row selects
      if (key === 'projectId') {
        const matchingMods = modules.filter(m => m.projectId === val && m.status === 'Active');
        updated.moduleId = matchingMods[0]?.id || '';
        const matchingTasks = tasks.filter(t => t.projectId === val && t.moduleId === updated.moduleId);
        updated.taskId = matchingTasks[0]?.id || '';
      } else if (key === 'moduleId') {
        const matchingTasks = tasks.filter(t => t.projectId === row.projectId && t.moduleId === val);
        updated.taskId = matchingTasks[0]?.id || '';
      }
      return updated;
    }));
  };

  const handleWeeklyHoursChange = (rowIndex, date, hoursVal) => {
    const numericHours = parseFloat(hoursVal) || 0;
    if (numericHours < 0 || numericHours > 24) return;
    
    setWeeklyRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        hours: { ...row.hours, [date]: numericHours }
      };
    }));
  };

  const handleWeeklyDescChange = (rowIndex, date, descVal) => {
    setWeeklyRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        descriptions: { ...row.descriptions, [date]: descVal }
      };
    }));
  };

  const addWeeklyRow = () => {
    if (tasks.length === 0) {
      alert('No assigned tasks available to add rows.');
      return;
    }
    setWeeklyRows(prev => [
      ...prev,
      {
        projectId: tasks[0].projectId,
        moduleId: tasks[0].moduleId,
        taskId: tasks[0].id,
        hours: { '2026-06-15': 0, '2026-06-16': 0, '2026-06-17': 0, '2026-06-18': 0, '2026-06-19': 0 },
        descriptions: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
        timesheetIds: { '2026-06-15': '', '2026-06-16': '', '2026-06-17': '', '2026-06-18': '', '2026-06-19': '' },
        status: 'Draft'
      }
    ]);
  };

  const removeWeeklyRow = async (index) => {
    const row = weeklyRows[index];
    const idsToDelete = Object.values(row.timesheetIds).filter(id => id !== '');
    
    if (idsToDelete.length > 0 && !window.confirm('Delete row logs? This erases logged hours on database.')) return;
    
    try {
      // Delete from server
      await Promise.all(idsToDelete.map(id => fetch(`${API_BASE_URL}/timesheets/${id}`, { method: 'DELETE', headers: { 'x-user-id': user.id } })));
      setWeeklyRows(prev => prev.filter((_, i) => i !== index));
      fetchData();
    } catch (e) {
      alert('Error deleting row logs: ' + e.message);
    }
  };

  // SAVE OR SUBMIT WEEKLY GRID
  const submitWeeklyGrid = async (statusType) => {
    const weekDays = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
    
    // Check validation of daily sums (cannot exceed 24h/day)
    for (const day of weekDays) {
      let dailySum = 0;
      weeklyRows.forEach(row => {
        dailySum += row.hours[day] || 0;
      });
      if (dailySum > 24) {
        alert(`Failed: Daily total on ${day} is ${dailySum} hours, which exceeds the 24-hour limit!`);
        return;
      }
    }

    try {
      // Loop over rows and save/update
      for (const row of weeklyRows) {
        for (const date of weekDays) {
          const hr = row.hours[date];
          const desc = row.descriptions[date] || 'Weekly sheet log';
          const tsId = row.timesheetIds[date];

          if (hr > 0) {
            const payload = {
              date,
              employeeId: user.id,
              projectId: row.projectId,
              moduleId: row.moduleId,
              taskId: row.taskId,
              hours: hr,
              description: desc,
              status: statusType,
              submittedDate: statusType === 'Submitted' ? '2026-06-18' : null
            };

            if (tsId) {
              // Update
              await fetch(`${API_BASE_URL}/timesheets/${tsId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify(payload)
              });
            } else {
              // Insert
              await fetch(`${API_BASE_URL}/timesheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify(payload)
              });
            }
          } else if (tsId) {
            // Hours reset to 0, delete existing timesheet
            await fetch(`${API_BASE_URL}/timesheets/${tsId}`, { method: 'DELETE', headers: { 'x-user-id': user.id } });
          }
        }
      }

      alert(statusType === 'Submitted' ? 'Timesheet submitted successfully for approval!' : 'Weekly draft saved successfully!');
      fetchData();
    } catch (e) {
      alert('Error updating timesheet: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const allocatedProjIds = allocations.map(a => a.projectId);
  const myActiveProjects = projects.filter(p => allocatedProjIds.includes(p.id) && p.status === 'Active');

  // --- DAILY TIMESHEET VIEW ---
  if (subKey === 'daily') {
    const dailyProjectModules = modules.filter(m => m.projectId === dailyForm.projectId && m.status === 'Active');
    const dailyModuleTasks = tasks.filter(t => t.projectId === dailyForm.projectId && t.moduleId === dailyForm.moduleId);

    return (
      <div className="card" style={{ maxWidth: '580px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Daily Timesheet Hours Entry</h3>
        <form onSubmit={handleDailySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label className="form-label">Work Log Date</label>
            <input
              type="date"
              className="form-control"
              value={dailyForm.date}
              onChange={e => setDailyForm(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allocate Project</label>
            <select
              className="form-control"
              value={dailyForm.projectId}
              onChange={e => handleDailyProjChange(e.target.value)}
              required
            >
              <option value="" disabled>Select Project</option>
              {myActiveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Module Name</label>
            <select
              className="form-control"
              value={dailyForm.moduleId}
              onChange={e => handleDailyModChange(e.target.value)}
              required
            >
              <option value="" disabled>Select Module</option>
              {dailyProjectModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Tasks</label>
            <select
              className="form-control"
              value={dailyForm.taskId}
              onChange={e => setDailyForm(prev => ({ ...prev, taskId: e.target.value }))}
              required
            >
              <option value="" disabled>Select Task</option>
              {dailyModuleTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Hours Logged</label>
            <input
              type="number"
              className="form-control"
              step="0.5"
              min="0.5"
              max="24"
              value={dailyForm.hours}
              onChange={e => setDailyForm(prev => ({ ...prev, hours: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tasks Description Summary</label>
            <textarea
              className="form-control"
              style={{ resize: 'vertical', minHeight: '80px' }}
              value={dailyForm.description}
              onChange={e => setDailyForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Coded validation checks and ran unit testing..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Log Daily Entry</button>
        </form>
      </div>
    );
  }

  // --- WEEKLY TIMESHEET GRID VIEW ---
  if (subKey === 'weekly') {
    const weekDays = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
    
    // Total checks
    const colTotals = weekDays.map(day => {
      return weeklyRows.reduce((sum, row) => sum + (row.hours[day] || 0), 0);
    });
    const totalWeeklyLogged = colTotals.reduce((sum, h) => sum + h, 0);

    return (
      <div className="card timesheet-grid-card">
        <div className="card-header-flex">
          <h3>Weekly Hours Grid (Week of June 15 - June 19, 2026)</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={addWeeklyRow}>+ Add Task Row</button>
            <button className="btn btn-secondary btn-sm" onClick={() => submitWeeklyGrid('Draft')}>Save Draft</button>
            <button className="btn btn-primary btn-sm" onClick={() => submitWeeklyGrid('Submitted')}>Submit Week</button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="timesheet-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '160px' }}>Project</th>
                <th style={{ textAlign: 'left', minWidth: '160px' }}>Module</th>
                <th style={{ textAlign: 'left', minWidth: '180px' }}>Assigned Task</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Total</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {weeklyRows.map((row, index) => {
                const rowProjMods = modules.filter(m => m.projectId === row.projectId && m.status === 'Active');
                const rowModTasks = tasks.filter(t => t.projectId === row.projectId && t.moduleId === row.moduleId);
                const rowTotal = weekDays.reduce((sum, d) => sum + (row.hours[d] || 0), 0);

                return (
                  <tr key={index}>
                    <td>
                      <select className="form-control" style={{ padding: '6px' }} value={row.projectId} onChange={e=>handleWeeklyRowChange(index, 'projectId', e.target.value)}>
                        {myActiveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-control" style={{ padding: '6px' }} value={row.moduleId} onChange={e=>handleWeeklyRowChange(index, 'moduleId', e.target.value)}>
                        {rowProjMods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-control" style={{ padding: '6px' }} value={row.taskId} onChange={e=>handleWeeklyRowChange(index, 'taskId', e.target.value)}>
                        {rowModTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    {weekDays.map(day => (
                      <td key={day}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            className="timesheet-input"
                            value={row.hours[day] || ''}
                            placeholder="0"
                            min="0"
                            max="24"
                            onChange={e => handleWeeklyHoursChange(index, day, e.target.value)}
                          />
                          {(row.hours[day] || 0) > 0 && (
                            <input
                              type="text"
                              className="timesheet-desc-input"
                              value={row.descriptions[day] || ''}
                              placeholder="Remarks"
                              onChange={e => handleWeeklyDescChange(index, day, e.target.value)}
                            />
                          )}
                        </div>
                      </td>
                    ))}
                    <td><strong>{rowTotal} hrs</strong></td>
                    <td>
                      <button type="button" className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => removeWeeklyRow(index)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ textAlign: 'right' }}>Daily Totals:</td>
                {colTotals.map((tot, idx) => (
                  <td key={idx} className={tot > 8 ? 'text-warning' : ''}>{tot} hrs</td>
                ))}
                <td>{totalWeeklyLogged} hrs</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SUB VIEW 3: TIMESHEET HISTORY ---
  if (subKey === 'history') {
    const filteredHistory = timesheets.filter(ts => {
      const matchesProj = filterProject ? ts.projectId === filterProject : true;
      const matchesStatus = filterStatus ? ts.status === filterStatus : true;
      const matchesMonth = filterMonth ? ts.date.startsWith(filterMonth) : true;
      return matchesProj && matchesStatus && matchesMonth;
    });

    return (
      <div>
        <div className="page-actions-bar" style={{ gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ maxWidth: '160px' }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select className="form-control" style={{ maxWidth: '160px' }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <input
              type="month"
              className="form-control"
              style={{ maxWidth: '180px' }}
              value={filterMonth}
              onChange={e=>setFilterMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Log Date</th>
                <th>Project Name</th>
                <th>Task Target</th>
                <th>Hours Logged</th>
                <th>Task Summary</th>
                <th>Approval Status</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No matching timesheet history logs found.</td></tr>
              ) : filteredHistory.map(ts => {
                const p = projects.find(proj => proj.id === ts.projectId);
                const t = tasks.find(tsk => tsk.id === ts.taskId);
                return (
                  <tr key={ts.id}>
                    <td><strong>{ts.date}</strong></td>
                    <td>{p ? p.name : 'Unknown'}</td>
                    <td>{t ? t.name : 'Unknown'}</td>
                    <td>{ts.hours} hrs</td>
                    <td>{ts.description}</td>
                    <td><span className={`badge badge-${ts.status.toLowerCase()}`}>{ts.status}</span></td>
                    <td><small className="text-secondary">{ts.comments || 'No feedback yet'}</small></td>
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
