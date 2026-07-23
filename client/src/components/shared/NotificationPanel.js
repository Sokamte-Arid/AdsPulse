import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, Bell, Campaigns, CheckCircle, CreditCard, DollarSign, DynIcon, Target, XCircle } from './Icons.js';;

export default function NotificationPanel() {
  const { t }       = useLanguage();
  const [open,      setOpen]   = useState(false);
  const [notifs,    setNotifs] = useState([]);
  const panelRef    = useRef();

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifs = () => {
    notificationsAPI.getAll().then(r => {
      const data = r.data;
      const list = Array.isArray(data)
        ? data
        : data?.notifications || data?.data || [];
      setNotifs(list);
    }).catch(() => setNotifs([]));
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead().catch(() => {});
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    await notificationsAPI.dismiss(id).catch(() => {});
    setNotifs(ns => ns.filter(n => n._id !== id));
  };

  const handleMarkRead = async (id) => {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifs(ns => ns.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const typeIcon = {
    budget:DollarSign, campaign:Campaigns, milestone:Target,
    payment:CreditCard, info:'ℹ️', success:CheckCircle, warning:AlertTriangle, error:XCircle
  };

  return (
    <div ref={panelRef} style={{ position:'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position:'relative', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:9, padding:'7px 10px', cursor:'pointer', display:'flex', alignItems:'center', color:'white', backdropFilter:'blur(8px)' }}>
        <Bell size={14}/>
        {unread > 0 && (
          <div style={{ position:'absolute', top:-5, right:-5, width:18, height:18, borderRadius:'50%', background:'#ef4444', color:'white', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg-page)' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:340, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, boxShadow:'0 16px 48px rgba(0,0,0,0.25)', zIndex:1000, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{t('notifications.title')}</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize:11, fontWeight:600, color:'var(--purple-light)', background:'none', border:'none', cursor:'pointer' }}>
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>

          <div style={{ maxHeight:380, overflowY:'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ marginBottom:8, color:"var(--text-faint)" }}><Bell size={32}/></div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)' }}>{t('notifications.no_notifications')}</div>
                <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:4 }}>{t('notifications.no_notifications_desc')}</div>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n._id} onClick={() => handleMarkRead(n._id)}
                  style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-subtle)', cursor:'pointer', background:n.read?'transparent':'rgba(124,58,237,0.04)', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ display:"flex", alignItems:"center", flexShrink:0 }}><DynIcon icon={typeIcon[n.type] || Bell} size={18}/></span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:n.read?500:700, color:'var(--text-primary)', marginBottom:2 }}>{n.title}</div>
                    {n.message && <div style={{ fontSize:12, color:'var(--text-faint)', lineHeight:1.4, marginBottom:3 }}>{n.message}</div>}
                    <div style={{ fontSize:11, color:'var(--text-faint)' }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <button onClick={e => handleDismiss(n._id, e)}
                    style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:16, padding:'0 2px', flexShrink:0, opacity:0.6 }}>
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}