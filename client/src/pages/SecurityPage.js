import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api, { authAPI } from '../utils/api';
import { AlertTriangle, Bolt, Campaigns, CheckCircle, Clipboard, Connect, DynIcon, Edit, Key, Link, Lock, Mail, Refresh, Smartphone, Trash, Unlock } from '../components/shared/Icons.js';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

const ACTION_ICONS = {
  'platform.connect':    { icon:Link, color:'#16a34a' },
  'platform.disconnect': { icon:Connect, color:'#d97706' },
  'platform.sync':       { icon:Refresh, color:'#3b82f6' },
  'campaign.create':     { icon:Campaigns, color:'#7c3aed' },
  'campaign.update':     { icon:Edit,  color:'#3b82f6' },
  'campaign.delete':     { icon:Trash, color:'#ef4444' },
  '2fa.enable':          { icon:Lock, color:'#16a34a' },
  '2fa.disable':         { icon:Unlock, color:'#d97706' },
  'auth.login':          { icon:Key, color:'#3b82f6' },
};

export default function SecurityPage() {
  const { user, refreshUser } = useAuth();
  const { t }                 = useLanguage();
  const [step,      setStep]     = useState('overview');
  const [qrCode,    setQrCode]   = useState('');
  const [secret,    setSecret]   = useState('');
  const [code,      setCode]     = useState(['','','','','','']);
  const [password,  setPassword] = useState('');
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');
  const [success,   setSuccess]  = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('2fa');
  const [setupMsg,  setSetupMsg] = useState('');
  const [method,    setMethod]   = useState('');
  const codeRefs = useRef([]);

  const is2FAEnabled = user?.twoFactorEnabled;

  useEffect(() => {
    api.get('/audit?limit=40').then(r => setAuditLogs(r.data||[])).catch(()=>{}).finally(()=>setLogsLoading(false));
  }, []);


  const handleSetup = async (selectedMethod) => {
    setMethod(selectedMethod); setLoading(true); setError(''); setCode(['','','','','','']);
    try {
      const res = await authAPI.setup2FA({ method: selectedMethod });
      if (selectedMethod === 'totp') { setQrCode(res.data.qrCode); setSecret(res.data.secret); setStep('setup-totp'); }
      else { setSetupMsg(res.data.message||'Code sent'); setStep('setup-email'); }
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleEnable = async () => {
    const finalCode = code.join('');
    if (finalCode.length !== 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.enable2FA({ code: finalCode });
      await refreshUser();
      setSuccess(`${t('security.enable_2fa')} — account secured.`);
      setStep('overview'); setCode(['','','','','','']);
    } catch (err) { setError(err.response?.data?.message || 'Invalid code.'); setCode(['','','','','','']); }
    finally { setLoading(false); }
  };

  const handleDisable = async () => {
    setLoading(true); setError('');
    try {
      await authAPI.disable2FA({ password });
      await refreshUser(); setSuccess(t('security.twofa_disabled'||'2FA disabled')); setStep('overview'); setPassword('');
    } catch (err) { setError(err.response?.data?.message || 'Incorrect password.'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id:'2fa',      label:t('security.tab_2fa')      },
    { id:'activity', label:t('security.tab_activity') },
    { id:'account',  label:t('security.tab_account')  },
  ];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('security.title')}</h1>
          <p className="page-subtitle">{t('security.subtitle')}</p>
        </div>
      </div>

      {success && <div style={{ padding:'12px 16px',borderRadius:10,marginBottom:20,background:'rgba(22,163,74,0.1)',border:'1px solid rgba(22,163,74,0.3)',color:'#16a34a',fontSize:13,fontWeight:600 }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,marginBottom:24,background:'var(--bg-elevated)',borderRadius:12,padding:4,width:'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',background:activeTab===tab.id?'var(--bg-card)':'transparent',color:activeTab===tab.id?'var(--text-primary)':'var(--text-faint)',boxShadow:activeTab===tab.id?'0 2px 8px rgba(0,0,0,0.1)':'none',transition:'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2FA TAB */}
      {activeTab==='2fa' && (
        <div className="glass-card" style={{ padding:28,maxWidth:580 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10 }}>
            <div>
              <h3 style={{ fontSize:17,fontWeight:800,color:'var(--text-primary)',margin:'0 0 4px' }}>{t('security.twofa_title')}</h3>
              <p style={{ fontSize:13,color:'var(--text-muted)',margin:0 }}>{t('security.twofa_subtitle')}</p>
            </div>
            <div style={{ padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:700,background:is2FAEnabled?'rgba(22,163,74,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${is2FAEnabled?'rgba(22,163,74,0.3)':'rgba(239,68,68,0.3)'}`,color:is2FAEnabled?'#16a34a':'#ef4444' }}>
              {is2FAEnabled ? t('security.twofa_enabled') : t('security.twofa_disabled')}
            </div>
          </div>

          {step==='overview' && !is2FAEnabled && (
            <>
              <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:20,lineHeight:1.7 }}>{t('security.twofa_enable_desc')}</p>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16 }}>
                {[
                  { id:'totp',  icon:Smartphone, titleKey:'twofa_authenticator_title', badgeKey:'twofa_authenticator_badge', descKey:'twofa_authenticator_desc' },
                  { id:'email', icon:Mail, titleKey:'twofa_email_title',         badgeKey:'twofa_email_badge',         descKey:'twofa_email_desc'         },
                ].map(opt => (
                  <div key={opt.id} onClick={() => !loading && handleSetup(opt.id)} style={{ padding:18,borderRadius:12,border:'1px solid var(--border-subtle)',cursor:'pointer',background:'var(--bg-elevated)',transition:'all 0.2s',position:'relative' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='var(--purple-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
                    <div style={{ position:'absolute',top:10,right:10,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'rgba(124,58,237,0.15)',color:'var(--purple-light)' }}>{t(`security.${opt.badgeKey}`)}</div>
                    <div style={{ fontSize:28,marginBottom:8 }}><DynIcon icon={opt.icon} size={14}/></div>
                    <div style={{ fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:6 }}>{t(`security.${opt.titleKey}`)}</div>
                    <div style={{ fontSize:12,color:'var(--text-muted)',lineHeight:1.5 }}>{t(`security.${opt.descKey}`)}</div>
                  </div>
                ))}
              </div>
              {error && <div style={{ color:'#ef4444',fontSize:13,padding:'8px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)' }}><AlertTriangle size={14}/>️ {error}</div>}
            </>
          )}

          {step==='overview' && is2FAEnabled && (
            <>
              <div style={{ padding:'14px 18px',borderRadius:10,background:'rgba(22,163,74,0.07)',border:'1px solid rgba(22,163,74,0.2)',marginBottom:20,fontSize:13,color:'var(--text-secondary)',lineHeight:1.6 }}>
                <CheckCircle size={14}/> {t('security.twofa_protected_msg', { method: user?.twoFactorMethod==='email' ? 'Email' : 'Authenticator' })}
              </div>
              <button className="btn-secondary" onClick={() => { setStep('disable'); setError(''); }} style={{ fontSize:13 }}>{t('security.twofa_disable_btn')}</button>
            </>
          )}

          {(step==='setup-totp' || step==='setup-email') && (
            <div>
              {step==='setup-totp' && (
                <>
                  <h4 style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)',margin:'0 0 10px' }}>{t('security.scan_qr')}</h4>
                  <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:14,lineHeight:1.6 }}>{t('security.scan_qr_desc')}</p>
                  {qrCode && <div style={{ textAlign:'center',marginBottom:16 }}><img src={qrCode} alt="QR" style={{ width:190,height:190,borderRadius:12,padding:8,background:'white',border:'3px solid var(--purple-primary)' }}/></div>}
                  <div style={{ padding:'10px 14px',borderRadius:10,background:'var(--bg-elevated)',marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:4 }}>{t('security.manual_key')}</div>
                    <div style={{ fontSize:14,fontWeight:800,color:'var(--text-primary)',fontFamily:'DM Mono,monospace',letterSpacing:3,wordBreak:'break-all' }}>{secret}</div>
                  </div>
                </>
              )}
              {step==='setup-email' && (
                <div style={{ padding:'14px 16px',borderRadius:10,background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)',marginBottom:18,fontSize:13,lineHeight:1.6 }}>
                  <Mail size={14}/> {setupMsg}
                </div>
              )}
              <div style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:12 }}>{t('security.enter_code')}</div>
              <div style={{ display:'flex',gap:10,justifyContent:'center',marginBottom:16 }}>
                {code.map((digit,i) => (
                  <input key={i} ref={el=>codeRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => { const v=e.target.value.replace(/\D/,''); const n=[...code]; n[i]=v; setCode(n); if(v&&i<5) codeRefs.current[i+1]?.focus(); }}
                    onKeyDown={e => { if(e.key==='Backspace'&&!digit&&i>0) codeRefs.current[i-1]?.focus(); }}
                    style={{ width:46,height:58,textAlign:'center',fontSize:24,fontWeight:800,borderRadius:10,border:`2px solid ${digit?'var(--purple-primary)':'var(--border-subtle)'}`,background:'var(--bg-input)',color:'var(--text-primary)',outline:'none',transition:'border-color 0.2s',fontFamily:'DM Mono,monospace' }}
                  />
                ))}
              </div>
              {error && <div style={{ color:'#ef4444',fontSize:13,marginBottom:12,padding:'10px 14px',borderRadius:8,background:'rgba(239,68,68,0.1)' }}><AlertTriangle size={14}/>️ {error}</div>}
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn-secondary" onClick={() => { setStep('overview'); setError(''); setCode(['','','','','','']); }} style={{ flex:1,justifyContent:'center' }}>{t('common.back')}</button>
                <button className="btn-primary" onClick={handleEnable} disabled={loading||code.join('').length!==6} style={{ flex:2,justifyContent:'center' }}>{loading ? t('security.enabling') : t('security.enable_2fa')}</button>
              </div>
            </div>
          )}

          {step==='disable' && (
            <div>
              <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',marginBottom:16,fontSize:13 }}><AlertTriangle size={14}/> {t('security.twofa_disable_confirm')}</div>
              <label className="form-label">{t('security.current_password')}</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{ marginBottom:16 }}/>
              {error && <div style={{ color:'#ef4444',fontSize:13,marginBottom:12 }}><AlertTriangle size={14}/>️ {error}</div>}
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn-secondary" onClick={() => setStep('overview')} style={{ flex:1,justifyContent:'center' }}>{t('common.cancel')}</button>
                <button onClick={handleDisable} disabled={loading||!password} style={{ flex:2,padding:'10px 20px',borderRadius:10,border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.1)',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:14,fontFamily:'DM Sans,sans-serif' }}>
                  {loading ? t('common.please_wait') : t('security.twofa_disable_action')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab==='activity' && (
        <div className="glass-card" style={{ padding:24 }}>
          <h3 style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',margin:'0 0 20px' }}>{t('security.activity_title')}</h3>
          {logsLoading ? (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>{[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:52,borderRadius:8 }}/>)}</div>
          ) : auditLogs.length===0 ? (
            <div style={{ textAlign:'center',padding:'36px 20px',color:'var(--text-faint)' }}>
              <div style={{ fontSize:40,marginBottom:10 }}><Clipboard size={32}/></div>
              <div>{t('security.no_activity')}</div>
            </div>
          ) : (
            auditLogs.map((log,idx) => {
              const style = ACTION_ICONS[log.action]||{ icon:Bolt,color:'var(--purple-light)' };
              return (
                <div key={log._id} style={{ display:'flex',gap:12,alignItems:'flex-start',padding:'12px 0',borderBottom:idx<auditLogs.length-1?'1px solid var(--border-subtle)':'none' }}>
                  <div style={{ width:32,height:32,borderRadius:8,background:`${style.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}><DynIcon icon={style.icon} size={14}/></div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap' }}>
                      <div style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)' }}>{log.action.replace(/\./g,' · ')}</div>
                      <div style={{ fontSize:11,color:'var(--text-faint)' }}>{timeAgo(log.createdAt)}</div>
                    </div>
                    <div style={{ fontSize:11,color:'var(--text-faint)',marginTop:2 }}>
                      {log.success ? <span style={{ color:'#16a34a' }}>{t('security.success')}</span> : <span style={{ color:'#ef4444' }}>{t('security.failed')}</span>}
                      {log.ip ? ` · IP: ${log.ip}` : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ACCOUNT TAB */}
      {activeTab==='account' && (
        <div className="glass-card" style={{ padding:24,maxWidth:560 }}>
          <h3 style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',margin:'0 0 18px' }}>{t('security.account_title')}</h3>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            {[
              { label:t('security.full_name'),    value:user?.name },
              { label:t('common.email'),           value:user?.email },
              { label:t('common.role'),            value:user?.role },
              { label:t('security.twofa_method'),  value:user?.twoFactorEnabled ? user?.twoFactorMethod?.toUpperCase() : t('common.disabled') },
              { label:t('security.last_login'),    value:user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A' },
              { label:t('security.member_since'),  value:user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            ].map(item => (
              <div key={item.label} style={{ padding:'12px 14px',borderRadius:10,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:14,fontWeight:600,color:'var(--text-primary)' }}>{item.value||'—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}