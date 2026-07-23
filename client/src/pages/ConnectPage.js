import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import { PlatformIcons, PLATFORMS, MESSAGING_PLATFORMS } from '../utils/platforms';
import api, { integrationsAPI } from '../utils/api';
import { CheckCircle, Close, ExternalLink, FileText, Lock, Refresh, XCircle } from '../components/shared/Icons.js';

const OAUTH_PLATFORMS = ['meta', 'instagram'];

const PLATFORM_FIELDS = {
  google:   { fields:[{key:'developerToken',label:'Developer Token',type:'password',placeholder:'xxxxxxxxxxxx',required:true},{key:'customerId',label:'Customer ID',placeholder:'123-456-7890',required:true},{key:'accessToken',label:'Access Token (OAuth2)',type:'password',placeholder:'ya29.xxxx',required:true},{key:'refreshToken',label:'Refresh Token',type:'password',placeholder:'1//xxxx'}], docs:'https://developers.google.com/google-ads/api' },
  tiktok:   { fields:[{key:'accessToken',label:'Access Token',type:'password',placeholder:'xxxxxxxx',required:true},{key:'advertiserId',label:'Advertiser ID',placeholder:'7000000000000000000',required:true}], docs:'https://business-api.tiktok.com/portal/docs' },
  linkedin: { fields:[{key:'accessToken',label:'Access Token',type:'password',placeholder:'AQxxxxxx',required:true},{key:'adAccountId',label:'Ad Account ID',placeholder:'123456789',required:true}], docs:'https://learn.microsoft.com/en-us/linkedin/marketing/' },
  twitter:  { fields:[{key:'bearerToken',label:'Bearer Token',type:'password',placeholder:'AAAAAAAAAAAAAAAAAAAAAxx...',required:true},{key:'apiKey',label:'API Key (optional)',placeholder:'xxxx'},{key:'apiSecret',label:'API Secret (optional)',type:'password',placeholder:'xxxx'}], docs:'https://developer.twitter.com/en/docs/twitter-ads-api' },
  snapchat: { fields:[{key:'accessToken',label:'Access Token',type:'password',placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',required:true},{key:'adAccountId',label:'Ad Account ID',placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',required:true}], docs:'https://marketingapi.snapchat.com/docs/' },
  youtube:  { fields:[{key:'accessToken',label:'Access Token (OAuth2)',type:'password',placeholder:'ya29.xxxx',required:true},{key:'refreshToken',label:'Refresh Token (optional)',type:'password',placeholder:'1//xxxx'}], docs:'https://developers.google.com/youtube/v3/getting-started' },
  instagram:{ fields:[], docs:'https://developers.facebook.com/docs/instagram-api', note:'Instagram connects automatically via your Meta account. Connect Meta first, then click Connect Instagram.' },
  whatsapp: {
    fields:[
      { key:'phoneNumber',   label:'WhatsApp Business Phone Number', placeholder:'+237600000000', required:true },
      { key:'phoneNumberId', label:'Phone Number ID',                placeholder:'119543985697...', required:true },
      { key:'accessToken',   label:'Access Token',                   type:'password', placeholder:'EAA...', required:true },
      { key:'wabaId',        label:'WhatsApp Business Account ID',   placeholder:'850689294759256' },
      { key:'displayName',   label:'Display Name',                   placeholder:'My Business' },
    ],
    docs:'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    note:'Get your Phone Number ID and Access Token from Meta Developer Dashboard → WhatsApp → API Setup.',
  },
};

export default function ConnectPage() {
  useSetPageTitle("Platform Integrations", "Connect your ad accounts");
  const { loginWithToken, user } = useAuth();
  const location = useLocation();
  const [connections,  setConnections]  = useState({});
  const [connecting,   setConnecting]   = useState(null);
  const [credentials,  setCredentials]  = useState({});
  const [syncing,      setSyncing]      = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [toast,        setToast]        = useState({ msg:'', type:'info' });

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 6000);
  };

  const loadConnections = () => {
    integrationsAPI.getAll()
      .then(res => {
        const map = {};
        (res.data || []).forEach(c => { map[c.platform] = c; });
        setConnections(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConnections(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauth  = params.get('oauth');
    if (!oauth) return;
    if (oauth === 'success') {
      const platform = params.get('platform');
      const account  = params.get('account');
      const token    = params.get('t');
      if (token && !user) {
        localStorage.setItem('token', token);
        loginWithToken(token, null);
        import('../utils/api').then(({ authAPI }) => {
          authAPI.me().then(res => loginWithToken(token, res.data)).catch(() => {});
        });
      }
      showToast(`${platform === 'meta' ? 'Meta' : platform} connected successfully${account ? ` — ${account}` : ''}!`, 'success');
      loadConnections();
    } else if (oauth === 'error') {
      showToast(params.get('message') || 'Connection failed', 'error');
    }
    window.history.replaceState({}, '', '/connect');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleOAuthConnect = async (platformId) => {
    setOauthLoading(platformId);
    try {
      if (platformId === 'instagram') {
        const res = await integrationsAPI.connect('instagram', {});
        setConnections(c => ({ ...c, instagram: { platform:'instagram', status:'connected', accountName: res.data.account?.accountName, lastSync: null } }));
        showToast('Instagram connected successfully!', 'success');
        setOauthLoading(null);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) { showToast('Session expired — please log in again', 'error'); return; }
      const res = await api.get(`/oauth/${platformId}/init`, { params: { token } });
      window.location.href = res.data.url;
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
      setOauthLoading(null);
    }
  };

  const handleManualConnect = async (platformId) => {
    if (platformId === 'whatsapp') {
      const creds = credentials[platformId] || {};
      if (!creds.phoneNumber || !creds.accessToken || !creds.phoneNumberId) {
        showToast('Phone number, Phone Number ID and Access Token are required', 'error');
        return;
      }
      setSaving(true);
      try {
        const res = await api.post('/whatsapp/connect', creds);
        setConnections(c => ({ ...c, whatsapp: { platform:'whatsapp', status:'connected', accountName: res.data.account?.accountName, lastSync: null } }));
        setConnecting(null);
        setCredentials(c => ({ ...c, whatsapp: {} }));
        showToast('WhatsApp Business connected!', 'success');
      } catch (err) {
        showToast(err.response?.data?.message || err.message, 'error');
      } finally { setSaving(false); }
      return;
    }
    const creds   = credentials[platformId] || {};
    const info    = PLATFORM_FIELDS[platformId];
    const missing = (info?.fields || []).filter(f => f.required && !creds[f.key]?.trim());
    if (missing.length > 0) { showToast(`Missing: ${missing.map(f => f.label).join(', ')}`, 'error'); return; }
    setSaving(true);
    try {
      const res = await integrationsAPI.connect(platformId, creds);
      setConnections(c => ({ ...c, [platformId]: { platform: platformId, status: 'connected', hasToken: true, accountName: res.data.account?.accountName, lastSync: null } }));
      setConnecting(null);
      setCredentials(c => ({ ...c, [platformId]: {} }));
      showToast(`${PLATFORMS.find(p => p.id === platformId)?.name || platformId} connected!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleDisconnect = async (platformId) => {
    const pl = [...PLATFORMS, ...MESSAGING_PLATFORMS].find(p => p.id === platformId);
    const pName = pl?.name || platformId;
    if (!window.confirm(`Disconnect ${pName}? Your imported campaigns will remain.`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      setConnections(c => { const n = { ...c }; delete n[platformId]; return n; });
      showToast(`${pName} disconnected`, 'info');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSync = async (platformId) => {
    setSyncing(platformId);
    try {
      const res = await integrationsAPI.sync(platformId);
      showToast(res.data.message, 'success');
      setConnections(c => ({ ...c, [platformId]: { ...c[platformId], lastSync: new Date().toISOString() } }));
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { setSyncing(null); }
  };

  const toastStyle = {
    success: { bg:'rgba(22,163,74,0.15)',  border:'rgba(22,163,74,0.35)' },
    error:   { bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.35)' },
    info:    { bg:'rgba(37,99,235,0.12)',  border:'rgba(37,99,235,0.3)'  },
  };

  // ── Reusable platform card ──────────────────────────────────────────────────
  const renderPlatformCard = (pl, isMessaging = false) => {
    const Icon         = PlatformIcons[pl.id];
    const conn         = connections[pl.id];
    const isConn       = conn?.status === 'connected';
    const isError      = conn?.status === 'error';
    const isOpen       = connecting === pl.id;
    const isSyncing    = syncing === pl.id;
    const isOAuth      = OAUTH_PLATFORMS.includes(pl.id);
    const isOAuthLoading = oauthLoading === pl.id;
    const info         = PLATFORM_FIELDS[pl.id];

    return (
      <div key={pl.id} className="glass-card" style={{ padding:24, border:`1px solid ${isConn ? pl.color+'55' : isError ? 'rgba(239,68,68,0.35)' : 'var(--border-subtle)'}`, background: isConn ? `${pl.color}07` : isError ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)', transition:'all 0.2s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          {/* Left */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {Icon && <Icon size={28}/>}
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{pl.name}</div>
              {isConn ? (
                <div style={{ fontSize:12, color:'#16a34a', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <CheckCircle size={12}/> Connected{conn.accountName ? ` · ${conn.accountName}` : ''}
                </div>
              ) : isError ? (
                <div style={{ fontSize:12, color:'#ef4444', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <XCircle size={12}/> Error{conn.errorMessage ? ` — ${conn.errorMessage}` : ''}
                </div>
              ) : (
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>Not connected</div>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {isConn && conn.lastSync && (
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>
                Synced {new Date(conn.lastSync).toLocaleString()}
              </div>
            )}
            {isConn ? (
              <>
                {!isMessaging && (
                  <button className="btn-primary" onClick={() => handleSync(pl.id)} disabled={isSyncing} style={{ fontSize:12, padding:'7px 14px', display:'flex', alignItems:'center', gap:6 }}>
                    {isSyncing ? <><Refresh size={12}/> Syncing...</> : <><Refresh size={12}/> Sync Data</>}
                  </button>
                )}
                {isOAuth && (
                  <button className="btn-secondary" onClick={() => handleOAuthConnect(pl.id)} disabled={!!isOAuthLoading} style={{ fontSize:12, padding:'7px 12px' }}>
                    Reconnect
                  </button>
                )}
                {!isOAuth && !isMessaging && (
                  <button className="btn-secondary" onClick={() => setConnecting(isOpen ? null : pl.id)} style={{ fontSize:12, padding:'7px 12px' }}>
                    Update
                  </button>
                )}
                <button onClick={() => handleDisconnect(pl.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  Disconnect
                </button>
              </>
            ) : isOAuth ? (
              <button onClick={() => handleOAuthConnect(pl.id)} disabled={!!isOAuthLoading}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:9, border:'none', background: pl.id === 'meta' ? '#1877F2' : 'var(--purple-primary)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity: isOAuthLoading ? 0.7 : 1, transition:'all 0.2s', fontFamily:'DM Sans,sans-serif' }}>
                {Icon && <Icon size={16}/>}
                {isOAuthLoading ? 'Redirecting...' : `Connect with ${pl.name}`}
                {!isOAuthLoading && <ExternalLink size={12}/>}
              </button>
            ) : (
              <>
                <button className="btn-primary" onClick={() => setConnecting(isOpen ? null : pl.id)} style={{ fontSize:12, padding:'8px 16px' }}>
                  {isOpen ? 'Cancel' : `Connect ${pl.name}`}
                </button>
                {info?.docs && (
                  <a href={info.docs} target="_blank" rel="noopener noreferrer" style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', color:'var(--text-muted)', fontSize:12, display:'flex', alignItems:'center', textDecoration:'none', gap:4 }}>
                    <FileText size={14}/> Docs
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Note for platforms like Instagram */}
        {info?.note && !isConn && !isOpen && (
          <div style={{ marginTop:10, fontSize:12, color:'var(--text-faint)', lineHeight:1.5 }}>{info.note}</div>
        )}

        {/* Credentials form */}
        {isOpen && !isOAuth && (info?.fields?.length > 0) && (
          <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid var(--border-subtle)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginBottom:16 }}>
              {info.fields.map(field => (
                <div key={field.key}>
                  <label className="form-label">{field.label}{field.required && <span style={{ color:'#ef4444', marginLeft:4 }}>*</span>}</label>
                  <input className="form-input" type={field.type || 'text'} placeholder={field.placeholder}
                    value={credentials[pl.id]?.[field.key] || ''}
                    onChange={e => setCredentials(c => ({ ...c, [pl.id]: { ...c[pl.id], [field.key]: e.target.value } }))}
                    style={{ fontSize:13 }} autoComplete="off" spellCheck={false}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={() => setConnecting(null)} style={{ fontSize:13 }}>Cancel</button>
              <button className="btn-primary" onClick={() => handleManualConnect(pl.id)} disabled={saving} style={{ fontSize:13 }}>
                {saving ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:440, padding:'14px 18px', borderRadius:12, background:toastStyle[toast.type]?.bg, border:`1px solid ${toastStyle[toast.type]?.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', display:'flex', gap:10, alignItems:'flex-start', backdropFilter:'blur(8px)' }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={() => setToast({ msg:'', type:'info' })} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', padding:0, display:'flex' }}>
            <Close size={16}/>
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Integrations</h1>
          <p className="page-subtitle">Connect your ad accounts — credentials are saved securely</p>
        </div>
      </div>

      <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:28, display:'flex', gap:14, alignItems:'flex-start' }}>
        <Lock size={16} style={{ flexShrink:0, color:'var(--text-muted)', marginTop:1 }}/>
        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--text-primary)' }}>How it works:</strong> For Meta, click <strong>Connect with Meta</strong> — you'll be redirected to Facebook to log in and approve access. No API keys needed. For other platforms, enter your credentials manually.
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[...PLATFORMS, ...MESSAGING_PLATFORMS].map(p => <div key={p.id} className="skeleton" style={{ height:80, borderRadius:16 }}/>)}
        </div>
      ) : (
        <>
          {/* Ad Platforms */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {PLATFORMS.map(pl => renderPlatformCard(pl, false))}
          </div>

          {/* Messaging Platforms */}
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
              Messaging Platforms
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {MESSAGING_PLATFORMS.map(pl => renderPlatformCard(pl, true))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}