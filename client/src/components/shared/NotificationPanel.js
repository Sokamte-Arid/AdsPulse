import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';

const TYPE_STYLES = {
  warning: { icon:'⚠️', color:'#d97706', bg:'rgba(217,119,6,0.12)'  },
  success: { icon:'✅', color:'#16a34a', bg:'rgba(22,163,74,0.12)'  },
  info:    { icon:'ℹ️',  color:'#2563eb', bg:'rgba(37,99,235,0.12)' },
  error:   { icon:'❌', color:'#dc2626', bg:'rgba(220,38,38,0.12)'  },
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function NotificationPanel() {
  const [open, setOpen]  = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=30');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently fail — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(()=>{});
    setNotifications(ns => ns.map(n => n._id===id ? {...n,read:true} : n));
    setUnreadCount(c => Math.max(0, c-1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(()=>{});
    setNotifications(ns => ns.map(n => ({...n,read:true})));
    setUnreadCount(0);
  };

  const dismiss = async (id) => {
    await api.delete(`/notifications/${id}`).catch(()=>{});
    const n = notifications.find(n=>n._id===id);
    setNotifications(ns => ns.filter(n => n._id!==id));
    if (n && !n.read) setUnreadCount(c => Math.max(0,c-1));
  };

  return (
    <div ref={panelRef} style={{ position:'relative' }}>
      <button onClick={()=>{ setOpen(!open); if(!open) fetchNotifications(); }} style={{
        position:'relative', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)',
        borderRadius:10, padding:'8px 10px', cursor:'pointer', display:'flex', alignItems:'center',
        color:'var(--text-muted)', transition:'all 0.2s'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <div style={{ position:'absolute',top:-5,right:-5,width:18,height:18,background:'#ef4444',borderRadius:'50%',fontSize:10,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid var(--bg-page)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute',top:'calc(100% + 10px)',right:0,width:360,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,boxShadow:'0 16px 48px rgba(0,0,0,0.25)',zIndex:1000,overflow:'hidden',animation:'slideUp 0.2s ease-out',maxWidth:'calc(100vw - 20px)' }}>
          {/* Header */}
          <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border-subtle)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div style={{ fontWeight:700,fontSize:15,color:'var(--text-primary)' }}>
              Notifications
              {unreadCount > 0 && <span style={{ fontSize:11,fontWeight:700,color:'#ef4444',marginLeft:6 }}>({unreadCount} new)</span>}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background:'none',border:'none',fontSize:11,fontWeight:600,color:'var(--purple-light)',cursor:'pointer' }}>
                  Mark all read
                </button>
              )}
              <button onClick={fetchNotifications} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:16 }} title="Refresh">↻</button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight:420,overflowY:'auto' }}>
            {loading && <div style={{ padding:'20px',textAlign:'center',color:'var(--text-faint)',fontSize:13 }}>Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div style={{ padding:'36px 20px',textAlign:'center',color:'var(--text-faint)',fontSize:13 }}>
                <div style={{ fontSize:36,marginBottom:10 }}>🔔</div>
                <div style={{ fontWeight:600,marginBottom:4 }}>All caught up!</div>
                <div style={{ fontSize:12 }}>No notifications yet. Alerts about budget, campaigns and milestones will appear here.</div>
              </div>
            )}
            {notifications.map(n => {
              const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
              return (
                <div key={n._id} onClick={()=>markRead(n._id)} style={{ padding:'13px 18px',borderBottom:'1px solid var(--border-subtle)',background:n.read?'transparent':'var(--bg-hover)',cursor:'pointer',transition:'background 0.15s',display:'flex',gap:11,alignItems:'flex-start' }}>
                  <div style={{ width:32,height:32,borderRadius:8,background:style.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>
                    {style.icon}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6,marginBottom:3 }}>
                      <div style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)',lineHeight:1.3 }}>{n.title}</div>
                      <div style={{ fontSize:10,color:'var(--text-faint)',whiteSpace:'nowrap',flexShrink:0 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    <div style={{ fontSize:11,color:'var(--text-muted)',lineHeight:1.5 }}>{n.message}</div>
                    {!n.read && <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--purple-primary)',marginTop:6 }}/>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();dismiss(n._id);}} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',padding:2,flexShrink:0,fontSize:13,lineHeight:1 }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.some(n=>n.read) && (
            <div style={{ padding:'10px 18px',borderTop:'1px solid var(--border-subtle)',textAlign:'center' }}>
              <button onClick={async()=>{ await api.delete('/notifications/clear-read').catch(()=>{}); fetchNotifications(); }} style={{ background:'none',border:'none',fontSize:11,color:'var(--text-faint)',cursor:'pointer' }}>
                Clear read notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
