import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Dashboard, Campaigns, Analytics, Performance,
  AdSpend, Connect, Planner, Team, Security, Profile,
  Sun, Moon, Logout, Bolt, MessageSquare,
} from './Icons';

const NAV = [
  { to:'/dashboard',   Icon: Dashboard,     key:'dashboard'   },
  { to:'/campaigns',   Icon: Campaigns,     key:'campaigns'   },
  { to:'/analytics',   Icon: Analytics,     key:'analytics'   },
  { to:'/performance', Icon: Performance,   key:'performance' },
  { to:'/ad-spend',    Icon: AdSpend,       key:'ad_spend'    },
  { to:'/connect',     Icon: Connect,       key:'connect'     },
  { to:'/planner',     Icon: Planner,       key:'planner'     },
  { to:'/inbox',       Icon: MessageSquare, key:'inbox'       },
  { to:'/team',        Icon: Team,          key:'team'        },
  { to:'/security',    Icon: Security,      key:'security'    },
  { to:'/profile',     Icon: Profile,       key:'profile'     },
];

export default function Sidebar({ collapsed, onCollapseChange }) {
  const { user, logout }       = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t }                  = useLanguage();
  const navigate               = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s ease',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? '18px 14px' : '18px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--border-subtle)', minHeight:64 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white' }}>
          <Bolt size={18} />
        </div>
        {!collapsed && <span style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', whiteSpace:'nowrap' }}>AdsPulse</span>}
        <button
          onClick={() => onCollapseChange && onCollapseChange(!collapsed)}
          style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', padding:4, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <polyline points="9 18 15 12 9 6"/> : <polyline points="15 18 9 12 15 6"/>}
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(({ to, Icon: NavIcon, key }) => (
          <NavLink key={to} to={to} title={collapsed ? t(`nav.${key}`) : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px' : '9px 12px',
              borderRadius: 9, textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--purple-light)' : 'var(--text-muted)',
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              transition: 'all 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}>
            <NavIcon size={16} />
            {!collapsed && <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{ padding:'10px 8px', borderTop:'1px solid var(--border-subtle)', display:'flex', flexDirection:'column', gap:6 }}>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            display:'flex', alignItems:'center', gap:10,
            padding: collapsed ? '10px' : '9px 12px',
            borderRadius:9, border:'none', background:'transparent',
            color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:500,
            fontFamily:'DM Sans,sans-serif',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition:'all 0.15s', width:'100%',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User + logout */}
        {!collapsed ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:'var(--bg-elevated)' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'var(--text-faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>
            <button onClick={handleLogout} title={t('nav.logout')}
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center', transition:'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Logout size={15} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} title={t('nav.logout')}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', borderRadius:9, border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', width:'100%', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            <Logout size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}