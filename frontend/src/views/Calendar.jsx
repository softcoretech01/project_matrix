import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../context/AuthContext';
import { formatDate } from '../utils/date';

export default function Calendar({ tasks: propTasks, onSelectTask, embedded = false }) {
  // Current viewed month and year
  const [currentDate, setCurrentDate] = useState(new Date());
  const [fetchedTasks, setFetchedTasks] = useState([]);
  const [selectedDayTasks, setSelectedDayTasks] = useState(null); // { dateStr, dayNum, tasks: [] }

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setFetchedTasks(data);
      }
    } catch (err) {
      console.error('Error fetching calendar tasks:', err);
    }
  };

  useEffect(() => {
    if (!propTasks) {
      fetchTasks();
    }

    const handleUpdate = () => {
      fetchTasks();
    };
    window.addEventListener('pm_data_updated', handleUpdate);
    return () => window.removeEventListener('pm_data_updated', handleUpdate);
  }, [propTasks]);

  // Always use propTasks if passed from parent, fallback to fetchedTasks
  const allTasks = propTasks !== undefined ? propTasks : fetchedTasks;

  // Date normalizer to YYYY-MM-DD
  const normalizeDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  const getTaskPrimaryDate = (task) => {
    return normalizeDateStr(task.dueDate || task.end_date || task.endDate || task.startDate || task.start_date);
  };

  // Map tasks by date YYYY-MM-DD
  const scheduledTasksMap = useMemo(() => {
    const map = {};
    (allTasks || []).forEach(t => {
      const dateStr = getTaskPrimaryDate(t);
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(t);
      }
    });
    return map;
  }, [allTasks]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Month navigation controls
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Month Grid Calculations with complete edge days (standard calendar)
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendarGridCells = useMemo(() => {
    const cells = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        tasks: scheduledTasksMap[dateStr] || []
      });
    }

    // 2. Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        tasks: scheduledTasksMap[dateStr] || []
      });
    }

    // 3. Next month leading days (fill row up to multiple of 7)
    const totalSlots = cells.length;
    const remainingSlots = (Math.ceil(totalSlots / 7) * 7) - totalSlots;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        tasks: scheduledTasksMap[dateStr] || []
      });
    }

    return cells;
  }, [year, month, firstDayIndex, totalDaysInMonth, prevMonthLastDay, scheduledTasksMap]);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. CALENDAR HEADER (Month Navigation & Priority Legend - No Add Task, No Filters) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-secondary)', 
        padding: '14px 20px', 
        borderRadius: '10px', 
        flexWrap: 'wrap', 
        gap: '14px', 
        border: '1px solid var(--border-color)'
      }}>
        {/* Navigation & Current Month */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={prevMonth} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
              title="Previous Month"
            >
              <i className="ph-bold ph-caret-left"></i> Prev
            </button>
            <button 
              onClick={goToToday} 
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '600' }} 
              title="Jump to Today"
            >
              Today
            </button>
            <button 
              onClick={nextMonth} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
              title="Next Month"
            >
              Next <i className="ph-bold ph-caret-right"></i>
            </button>
          </div>

          <h2 style={{ 
            margin: 0, 
            fontSize: '1.35rem', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="ph-bold ph-calendar-blank" style={{ color: 'var(--color-primary)' }}></i>
            {monthNames[month]} <span style={{ color: 'var(--color-primary)' }}>{year}</span>
          </h2>
        </div>

        {/* Priority Color Legend (Clean & Informative) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-danger)' }} />
            <span>High Priority</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} />
            <span>Medium Priority</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)' }} />
            <span>Low Priority</span>
          </div>
        </div>
      </div>

      {/* 2. CALENDAR MONTH GRID (PDF Section 6.10: Clean mapping of tasks to due dates) */}
      <div style={{ 
        overflowX: 'auto', 
        WebkitOverflowScrolling: 'touch', 
        borderRadius: '10px', 
        border: '1px solid var(--border-color)', 
        background: 'var(--card-bg)'
      }}>
        <div style={{ minWidth: '760px', padding: '16px' }}>
          
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
            {daysOfWeek.map((d, idx) => (
              <div 
                key={d} 
                style={{ 
                  fontSize: '12px', 
                  fontWeight: '700',
                  padding: '8px 4px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.8px',
                  color: (idx === 0 || idx === 6) ? 'var(--color-primary)' : 'var(--text-muted)'
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {calendarGridCells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              const hasTasks = cell.tasks && cell.tasks.length > 0;

              return (
                <div 
                  key={`${cell.dateStr}-${idx}`} 
                  onClick={() => {
                    if (hasTasks) {
                      setSelectedDayTasks({
                        dateStr: cell.dateStr,
                        dayNum: cell.dayNum,
                        tasks: cell.tasks
                      });
                    }
                  }}
                  style={{ 
                    background: isToday 
                      ? 'rgba(99, 102, 241, 0.08)' 
                      : (cell.isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-surface)'), 
                    border: isToday 
                      ? '2px solid var(--color-primary)' 
                      : '1px solid var(--border-color)', 
                    boxShadow: isToday ? '0 0 10px var(--color-primary-glow)' : 'none',
                    minHeight: '120px', 
                    borderRadius: '8px', 
                    padding: '8px 8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px',
                    position: 'relative',
                    cursor: hasTasks ? 'pointer' : 'default',
                    transition: 'border-color 0.15s ease',
                    opacity: cell.isCurrentMonth ? 1 : 0.35
                  }}
                  onMouseEnter={(e) => {
                    if (hasTasks) e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isToday 
                      ? 'var(--color-primary)' 
                      : 'var(--border-color)';
                  }}
                >
                  {/* Day Number Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: isToday ? '800' : '600', 
                      color: isToday ? '#ffffff' : 'var(--text-primary)',
                      background: isToday ? 'var(--color-primary)' : 'transparent',
                      width: '24px',
                      height: '24px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}>
                      {cell.dayNum}
                    </span>

                    {cell.tasks.length > 0 && (
                      <span 
                        style={{ 
                          fontSize: '10px', 
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'var(--card-bg)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {cell.tasks.length} task{cell.tasks.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Task Chips inside Day Cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'hidden' }}>
                    {cell.tasks.slice(0, 3).map(t => {
                      const isDone = ['Completed', 'Closed'].includes(t.status);
                      const priorityColor = t.priority === 'High' 
                        ? 'var(--color-danger)' 
                        : (t.priority === 'Low' ? 'var(--color-info)' : 'var(--color-warning)');

                      return (
                        <div 
                          key={t.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTask) onSelectTask(t);
                          }}
                          style={{ 
                            background: 'var(--card-bg)', 
                            padding: '5px 7px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            borderLeft: `3px solid ${priorityColor}`,
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }} 
                          title={`Click to open: ${t.title} [${t.project || 'Project'}] - ${t.status} (Assignee: ${t.assignee})`}
                        >
                          <span style={{ 
                            textDecoration: isDone ? 'line-through' : 'none', 
                            opacity: isDone ? 0.6 : 1, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap', 
                            fontWeight: '600',
                            maxWidth: '82%'
                          }}>
                            {t.title}
                          </span>
                          {isDone ? (
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-success)' }}>✓</span>
                          ) : (
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: priorityColor, 
                              display: 'inline-block' 
                            }} />
                          )}
                        </div>
                      );
                    })}

                    {cell.tasks.length > 3 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '700', textAlign: 'center', paddingTop: '2px' }}>
                        +{cell.tasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DAY DETAILS POPUP (When clicking a day cell with multiple tasks) */}
      {selectedDayTasks && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Tasks for {formatDate(selectedDayTasks.dateStr)}
                </h3>
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  {selectedDayTasks.tasks.length} task{selectedDayTasks.tasks.length !== 1 ? 's' : ''} scheduled
                </span>
              </div>
              <button 
                onClick={() => setSelectedDayTasks(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Tasks List */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayTasks.tasks.map(t => {
                const priorityColor = t.priority === 'High' 
                  ? 'var(--color-danger)' 
                  : (t.priority === 'Low' ? 'var(--color-info)' : 'var(--color-warning)');

                return (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setSelectedDayTasks(null);
                      if (onSelectTask) onSelectTask(t);
                    }}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${priorityColor}`,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{t.title}</strong>
                      <span 
                        className={`badge badge-${t.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`}
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>📁 {t.project}</span>
                      <span>👤 {t.assignee}</span>
                      <span style={{ color: priorityColor, fontWeight: 600 }}>⚡ {t.priority}</span>
                    </div>
                    {t.assignedBy && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                        Assigned by: <strong style={{ color: 'var(--text-primary)' }}>{t.assignedBy}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-secondary)'
            }}>
              <button 
                onClick={() => setSelectedDayTasks(null)}
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '6px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      {content}
    </div>
  );
}
