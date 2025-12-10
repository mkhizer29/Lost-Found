import React, { useState, useEffect } from "react";
import { API_BASE } from "../config";

export default function Navbar({ user, onLogout }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false); // <--- New Loading State

  // Poll for notifications
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch with loading state
    fetchNotifs(true);

    // Poll every 10s (silently)
    const interval = setInterval(() => fetchNotifs(false), 10000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchNotifs(isInitial = false) {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: "include" });
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error(e); }
    if (isInitial) setLoading(false);
  }

  async function toggleDropdown() {
    if (!showDropdown && unreadCount > 0) {
        // Mark read on backend
        await fetch(`${API_BASE}/api/notifications/mark-read`, { method: "POST", credentials: "include" });
        // Mark read locally instantly
        setNotifications(prev => prev.map(n => ({...n, is_read: 'Y'})));
    }
    setShowDropdown(!showDropdown);
  }

  const unreadCount = notifications.filter(n => n.is_read === 'N').length;

  return (
    <header className="app-header">
      <div>
        <h1>Campus Lost & Found</h1>
        <p className="subtitle">Welcome, {user.full_name} ({user.role})</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* --- NOTIFICATION BELL --- */}
        <div className="notif-container" onClick={toggleDropdown}>
           <span className="bell-icon">🔔</span>
           {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
           
           {showDropdown && (
             <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
               <div className="notif-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && <button className="mark-read-btn">Mark all read</button>}
               </div>
               
               <div className="notif-list">
                 {loading && notifications.length === 0 ? (
                    <div className="empty-notif">Checking for alerts...</div>
                 ) : notifications.length === 0 ? (
                    <div className="empty-notif">No new notifications.</div>
                 ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.is_read === 'N' ? 'unread' : ''}`}>
                        <div className="notif-message">{n.message}</div>
                        <span className="notif-date">{new Date(n.date).toLocaleString()}</span>
                      </div>
                    ))
                 )}
               </div>
             </div>
           )}
        </div>

        <button onClick={onLogout} className="cancel-btn">Logout</button>
      </div>
    </header>
  );
}