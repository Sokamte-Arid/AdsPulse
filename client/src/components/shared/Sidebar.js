import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { path:'/dashboard',   label:'Dashboard',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { path:'/campaigns',   label:'Campaigns',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { path:'/analytics',   label:'Analytics',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { path:'/performance', label:'Performance',  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { path:'/compare',     label:'Compare',      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg> },
  { path:'/ad-spend',    label:'Ad Spend',     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { path:'/team',        label:'Team',         icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { path:'/connect',     label:'Integrations', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
  { path:'/security',    label:'Security',     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];

export default function Sidebar({ collapsed, mobileOpen, onCollapseChange, onMobileClose }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleCollapse = () => onCollapseChange && onCollapseChange(!collapsed);

  return (
    <>
      <style>{`
        @media (max-width:768px) {
          .sidebar-el { transform:${mobileOpen?'translateX(0)':'translateX(-100%)'} !important; width:265px !important; }
          .mobile-hide { display:none !important; }
          .mobile-show { display:flex !important; }
        }
        @media (min-width:769px) { .mobile-show { display:none !important; } }
      `}</style>

      <aside className="sidebar-el" style={{ width:collapsed?72:240, minHeight:'100vh', background:'var(--sidebar-bg)', borderRight:'1px solid var(--border-subtle)', display:'flex', flexDirection:'column', transition:'width 0.3s ease, transform 0.3s ease', position:'fixed', left:0, top:0, bottom:0, zIndex:100, boxShadow:'2px 0 16px rgba(0,0,0,0.1)' }}>

        {/* Logo */}
        <div style={{ padding:'16px 14px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,flexShrink:0,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,color:'white',fontWeight:800 }}>⚡</div>
          {!collapsed && <div style={{ flex:1,overflow:'hidden' }}><div style={{ fontWeight:800,fontSize:15,color:'var(--text-primary)',letterSpacing:'-0.3px' }}>AdsPulse</div><div style={{ fontSize:10,color:'var(--text-faint)',fontWeight:500 }}>Cross-Platform Ads</div></div>}
          <button onClick={handleCollapse} className="mobile-hide" style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',padding:4,display:'flex',alignItems:'center',marginLeft:'auto',flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{collapsed?<path d="M9 18l6-6-6-6"/>:<path d="M15 18l-6-6 6-6"/>}</svg>
          </button>
          <button onClick={onMobileClose} className="mobile-show" style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',padding:4,display:'none',alignItems:'center',marginLeft:'auto' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({isActive})=>`sidebar-link${isActive?' active':''}`}
              style={{ justifyContent:collapsed?'center':undefined }}
              title={collapsed?item.label:undefined}
              onClick={onMobileClose}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
          <div style={{ paddingTop:10 }}>
            <button onClick={()=>{navigate('/campaigns/new');onMobileClose&&onMobileClose();}} className="btn-primary" style={{ width:'100%',justifyContent:'center',fontSize:12,padding:'8px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              {!collapsed&&'New Campaign'}
            </button>
          </div>
        </nav>

        {/* Theme + User */}
        <div style={{ borderTop:'1px solid var(--border-subtle)' }}>
          <div style={{ padding:'10px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid var(--border-subtle)' }}>
            {!collapsed&&<span style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',flex:1 }}>{isDark?'🌙 Dark':'☀️ Light'}</span>}
            <button className="theme-toggle" onClick={toggleTheme} style={{ margin:collapsed?'0 auto':undefined }} title={isDark?'Light mode':'Dark mode'}/>
          </div>
          <div style={{ padding:'10px 14px',display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:30,height:30,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#7c3aed,#ec4899)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white' }}>
              {user?.name?.[0]?.toUpperCase()||'U'}
            </div>
            {!collapsed&&<>
              <div style={{ flex:1,overflow:'hidden' }}>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize:10,color:'var(--text-faint)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.email}</div>
              </div>
              <button onClick={logout} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',padding:4,display:'flex',flexShrink:0 }} title="Sign out">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </button>
            </>}
          </div>
        </div>
      </aside>
    </>
  );
}
