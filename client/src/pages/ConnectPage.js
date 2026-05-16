import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import { integrationsAPI } from '../utils/api';
import api from '../utils/api';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Platform configurations
const PLATFORM_CONFIG = {
  meta: {
    oauthLabel: 'Connect with Facebook',
    oauthColor: '#1877F2',
    oauthIcon: '🔵',
    tokenExpiry: '60 days',
    fields: [
      { key:'accessToken', label:'Access Token', type:'password', placeholder:'EAAxxxxxxxxxx...', required:true },
      { key:'adAccountId', label:'Ad Account ID', placeholder:'act_123456789', required:true },
    ],
    tip: 'Use OAuth for easiest setup. Manual token requires a System User token for best results.',
    redirectUri: `${SERVER_URL}/api/oauth/meta/callback`,
    setupUrl: 'https://developers.facebook.com/apps/'
  },
  google: {
    oauthLabel: 'Connect with Google',
    oauthColor: '#4285F4',
    oauthIcon: '🔴',
    tokenExpiry: 'Auto-refresh',
    fields: [
      { key:'developerToken', label:'Developer Token', type:'password', placeholder:'xxxxxxxxxxxx', required:true },
      { key:'customerId',     label:'Customer ID',     placeholder:'123-456-7890',                 required:true },
      { key:'accessToken',    label:'Access Token',    type:'password', placeholder:'ya29.xxxx',   required:true },
      { key:'refreshToken',   label:'Refresh Token',   type:'password', placeholder:'1//xxxx' },
    ],
    tip: 'OAuth gets the access/refresh tokens automatically. You still need a Developer Token from Google Ads API Center.',
    redirectUri: `${SERVER_URL}/api/oauth/google/callback`,
    setupUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  tiktok: {
    oauthLabel: 'Connect with TikTok',
    oauthColor: '#000000',
    oauthIcon: '🎵',
    tokenExpiry: '90 days',
    fields: [
      { key:'accessToken',  label:'Access Token',   type:'password', placeholder:'xxxxxxxxxxxxxxxx', required:true },
      { key:'advertiserId', label:'Advertiser ID',  placeholder:'7000000000000000000',               required:true },
    ],
    tip: 'OAuth is the easiest way. Requires a TikTok For Business app with Marketing API access.',
    redirectUri: `${SERVER_URL}/api/oauth/tiktok/callback`,
    setupUrl: 'https://business-api.tiktok.com/portal/apps'
  },
  linkedin: {
    oauthLabel: 'Connect with LinkedIn',
    oauthColor: '#0A66C2',
    oauthIcon: '🔷',
    tokenExpiry: '60 days',
    fields: [
      { key:'accessToken', label:'Access Token',  type:'password', placeholder:'AQxxxxxx', required:true },
      { key:'adAccountId', label:'Ad Account ID', placeholder:'123456789',                  required:true },
    ],
    tip: 'Requires Marketing Developer Platform access. Apply at linkedin.com/developers.',
    redirectUri: `${SERVER_URL}/api/oauth/linkedin/callback`,
    setupUrl: 'https://www.linkedin.com/developers/apps/'
  },
  twitter: {
    oauthLabel: 'Connect with X (Twitter)',
    oauthColor: '#000000',
    oauthIcon: '🐦',
    tokenExpiry: '2 hours (auto-refresh)',
    fields: [
      { key:'bearerToken', label:'Bearer Token',  type:'password', placeholder:'AAAAAAAAAAAAAAAAAAAAAxx...', required:true },
      { key:'apiKey',      label:'API Key',        placeholder:'xxxxxxxxxxxxxxxxxxxx' },
      { key:'apiSecret',   label:'API Secret',     type:'password', placeholder:'xxxxxxxxxxxxxxxxxxxx' },
    ],
    tip: 'OAuth uses PKCE flow. Requires Elevated access + Ads API approval from Twitter.',
    redirectUri: `${SERVER_URL}/api/oauth/twitter/callback`,
    setupUrl: 'https://developer.twitter.com/en/portal/dashboard'
  },
  snapchat: {
    oauthLabel: 'Connect with Snapchat',
    oauthColor: '#FFFC00',
    oauthTextColor: '#000000',
    oauthIcon: '👻',
    tokenExpiry: '30 min (auto-refresh)',
    fields: [
      { key:'accessToken', label:'Access Token',  type:'password', placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required:true },
      { key:'adAccountId', label:'Ad Account ID', placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',                 required:true },
    ],
    tip: 'Requires Snapchat Marketing API access. Contact your Snapchat account manager.',
    redirectUri: `${SERVER_URL}/api/oauth/snapchat/callback`,
    setupUrl: 'https://developers.snap.com/'
  },
  youtube: {
    oauthLabel: 'Connect with YouTube',
    oauthColor: '#FF0000',
    oauthIcon: '▶️',
    tokenExpiry: 'Auto-refresh',
    fields: [
      { key:'accessToken',  label:'Access Token',  type:'password', placeholder:'ya29.xxxx', required:true },
      { key:'refreshToken', label:'Refresh Token', type:'password', placeholder:'1//xxxx' },
      { key:'clientId',     label:'Client ID',     placeholder:'xxxx.apps.googleusercontent.com' },
    ],
    tip: 'Uses same Google OAuth app as Google Ads. Enable YouTube Data API v3 in Google Cloud Console.',
    redirectUri: `${SERVER_URL}/api/oauth/google/callback`,
    setupUrl: 'https://console.cloud.google.com/apis/credentials'
  }
};

export default function ConnectPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections,   setConnections]  = useState({});
  const [connecting,    setConnecting]   = useState(null);
  const [credentials,   setCredentials] = useState({});
  const [syncing,       setSyncing]      = useState(null);
  const [checkingPerms, setCheckingPerms] = useState(null);
  const [permResults,   setPermResults]  = useState({});
  const [saving,        setSaving]       = useState(false);
  const [loading,       setLoading]      = useState(true);
  const [oauthStatus,   setOauthStatus]  = useState({});
  const [showDocs,      setShowDocs]     = useState({});
  const [toast,         setToast]        = useState({ msg:'', type:'info' });
  // Meta multi-account picker
  const [metaAccounts,  setMetaAccounts] = useState(null);
  const [metaToken,     setMetaToken]    = useState('');
  const [metaUser,      setMetaUser]     = useState('');
  const [metaExpiry,    setMetaExpiry]   = useState('');
  const [metaUid,       setMetaUid]      = useState('');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 6000);
  };

  const fetchConnections = async () => {
    try {
      const res = await integrationsAPI.getAll();
      const map = {};
      (res.data || []).forEach(c => { map[c.platform] = c; });
      setConnections(map);
    } catch {}
  };

  useEffect(() => {
    // Handle OAuth callback params
    const success  = searchParams.get('success');
    const error    = searchParams.get('error');
    const accounts = searchParams.get('meta_accounts');
    const token    = searchParams.get('meta_token');
    const user     = searchParams.get('meta_user');
    const expiry   = searchParams.get('meta_expiry');
    const uid      = searchParams.get('meta_uid');

    if (success) {
      const account = searchParams.get('account');
      const platformName = PLATFORMS.find(p => p.id === success)?.name || success;
      showToast(`✅ ${platformName} connected successfully${account ? ` — ${account}` : ''}!`, 'success');
      setSearchParams({});
      fetchConnections();
    }
    if (error) {
      const decoded = decodeURIComponent(error);
      const platform = decoded.split('_')[0];
      const msg = decoded.replace(/^[a-z]+_/, '');
      showToast(`❌ ${msg}`, 'error');
      setSearchParams({});
    }
    if (accounts && token) {
      try {
        setMetaAccounts(JSON.parse(decodeURIComponent(accounts)));
        setMetaToken(decodeURIComponent(token));
        setMetaUser(decodeURIComponent(user || ''));
        setMetaExpiry(expiry || '');
        setMetaUid(uid || '');
        setSearchParams({});
      } catch {}
    }

    fetchConnections().finally(() => setLoading(false));
    api.get('/oauth/status').then(res => setOauthStatus(res.data || {})).catch(() => {});
  }, []);

  const handleOAuthConnect = (platformId) => {
    const adAccountId = credentials[platformId]?.adAccountId || '';
    window.location.href = `${SERVER_URL}/api/oauth/${platformId}/authorize${adAccountId ? `?adAccountId=${adAccountId}` : ''}`;
  };

  const handleSelectMetaAccount = async (account) => {
    try {
      setSaving(true);
      await api.post('/integrations/meta/connect', { accessToken: metaToken, adAccountId: account.id });
      setMetaAccounts(null);
      fetchConnections();
      showToast(`✅ Meta connected — ${account.name}`, 'success');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally { setSaving(false); }
  };

  const handleManualConnect = async (platformId) => {
    const creds = credentials[platformId] || {};
    const config = PLATFORM_CONFIG[platformId];
    const missing = (config?.fields || []).filter(f => f.required && !creds[f.key]?.trim());
    if (missing.length > 0) { showToast(`❌ Please fill in: ${missing.map(f => f.label).join(', ')}`, 'error'); return; }
    setSaving(true);
    try {
      const res = await integrationsAPI.connect(platformId, creds);
      setConnections(c => ({ ...c, [platformId]: { platform:platformId, status:'connected', hasToken:true, accountName:res.data.account?.accountName, lastSync:null } }));
      setConnecting(null);
      setCredentials(c => ({ ...c, [platformId]: {} }));
      showToast(`✅ ${PLATFORMS.find(p=>p.id===platformId)?.name} connected!`, 'success');
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || err.message}`, 'error');
    } finally { setSaving(false); }
  };

  const handleDisconnect = async (platformId) => {
    const name = PLATFORMS.find(p => p.id === platformId)?.name;
    if (!window.confirm(`Disconnect ${name}?`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      setConnections(c => { const n = {...c}; delete n[platformId]; return n; });
      showToast(`Disconnected ${name}`);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  };

  const handleSync = async (platformId) => {
    setSyncing(platformId);
    try {
      const res = await integrationsAPI.sync(platformId);
      showToast(`✅ ${res.data.message}`, 'success');
      setConnections(c => ({ ...c, [platformId]: { ...c[platformId], lastSync: new Date().toISOString() } }));
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || err.message}`, 'error');
    } finally { setSyncing(null); }
  };

  const checkPermissions = async (platformId) => {
    setCheckingPerms(platformId);
    try {
      const res = await integrationsAPI.checkPermissions(platformId);
      setPermResults(r => ({ ...r, [platformId]: res.data }));
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
    finally { setCheckingPerms(null); }
  };

  const handleRefreshToken = async (platformId) => {
    try {
      await api.post(`/oauth/refresh/${platformId}`);
      showToast(`✅ ${PLATFORMS.find(p=>p.id===platformId)?.name} token refreshed`, 'success');
      fetchConnections();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const toastStyles = {
    success: { bg:'rgba(22,163,74,0.12)',  border:'rgba(22,163,74,0.3)'  },
    error:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
    info:    { bg:'rgba(37,99,235,0.1)',   border:'rgba(37,99,235,0.25)' },
  };

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:460, padding:'14px 18px', borderRadius:12, background:toastStyles[toast.type]?.bg, border:`1px solid ${toastStyles[toast.type]?.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ flex:1, lineHeight:1.5 }}>{toast.msg}</span>
          <button onClick={()=>setToast({msg:'',type:'info'})} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:18,padding:0 }}>✕</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Integrations</h1>
          <p className="page-subtitle">Connect your ad accounts — credentials are saved securely per user</p>
        </div>
      </div>

      <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:28, fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
        🔐 <strong style={{ color:'var(--text-primary)' }}>One-click OAuth</strong> is available for all platforms — no manual token copying.
        Each user's credentials are saved privately to their own account. Auto-syncs every hour.
      </div>

      {/* Meta account picker */}
      {metaAccounts && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="glass-card" style={{ padding:32, maxWidth:460, width:'100%' }}>
            <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>Select Ad Account</h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>
              Multiple ad accounts found for <strong>{metaUser}</strong>:
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {metaAccounts.map(account => (
                <button key={account.id} onClick={() => handleSelectMetaAccount(account)} disabled={saving}
                  style={{ padding:'14px 18px', borderRadius:12, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', cursor:'pointer', textAlign:'left', fontFamily:'DM Sans,sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--purple-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{account.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-faint)', fontFamily:'DM Mono,monospace' }}>{account.id}</div>
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setMetaAccounts(null)} style={{ width:'100%', justifyContent:'center', marginTop:16 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {PLATFORMS.map(p => <div key={p.id} className="skeleton" style={{ height:100, borderRadius:16 }}/>)}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {PLATFORMS.map(pl => {
            const Icon    = PlatformIcons[pl.id];
            const config  = PLATFORM_CONFIG[pl.id];
            const conn    = connections[pl.id];
            const isConn  = conn?.status === 'connected';
            const isErr   = conn?.status === 'error';
            const isOpen  = connecting === pl.id;
            const isSyncing = syncing === pl.id;
            const oauthReady = oauthStatus[pl.id]?.configured;

            // Check token expiry
            const tokenExpiry = conn?.tokenExpiry ? new Date(conn.tokenExpiry) : null;
            const daysLeft = tokenExpiry ? Math.floor((tokenExpiry - Date.now()) / 86400000) : null;
            const tokenExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
            const tokenExpired = daysLeft !== null && daysLeft < 0;

            return (
              <div key={pl.id} className="glass-card" style={{
                padding:22,
                border:`1px solid ${isConn ? pl.color+'55' : isErr ? 'rgba(239,68,68,0.35)' : 'var(--border-subtle)'}`,
                background: isConn ? `${pl.color}07` : 'var(--bg-card)', transition:'all 0.2s'
              }}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    {Icon && <Icon size={28}/>}
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{pl.name}</div>
                      {isConn ? (
                        <div>
                          <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>
                            ● Connected{conn.accountName ? ` · ${conn.accountName}` : ''}
                          </span>
                          {tokenExpired && <span style={{ fontSize:11, color:'#ef4444', marginLeft:8, fontWeight:600 }}>⚠️ Token expired</span>}
                          {tokenExpiringSoon && <span style={{ fontSize:11, color:'#d97706', marginLeft:8, fontWeight:600 }}>⚠️ Expires in {daysLeft}d</span>}
                          {tokenExpiry && !tokenExpired && !tokenExpiringSoon && <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:8 }}>Token expires {tokenExpiry.toLocaleDateString()}</span>}
                        </div>
                      ) : isErr ? (
                        <div style={{ fontSize:12, color:'#ef4444', fontWeight:600 }}>● Error — {conn?.errorMessage?.slice(0,60)}</div>
                      ) : (
                        <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                          Not connected · {config?.tokenExpiry && <span>Token: {config.tokenExpiry}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    {isConn && conn.lastSync && <div style={{ fontSize:11, color:'var(--text-faint)' }}>Synced {new Date(conn.lastSync).toLocaleString()}</div>}

                    {isConn ? (
                      <>
                        <button className="btn-primary" onClick={() => handleSync(pl.id)} disabled={isSyncing} style={{ fontSize:12, padding:'7px 14px' }}>
                          {isSyncing ? '⏳ Syncing...' : '🔄 Sync'}
                        </button>
                        <button className="btn-secondary" onClick={() => checkPermissions(pl.id)} disabled={checkingPerms===pl.id} style={{ fontSize:12, padding:'7px 10px' }}>
                          {checkingPerms===pl.id ? '🔍...' : '🔍'}
                        </button>
                        {(tokenExpired || tokenExpiringSoon) && conn.refreshToken && (
                          <button className="btn-secondary" onClick={() => handleRefreshToken(pl.id)} style={{ fontSize:12, padding:'7px 12px', color:'#d97706' }}>
                            🔄 Refresh Token
                          </button>
                        )}
                        {(tokenExpired || tokenExpiringSoon) && !conn.refreshToken && oauthReady && (
                          <button onClick={() => handleOAuthConnect(pl.id)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(217,119,6,0.4)', background:'rgba(217,119,6,0.1)', color:'#d97706', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'DM Sans,sans-serif' }}>
                            🔄 Reconnect
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => setConnecting(isOpen ? null : pl.id)} style={{ fontSize:12, padding:'7px 10px' }}>⚙️</button>
                        <button onClick={() => handleDisconnect(pl.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>✕</button>
                      </>
                    ) : (
                      <>
                        {/* OAuth button */}
                        {oauthReady ? (
                          <button onClick={() => handleOAuthConnect(pl.id)} style={{
                            padding:'8px 18px', borderRadius:9, border:'none',
                            background: config.oauthColor, color: config.oauthTextColor || 'white',
                            cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'DM Sans,sans-serif',
                            display:'flex', alignItems:'center', gap:8, boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
                          }}>
                            {config.oauthIcon} {config.oauthLabel}
                          </button>
                        ) : (
                          <div style={{ fontSize:11, color:'var(--text-faint)', padding:'6px 10px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', maxWidth:220 }}>
                            ⚙️ Add credentials to .env for OAuth
                          </div>
                        )}
                        <button className={oauthReady ? 'btn-secondary' : 'btn-primary'} onClick={() => setConnecting(isOpen?null:pl.id)} style={{ fontSize:12, padding:'8px 14px' }}>
                          {isOpen ? '✕ Cancel' : oauthReady ? '🔑 Manual' : '🔗 Connect'}
                        </button>
                        {config?.setupUrl && (
                          <a href={config.setupUrl} target="_blank" rel="noopener noreferrer"
                            style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', color:'var(--text-muted)', fontSize:12, textDecoration:'none' }}
                            title="Platform developer portal">📖</a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Permission check results */}
                {permResults[pl.id] && (
                  <div style={{ marginTop:14, padding:'14px 16px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:10 }}>🔍 Permission Check</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {[
                        { label:'Token Valid',        ok: permResults[pl.id].tokenValid,      value: permResults[pl.id].userName },
                        { label:'ads_read',           ok: permResults[pl.id].permissions?.includes('ads_read') },
                        { label:'ads_management',     ok: permResults[pl.id].permissions?.includes('ads_management') },
                        { label:'Can Read Campaigns', ok: permResults[pl.id].canReadCampaigns, err: permResults[pl.id].campaignError },
                      ].map(item => (
                        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
                          <span>{item.ok ? '✅' : '❌'}</span>
                          <span style={{ fontWeight:600, color:'var(--text-primary)', minWidth:140 }}>{item.label}</span>
                          {item.value && <span style={{ color:'var(--text-muted)' }}>{item.value}</span>}
                          {!item.ok && item.err && <span style={{ color:'#ef4444', fontSize:11 }}>{item.err.slice(0,80)}</span>}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setPermResults(r => ({...r,[pl.id]:null}))} style={{ marginTop:8,background:'none',border:'none',color:'var(--text-faint)',fontSize:11,cursor:'pointer' }}>Dismiss</button>
                  </div>
                )}

                {/* Manual connect form */}
                {isOpen && (
                  <div style={{ marginTop:18, paddingTop:18, borderTop:'1px solid var(--border-subtle)', animation:'fadeIn 0.2s ease-out' }}>
                    {config?.tip && (
                      <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#d97706', marginBottom:14 }}>
                        💡 {config.tip}
                      </div>
                    )}
                    {config?.redirectUri && (
                      <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
                        <strong style={{ color:'var(--text-primary)' }}>Redirect URI</strong> (add to your app settings):
                        <div style={{ fontFamily:'DM Mono,monospace', marginTop:4, color:'var(--purple-light)', userSelect:'all' }}>{config.redirectUri}</div>
                      </div>
                    )}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                      {(config?.fields || []).map(field => (
                        <div key={field.key}>
                          <label className="form-label">
                            {field.label}
                            {field.required && <span style={{ color:'#ef4444', marginLeft:4 }}>*</span>}
                          </label>
                          <input className="form-input" type={field.type||'text'} placeholder={field.placeholder}
                            value={credentials[pl.id]?.[field.key]||''}
                            onChange={e => setCredentials(c => ({...c,[pl.id]:{...c[pl.id],[field.key]:e.target.value}}))}
                            style={{ fontSize:13 }} autoComplete="off" spellCheck={false}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10, marginTop:16 }}>
                      <button className="btn-secondary" onClick={() => setConnecting(null)} style={{ fontSize:13 }}>Cancel</button>
                      <button className="btn-primary" onClick={() => handleManualConnect(pl.id)} disabled={saving} style={{ fontSize:13 }}>
                        {saving ? '⏳ Connecting...' : `✓ Save & Connect ${pl.name}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
