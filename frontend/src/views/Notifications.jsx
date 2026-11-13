import React, { useState } from 'react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <div>
          <h2>Notifications Center</h2>
          <p className="text-muted" style={{ margin: 0 }}>You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={markAllAsRead} className="btn btn-secondary" style={{ fontSize: '13px' }}>Mark all as read</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.length === 0 ? (
          <div className="card text-center" style={{ padding: '40px' }}>
            <p className="text-muted" style={{ margin: 0 }}>No notifications at this time. All caught up! 🎉</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: n.isRead ? 'var(--bg-secondary)' : 'var(--card-bg)', borderLeft: n.isRead ? '4px solid transparent' : '4px solid var(--color-primary)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>{n.type === 'task' ? '📋' : n.type === 'comment' ? '💬' : '🔔'}</span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{n.title}</h4>
                  <p className="text-muted" style={{ margin: '0 0 6px 0', fontSize: '14px' }}>{n.message}</p>
                  <span className="text-muted" style={{ fontSize: '12px' }}>{n.time}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!n.isRead && <span className="badge badge-primary">New</span>}
                <button onClick={() => deleteNotification(n.id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>Dismiss</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
