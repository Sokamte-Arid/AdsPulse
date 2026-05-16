import React, { useState } from 'react';
import Sidebar from './Sidebar';
import SessionManager from './SessionManager';

export default function Layout({ children }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-page)' }}>
      {/* Session expiry handler */}
      <SessionManager />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99, backdropFilter:'blur(2px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapseChange={setCollapsed}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main style={{ flex:1, marginLeft: collapsed ? 72 : 240, transition:'margin-left 0.3s ease', minWidth:0 }}>
        {/* Mobile header */}
        <div className="mobile-show" style={{
          display:'none', padding:'12px 16px',
          background:'var(--sidebar-bg)', borderBottom:'1px solid var(--border-subtle)',
          alignItems:'center', gap:12, position:'sticky', top:0, zIndex:50
        }}>
          <button onClick={() => setMobileOpen(true)}
            style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', display:'flex', padding:4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ fontWeight:800, fontSize:16, color:'var(--text-primary)' }}>⚡ AdsPulse</div>
        </div>

        <div style={{ padding:'28px 28px 60px', maxWidth:1400, margin:'0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
