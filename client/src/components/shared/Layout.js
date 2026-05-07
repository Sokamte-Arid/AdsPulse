import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotificationPanel from './NotificationPanel';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-page)' }}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarOpen}
        onCollapseChange={setSidebarCollapsed}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main style={{
        marginLeft: window.innerWidth <= 768 ? 0 : sidebarCollapsed ? 72 : 240,
        flex:1, minWidth:0,
        padding:'clamp(16px,3vw,28px) clamp(12px,3vw,32px)',
        minHeight:'100vh',
        transition:'margin-left 0.3s ease'
      }}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{
          display:'none', alignItems:'center', gap:12,
          marginBottom:20, paddingBottom:16,
          borderBottom:'1px solid var(--border-subtle)'
        }}
          id="mobile-topbar"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:16, color:'var(--text-primary)' }}>AdsPulse</span>
          </div>
        </div>

        <style>{`
          @media (max-width:768px) {
            #mobile-topbar { display:flex !important; }
          }
        `}</style>

        {children}
      </main>
    </div>
  );
}
