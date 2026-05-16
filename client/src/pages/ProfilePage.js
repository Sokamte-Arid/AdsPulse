import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import api, { authAPI } from '../utils/api';

// ── Eye icon ──────────────────────────────────────────────────────────────────
const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const TIMEZONES = [
  'UTC','Africa/Douala','Africa/Lagos','Africa/Nairobi','Africa/Johannesburg',
  'Africa/Cairo','Africa/Accra','Europe/London','Europe/Paris','Europe/Berlin',
  'Europe/Madrid','Europe/Rome','America/New_York','America/Chicago',
  'America/Denver','America/Los_Angeles','America/Sao_Paulo',
  'Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Singapore',
  'Asia/Tokyo','Asia/Shanghai','Australia/Sydney','Pacific/Auckland'
];

const CURRENCIES = [
  { code:'USD', label:'US Dollar ($)' },
  { code:'EUR', label:'Euro (€)' },
  { code:'GBP', label:'British Pound (£)' },
  { code:'XAF', label:'CFA Franc (XAF)' },
  { code:'NGN', label:'Nigerian Naira (₦)' },
  { code:'KES', label:'Kenyan Shilling (KES)' },
  { code:'ZAR', label:'South African Rand (R)' },
  { code:'GHS', label:'Ghanaian Cedi (₵)' },
  { code:'CAD', label:'Canadian Dollar (CA$)' },
  { code:'AUD', label:'Australian Dollar (A$)' },
];

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pwd) {
  if (!pwd) return null;
  let s = 0;
  if (pwd.length >= 8)  s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 1) return { label:'Weak',   color:'#ef4444', pct:25  };
  if (s <= 2) return { label:'Fair',   color:'#d97706', pct:50  };
  if (s <= 3) return { label:'Good',   color:'#3b82f6', pct:75  };
  return              { label:'Strong', color:'#16a34a', pct:100 };
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, subtitle, icon, children }) {
  return (
    <div className="glass-card" style={{ padding:28, marginBottom:20 }}>
      <div style={{ marginBottom:22, paddingBottom:16, borderBottom:'1px solid var(--border-subtle)', display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(124,58,237,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast]         = useState({ msg:'', type:'info' });
  const avatarRef = useRef(null);

  // Profile form
  const [profile, setProfile]     = useState({ name:'', email:'' });
  const [prefs,   setPrefs]       = useState({ currency:'USD', timezone:'UTC', notifications:true });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [passwords, setPasswords] = useState({ current:'', newPass:'', confirm:'' });
  const [showPw, setShowPw]       = useState({ current:false, new:false, confirm:false });
  const [savingPw, setSavingPw]   = useState(false);

  // Delete account
  const [deletePass,    setDeletePass]    = useState('');
  const [showDeletePw,  setShowDeletePw]  = useState(false);
  const [deletingAcct,  setDeletingAcct]  = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 5000);
  };

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', email: user.email || '' });
      setPrefs({
        currency:      user.preferences?.currency      || 'USD',
        timezone:      user.preferences?.timezone      || 'UTC',
        notifications: user.preferences?.notifications !== false
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/profile', {
        name: profile.name,
        email: profile.email,
        preferences: prefs
      });
      await refreshUser();
      showToast('✅ Profile updated successfully');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      showToast('❌ Please fill in all password fields', 'error'); return;
    }
    if (passwords.newPass !== passwords.confirm) {
      showToast('❌ New passwords do not match', 'error'); return;
    }
    if (passwords.newPass.length < 6) {
      showToast('❌ Password must be at least 6 characters', 'error'); return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
      setPasswords({ current:'', newPass:'', confirm:'' });
      showToast('✅ Password changed successfully');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setSavingPw(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) { showToast('❌ Password is required', 'error'); return; }
    setDeletingAcct(true);
    try {
      await api.delete('/profile', { data: { password: deletePass } });
      logout();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
      setDeletingAcct(false);
    }
  };

  const strength = getStrength(passwords.newPass);

  const toastStyles = {
    success: { bg:'rgba(22,163,74,0.12)',  border:'rgba(22,163,74,0.3)'  },
    error:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
    info:    { bg:'rgba(37,99,235,0.1)',   border:'rgba(37,99,235,0.25)' },
  };

  const tabs = [
    { id:'profile',   label:'👤 Profile'   },
    { id:'password',  label:'🔑 Password'  },
    { id:'prefs',     label:'⚙️ Preferences' },
    { id:'danger',    label:'⚠️ Danger Zone' },
  ];

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:400, padding:'14px 18px', borderRadius:12, background:toastStyles[toast.type]?.bg, border:`1px solid ${toastStyles[toast.type]?.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={() => setToast({msg:'',type:'info'})} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:18,padding:0 }}>✕</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Settings</h1>
          <p className="page-subtitle">Manage your account information and preferences</p>
        </div>
      </div>

      {/* Avatar + name banner */}
      <div className="glass-card" style={{ padding:24, marginBottom:20, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
        {/* Avatar circle */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'white', border:'3px solid var(--border-subtle)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:3 }}>{user?.name}</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:3 }}>{user?.email}</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'rgba(124,58,237,0.12)', color:'var(--purple-light)', fontWeight:700, textTransform:'capitalize', border:'1px solid rgba(124,58,237,0.25)' }}>
              {user?.role}
            </span>
            <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background: user?.twoFactorEnabled ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: user?.twoFactorEnabled ? '#16a34a' : '#ef4444', fontWeight:700, border:`1px solid ${user?.twoFactorEnabled ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              2FA {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <span style={{ fontSize:11, color:'var(--text-faint)' }}>
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:22, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content', flexWrap:'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'8px 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background: activeTab===tab.id ? (tab.id==='danger' ? 'rgba(239,68,68,0.2)' : 'var(--bg-card)') : 'transparent',
            color: activeTab===tab.id ? (tab.id==='danger' ? '#ef4444' : 'var(--text-primary)') : 'var(--text-faint)',
            boxShadow: activeTab===tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition:'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <Section icon="👤" title="Personal Information" subtitle="Update your name and email address">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, marginBottom:22 }}>
            <div>
              <label className="form-label">Full Name</label>
              <input className="form-input" value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name:e.target.value }))}
                placeholder="Your full name"/>
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email:e.target.value }))}
                placeholder="you@company.com"/>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
                Changing email will require a fresh login.
              </div>
            </div>
          </div>

          {/* Read-only info */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:22 }}>
            {[
              { label:'Role',        value: user?.role,       cap:true },
              { label:'2FA Method',  value: user?.twoFactorEnabled ? (user?.twoFactorMethod === 'totp' ? 'Authenticator App' : 'Email Code') : 'Not enabled' },
              { label:'Last Login',  value: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A' },
              { label:'User ID',     value: user?.id?.slice(-8), mono:true },
            ].map(item => (
              <div key={item.label} style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', textTransform: item.cap?'capitalize':'none', fontFamily: item.mono?'DM Mono,monospace':'inherit' }}>{item.value || '—'}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile} style={{ minWidth:160, justifyContent:'center' }}>
              {savingProfile ? '⏳ Saving...' : '✓ Save Profile'}
            </button>
          </div>
        </Section>
      )}

      {/* ── PASSWORD TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'password' && (
        <Section icon="🔑" title="Change Password" subtitle="Use a strong password of at least 8 characters">
          <div style={{ maxWidth:420, display:'flex', flexDirection:'column', gap:14 }}>

            {/* Current password */}
            <div>
              <label className="form-label">Current Password</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showPw.current?'text':'password'} placeholder="••••••••"
                  value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current:e.target.value }))}
                  style={{ paddingRight:44 }}/>
                <button type="button" onClick={() => setShowPw(s => ({ ...s, current:!s.current }))}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                  <EyeIcon open={showPw.current}/>
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="form-label">New Password</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showPw.new?'text':'password'} placeholder="••••••••"
                  value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass:e.target.value }))}
                  style={{ paddingRight:44 }}/>
                <button type="button" onClick={() => setShowPw(s => ({ ...s, new:!s.new }))}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                  <EyeIcon open={showPw.new}/>
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div style={{ marginTop:8 }}>
                  <div style={{ height:3, borderRadius:2, background:'var(--bg-elevated)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${strength.pct}%`, background:strength.color, borderRadius:2, transition:'width 0.3s' }}/>
                  </div>
                  <div style={{ fontSize:11, color:strength.color, fontWeight:600, marginTop:3 }}>{strength.label} password</div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showPw.confirm?'text':'password'} placeholder="••••••••"
                  value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm:e.target.value }))}
                  style={{ paddingRight:44, borderColor: passwords.confirm && passwords.confirm!==passwords.newPass ? '#ef4444' : undefined }}/>
                <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm:!s.confirm }))}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                  <EyeIcon open={showPw.confirm}/>
                </button>
              </div>
              {passwords.confirm && passwords.confirm !== passwords.newPass && (
                <div style={{ fontSize:11, color:'#ef4444', marginTop:4, fontWeight:600 }}>Passwords do not match</div>
              )}
            </div>

            {/* Requirements */}
            <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:12 }}>
              <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>Password requirements:</div>
              {[
                { label:'At least 6 characters',       ok: passwords.newPass.length >= 6   },
                { label:'At least 8 characters',       ok: passwords.newPass.length >= 8   },
                { label:'Contains uppercase letter',   ok: /[A-Z]/.test(passwords.newPass) },
                { label:'Contains number',             ok: /[0-9]/.test(passwords.newPass) },
                { label:'Contains special character',  ok: /[^A-Za-z0-9]/.test(passwords.newPass) },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, color: r.ok ? '#16a34a' : 'var(--text-faint)' }}>
                  <span style={{ fontSize:14 }}>{r.ok ? '✅' : '○'}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={handleChangePassword} disabled={savingPw || passwords.newPass !== passwords.confirm || passwords.newPass.length < 6}
              style={{ justifyContent:'center', marginTop:4 }}>
              {savingPw ? '⏳ Updating...' : '🔑 Change Password'}
            </button>
          </div>
        </Section>
      )}

      {/* ── PREFERENCES TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'prefs' && (
        <>
          <Section icon="🌍" title="Regional Settings" subtitle="Currency and timezone for your account">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16, marginBottom:22 }}>
              <div>
                <label className="form-label">Currency</label>
                <select className="form-input" value={prefs.currency} onChange={e => setPrefs(p => ({ ...p, currency:e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Used for budget and spend display</div>
              </div>
              <div>
                <label className="form-label">Timezone</label>
                <select className="form-input" value={prefs.timezone} onChange={e => setPrefs(p => ({ ...p, timezone:e.target.value }))}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Used for scheduling and report times</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile} style={{ minWidth:160, justifyContent:'center' }}>
                {savingProfile ? '⏳ Saving...' : '✓ Save Preferences'}
              </button>
            </div>
          </Section>

          <Section icon="🔔" title="Notifications" subtitle="Control which alerts you receive">
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'notifications', label:'Enable Notifications', desc:'Receive budget alerts, campaign updates and daily reports' },
              ].map(item => (
                <div key={item.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  {/* Toggle switch */}
                  <div onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    style={{ width:44, height:24, borderRadius:12, cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s',
                      background: prefs[item.key] ? 'var(--purple-primary)' : 'var(--bg-page)',
                      border: `1px solid ${prefs[item.key] ? 'var(--purple-primary)' : 'var(--border-subtle)'}` }}>
                    <div style={{ position:'absolute', top:2, left: prefs[item.key] ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile} style={{ minWidth:160, justifyContent:'center' }}>
                {savingProfile ? '⏳ Saving...' : '✓ Save Settings'}
              </button>
            </div>
          </Section>
        </>
      )}

      {/* ── DANGER ZONE TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'danger' && (
        <div className="glass-card" style={{ padding:28, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.03)' }}>
          <div style={{ marginBottom:22, paddingBottom:16, borderBottom:'1px solid rgba(239,68,68,0.2)', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚠️</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#ef4444' }}>Danger Zone</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Irreversible actions — proceed with caution</div>
            </div>
          </div>

          <div style={{ padding:'18px 20px', borderRadius:12, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.05)' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Delete Account</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, marginBottom:18 }}>
              Permanently delete your AdsPulse account and all associated data including campaigns, analytics, and settings.
              <strong style={{ color:'#ef4444' }}> This action cannot be undone.</strong>
            </div>

            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                style={{ padding:'9px 20px', borderRadius:9, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.1)', color:'#ef4444', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'DM Sans,sans-serif' }}>
                🗑️ Delete My Account
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:420 }}>
                <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize:13, color:'#ef4444', fontWeight:600 }}>
                  ⚠️ Are you sure? Enter your password to confirm permanent deletion.
                </div>
                <div style={{ position:'relative' }}>
                  <input className="form-input" type={showDeletePw?'text':'password'} placeholder="Enter your password"
                    value={deletePass} onChange={e => setDeletePass(e.target.value)}
                    style={{ paddingRight:44, borderColor:'rgba(239,68,68,0.4)' }}/>
                  <button type="button" onClick={() => setShowDeletePw(!showDeletePw)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                    <EyeIcon open={showDeletePw}/>
                  </button>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeletePass(''); }} style={{ flex:1, justifyContent:'center' }}>
                    Cancel
                  </button>
                  <button onClick={handleDeleteAccount} disabled={deletingAcct||!deletePass}
                    style={{ flex:1, padding:'10px 20px', borderRadius:10, border:'1px solid rgba(239,68,68,0.5)', background:'rgba(239,68,68,0.15)', color:'#ef4444', cursor:'pointer', fontWeight:700, fontSize:14, fontFamily:'DM Sans,sans-serif', opacity: !deletePass ? 0.5 : 1, justifyContent:'center' }}>
                    {deletingAcct ? '⏳ Deleting...' : '🗑️ Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
