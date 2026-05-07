// import React, { useState, useEffect } from 'react';
// import Layout from '../components/shared/Layout';
// import { useAuth } from '../context/AuthContext';
// import { authAPI } from '../utils/api';
// import api from '../utils/api';

// function timeAgo(date) {
//   const diff = (Date.now() - new Date(date)) / 1000;
//   if (diff < 60)    return 'just now';
//   if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
//   if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
//   return new Date(date).toLocaleDateString();
// }

// const ACTION_ICONS = {
//   'platform.connect':    { icon:'🔗', color:'#16a34a' },
//   'platform.disconnect': { icon:'🔌', color:'#d97706' },
//   'platform.sync':       { icon:'🔄', color:'#3b82f6' },
//   'campaign.create':     { icon:'📣', color:'#7c3aed' },
//   'campaign.update':     { icon:'✏️',  color:'#3b82f6' },
//   'campaign.delete':     { icon:'🗑️', color:'#ef4444' },
//   '2fa.enable':          { icon:'🔐', color:'#16a34a' },
//   '2fa.disable':         { icon:'🔓', color:'#d97706' },
//   'auth.login':          { icon:'🔑', color:'#3b82f6' },
// };

// export default function SecurityPage() {
//   const { user, refreshUser } = useAuth();
//   const [step,     setStep]     = useState('overview');
//   const [method,   setMethod]   = useState('totp');
//   const [qrCode,   setQrCode]   = useState('');
//   const [secret,   setSecret]   = useState('');
//   const [code,     setCode]     = useState('');
//   const [password, setPassword] = useState('');
//   const [loading,  setLoading]  = useState(false);
//   const [error,    setError]    = useState('');
//   const [success,  setSuccess]  = useState('');
//   const [auditLogs, setAuditLogs] = useState([]);
//   const [logsLoading, setLogsLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('2fa');

//   const is2FAEnabled = user?.twoFactorEnabled;

//   useEffect(() => {
//     api.get('/audit?limit=40')
//       .then(res => setAuditLogs(res.data || []))
//       .catch(() => {})
//       .finally(() => setLogsLoading(false));
//   }, []);

//   const handleSetup = async (selectedMethod) => {
//     setMethod(selectedMethod); setLoading(true); setError('');
//     try {
//       const res = await authAPI.setup2FA({ method: selectedMethod });
//       if (selectedMethod === 'totp') { setQrCode(res.data.qrCode); setSecret(res.data.secret); setStep('setup-totp'); }
//       else setStep('setup-email');
//     } catch (err) { setError(err.response?.data?.message || err.message); }
//     finally { setLoading(false); }
//   };

//   const handleEnable = async () => {
//     setLoading(true); setError('');
//     try {
//       await authAPI.enable2FA({ code });
//       await refreshUser();
//       setSuccess('✅ Two-factor authentication enabled!');
//       setStep('overview'); setCode('');
//     } catch (err) { setError(err.response?.data?.message || 'Invalid code.'); }
//     finally { setLoading(false); }
//   };

//   const handleDisable = async () => {
//     setLoading(true); setError('');
//     try {
//       await authAPI.disable2FA({ password });
//       await refreshUser();
//       setSuccess('2FA has been disabled.');
//       setStep('overview'); setPassword('');
//     } catch (err) { setError(err.response?.data?.message || 'Incorrect password.'); }
//     finally { setLoading(false); }
//   };

//   return (
//     <Layout>
//       <div className="page-header">
//         <div>
//           <h1 className="page-title">Security</h1>
//           <p className="page-subtitle">Two-factor authentication and account activity</p>
//         </div>
//       </div>

//       {success && (
//         <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)', color:'#16a34a', fontSize:13, fontWeight:600 }}>
//           {success}
//         </div>
//       )}

//       {/* Tabs */}
//       <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
//         {[{id:'2fa',label:'🔐 Two-Factor Auth'},{id:'activity',label:'📋 Activity Log'},{id:'account',label:'👤 Account'}].map(tab=>(
//           <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
//             padding:'8px 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:600,
//             cursor:'pointer', fontFamily:'DM Sans,sans-serif',
//             background:activeTab===tab.id?'var(--bg-card)':'transparent',
//             color:activeTab===tab.id?'var(--text-primary)':'var(--text-faint)',
//             boxShadow:activeTab===tab.id?'0 2px 8px rgba(0,0,0,0.1)':'none', transition:'all 0.2s'
//           }}>{tab.label}</button>
//         ))}
//       </div>

//       {/* ── 2FA TAB ── */}
//       {activeTab==='2fa' && (
//         <div className="glass-card" style={{ padding:28, maxWidth:600 }}>
//           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
//             <div>
//               <h3 style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>Two-Factor Authentication</h3>
//               <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Add a second layer of security to your account</p>
//             </div>
//             <div style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700,
//               background: is2FAEnabled?'rgba(22,163,74,0.1)':'rgba(239,68,68,0.1)',
//               border:`1px solid ${is2FAEnabled?'rgba(22,163,74,0.3)':'rgba(239,68,68,0.3)'}`,
//               color: is2FAEnabled?'#16a34a':'#ef4444' }}>
//               {is2FAEnabled ? '✓ ENABLED' : '✗ DISABLED'}
//             </div>
//           </div>

//           {step === 'overview' && !is2FAEnabled && (
//             <>
//               <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20, lineHeight:1.7 }}>
//                 Once enabled, every login will require your password <strong>plus</strong> a second verification code. Choose your method:
//               </p>
//               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
//                 {[
//                   { id:'totp',  icon:'📱', title:'Authenticator App', desc:'Google Authenticator, Authy, Microsoft Authenticator. Rotating code every 30 seconds. Most secure.' },
//                   { id:'email', icon:'📧', title:'Email Code', desc:'6-digit code sent to your email on each login. Requires SMTP configuration.' },
//                 ].map(opt => (
//                   <div key={opt.id} onClick={()=>!loading&&handleSetup(opt.id)}
//                     style={{ padding:18, borderRadius:12, border:'1px solid var(--border-subtle)', cursor:'pointer', background:'var(--bg-elevated)', transition:'all 0.2s' }}
//                     onMouseEnter={e=>e.currentTarget.style.borderColor='var(--purple-primary)'}
//                     onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-subtle)'}>
//                     <div style={{ fontSize:28, marginBottom:8 }}>{opt.icon}</div>
//                     <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{opt.title}</div>
//                     <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{opt.desc}</div>
//                   </div>
//                 ))}
//               </div>
//               {loading && <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Setting up...</div>}
//               {error  && <div style={{ color:'#ef4444', fontSize:13, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)' }}>⚠️ {error}</div>}
//             </>
//           )}

//           {step === 'overview' && is2FAEnabled && (
//             <>
//               <div style={{ padding:'14px 18px', borderRadius:10, background:'rgba(22,163,74,0.07)', border:'1px solid rgba(22,163,74,0.2)', marginBottom:20, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
//                 ✅ Your account is protected with {user?.twoFactorMethod==='email'?'email code':'authenticator app'} verification. Every login requires your password <strong>plus</strong> the second factor.
//               </div>
//               <button className="btn-secondary" onClick={()=>setStep('disable')} style={{ fontSize:13 }}>🔓 Disable 2FA</button>
//             </>
//           )}

//           {step === 'setup-totp' && (
//             <div>
//               <h4 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 10px' }}>Step 1: Scan QR Code</h4>
//               <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
//                 Open Google Authenticator, Authy, or Microsoft Authenticator and scan this code:
//               </p>
//               {qrCode && <div style={{ textAlign:'center', marginBottom:14 }}><img src={qrCode} alt="QR Code" style={{ width:180, height:180, borderRadius:12, padding:8, background:'white' }}/></div>}
//               <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg-elevated)', fontSize:12, color:'var(--text-muted)', marginBottom:18, wordBreak:'break-all' }}>
//                 Manual key: <strong style={{ color:'var(--text-primary)', fontFamily:'DM Mono,monospace', letterSpacing:2 }}>{secret}</strong>
//               </div>
//               <h4 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 10px' }}>Step 2: Enter the code from the app</h4>
//               <input className="form-input" placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} style={{ letterSpacing:10, fontSize:22, fontFamily:'DM Mono,monospace', textAlign:'center', marginBottom:14 }} maxLength={6}/>
//               {error && <div style={{ color:'#ef4444', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}
//               <div style={{ display:'flex', gap:10 }}>
//                 <button className="btn-secondary" onClick={()=>{setStep('overview');setCode('');}} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
//                 <button className="btn-primary" onClick={handleEnable} disabled={loading||code.length!==6} style={{ flex:2, justifyContent:'center' }}>
//                   {loading?'Verifying...':'✓ Enable 2FA'}
//                 </button>
//               </div>
//             </div>
//           )}

//           {step === 'setup-email' && (
//             <div>
//               <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
//                 📧 A verification code was sent to <strong style={{ color:'var(--text-primary)' }}>{user?.email}</strong>.
//                 Also check your server console — the code is logged there during development.
//               </p>
//               <input className="form-input" placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} style={{ letterSpacing:10, fontSize:22, fontFamily:'DM Mono,monospace', textAlign:'center', marginBottom:14 }} maxLength={6}/>
//               {error && <div style={{ color:'#ef4444', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}
//               <div style={{ display:'flex', gap:10 }}>
//                 <button className="btn-secondary" onClick={()=>{setStep('overview');setCode('');}} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
//                 <button className="btn-primary" onClick={handleEnable} disabled={loading||code.length!==6} style={{ flex:2, justifyContent:'center' }}>
//                   {loading?'Verifying...':'✓ Enable Email 2FA'}
//                 </button>
//               </div>
//             </div>
//           )}

//           {step === 'disable' && (
//             <div>
//               <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
//                 ⚠️ Confirm your password to disable two-factor authentication. Your account will be less secure.
//               </p>
//               <label className="form-label">Current Password</label>
//               <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{ marginBottom:16 }}/>
//               {error && <div style={{ color:'#ef4444', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}
//               <div style={{ display:'flex', gap:10 }}>
//                 <button className="btn-secondary" onClick={()=>setStep('overview')} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
//                 <button onClick={handleDisable} disabled={loading||!password} style={{ flex:2, padding:'10px 20px', borderRadius:10, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.1)', color:'#ef4444', cursor:'pointer', fontWeight:700, fontSize:14, fontFamily:'DM Sans,sans-serif' }}>
//                   {loading?'Disabling...':'🔓 Disable 2FA'}
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── ACTIVITY LOG TAB ── */}
//       {activeTab==='activity' && (
//         <div className="glass-card" style={{ padding:24 }}>
//           <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 20px' }}>Account Activity Log</h3>
//           {logsLoading ? (
//             <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
//               {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:52, borderRadius:8 }}/>)}
//             </div>
//           ) : auditLogs.length === 0 ? (
//             <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-faint)' }}>
//               <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
//               <div>No activity recorded yet. Actions like connecting platforms, creating campaigns, and enabling 2FA will appear here.</div>
//             </div>
//           ) : (
//             <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
//               {auditLogs.map((log, idx) => {
//                 const style = ACTION_ICONS[log.action] || { icon:'⚡', color:'var(--purple-light)' };
//                 return (
//                   <div key={log._id} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'12px 0', borderBottom: idx<auditLogs.length-1?'1px solid var(--border-subtle)':'none' }}>
//                     <div style={{ width:34, height:34, borderRadius:9, background:`${style.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
//                       {style.icon}
//                     </div>
//                     <div style={{ flex:1, minWidth:0 }}>
//                       <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
//                         <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
//                           {log.action.replace(/\./g,' · ')}
//                           {log.resource && <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:8 }}>({log.resource}{log.resourceId?`: ${String(log.resourceId).slice(-8)}`:''})</span>}
//                         </div>
//                         <div style={{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap' }}>{timeAgo(log.createdAt)}</div>
//                       </div>
//                       <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>
//                         IP: {log.ip} · {log.success ? <span style={{ color:'#16a34a' }}>✓ Success</span> : <span style={{ color:'#ef4444' }}>✗ Failed</span>}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── ACCOUNT TAB ── */}
//       {activeTab==='account' && (
//         <div className="glass-card" style={{ padding:24, maxWidth:560 }}>
//           <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 18px' }}>Account Information</h3>
//           <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
//             {[
//               { label:'Full Name',   value:user?.name },
//               { label:'Email',       value:user?.email },
//               { label:'Role',        value:user?.role },
//               { label:'2FA Method',  value:user?.twoFactorEnabled ? user?.twoFactorMethod?.toUpperCase() : 'Disabled' },
//               { label:'Last Login',  value:user?.lastLo