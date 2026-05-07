import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import { integrationsAPI } from '../utils/api';

const PLATFORM_FIELDS = {
  meta: {
    label: 'Meta (Facebook & Instagram Ads)',
    instructions: [
      { step: 1, text: 'Go to developers.facebook.com → My Apps → Create App (or use existing)' },
      { step: 2, text: 'In your app, go to Tools → Graph API Explorer' },
      { step: 3, text: 'Select your app, then click "Generate Access Token" — grant ads_read, ads_management permissions' },
      { step: 4, text: 'Your Ad Account ID is in Meta Business Manager → Ad Accounts — it starts with act_ (e.g. act_123456789)' },
    ],
    fields: [
      { key:'accessToken', label:'User Access Token', type:'password', placeholder:'EAAxxxxxxxxxx...', required:true },
      { key:'adAccountId', label:'Ad Account ID', placeholder:'act_123456789 or just 123456789', required:true },
    ],
    docs: 'https://developers.facebook.com/docs/marketing-api/get-started',
    tip: 'Required permissions: ads_read, ads_management. The token from Graph API Explorer works for testing. For production use a long-lived token.'
  },
  google: {
    label: 'Google Ads',
    instructions: [
      { step: 1, text: 'Go to Google Ads → Tools & Settings → API Center to get your Developer Token' },
      { step: 2, text: 'Create OAuth2 credentials in Google Cloud Console → APIs & Services → Credentials' },
      { step: 3, text: 'Your Customer ID is the 10-digit number shown in the top-right of Google Ads (e.g. 123-456-7890)' },
      { step: 4, text: 'Use OAuth2 Playground (developers.google.com/oauthplayground) to generate Access + Refresh tokens' },
    ],
    fields: [
      { key:'developerToken', label:'Developer Token', type:'password', placeholder:'xxxxxxxxxxxx', required:true },
      { key:'customerId',     label:'Customer ID',     placeholder:'123-456-7890',                 required:true },
      { key:'accessToken',    label:'Access Token (OAuth2)',  type:'password', placeholder:'ya29.xxxx', required:true },
      { key:'refreshToken',   label:'Refresh Token',   type:'password', placeholder:'1//xxxx' },
    ],
    docs: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
    tip: 'Make sure Google Ads API is enabled in your Google Cloud project and your developer token is approved.'
  },
  tiktok: {
    label: 'TikTok For Business',
    instructions: [
      { step: 1, text: 'Go to TikTok for Business → Apps (business-api.tiktok.com) → Create App' },
      { step: 2, text: 'In your app settings, go to Authorization → generate an Access Token' },
      { step: 3, text: 'Your Advertiser ID is in TikTok Ads Manager — visible in the URL or Account Settings' },
    ],
    fields: [
      { key:'accessToken',  label:'Access Token',   type:'password', placeholder:'xxxxxxxxxxxxxxxx', required:true },
      { key:'advertiserId', label:'Advertiser ID',  placeholder:'7000000000000000000',               required:true },
      { key:'appId',        label:'App ID (optional)', placeholder:'xxxxxxxxxxxxxxxx' },
    ],
    docs: 'https://business-api.tiktok.com/portal/docs',
    tip: 'Required scope: campaign:read, adgroup:read, ad:read, report:read'
  },
  linkedin: {
    label: 'LinkedIn Campaign Manager',
    instructions: [
      { step: 1, text: 'Go to linkedin.com/developers → Create App → request Marketing Developer Platform access' },
      { step: 2, text: 'Under Products, add "Marketing Developer Platform" — note this requires LinkedIn review' },
      { step: 3, text: 'Use OAuth2 to generate an Access Token with r_ads, r_ads_reporting permissions' },
      { step: 4, text: 'Your Ad Account ID is in Campaign Manager URL: linkedin.com/campaignmanager/accounts/{ID}' },
    ],
    fields: [
      { key:'accessToken', label:'Access Token',   type:'password', placeholder:'AQxxxxxx', required:true },
      { key:'adAccountId', label:'Ad Account ID',  placeholder:'123456789',                 required:true },
    ],
    docs: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
    tip: 'Required permissions: r_ads, r_ads_reporting, rw_ads'
  },
  twitter: {
    label: 'X (Twitter) Ads',
    instructions: [
      { step: 1, text: 'Apply at developer.twitter.com → Create Project → Get Elevated Access for Ads API' },
      { step: 2, text: 'In your app settings, generate a Bearer Token from the Keys & Tokens tab' },
      { step: 3, text: 'For Ads API access specifically, you need to apply at ads.twitter.com/api_access' },
    ],
    fields: [
      { key:'bearerToken', label:'Bearer Token', type:'password', placeholder:'AAAAAAAAAAAAAAAAAAAAAxx...', required:true },
      { key:'apiKey',      label:'API Key (optional)',    placeholder:'xxxxxxxxxxxxxxxxxxxx' },
      { key:'apiSecret',   label:'API Secret (optional)', type:'password', placeholder:'xxxxxxxxxxxxxxxxxxxx' },
    ],
    docs: 'https://developer.twitter.com/en/docs/twitter-ads-api',
    tip: 'The Ads API requires separate approval from the standard Twitter Developer access.'
  },
  snapchat: {
    label: 'Snapchat Ads',
    instructions: [
      { step: 1, text: 'Apply at snap.com/en-US/advertise → contact Snapchat for Business API access' },
      { step: 2, text: 'Create an app at developers.snap.com → Snap Kit → OAuth2 credentials' },
      { step: 3, text: 'Generate an Access Token via OAuth2 with snapchat-marketing-api scope' },
      { step: 4, text: 'Your Ad Account ID is in Snapchat Ads Manager → Business Details' },
    ],
    fields: [
      { key:'accessToken', label:'Access Token',  type:'password', placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required:true },
      { key:'adAccountId', label:'Ad Account ID', placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',                 required:true },
    ],
    docs: 'https://marketingapi.snapchat.com/docs/',
    tip: 'Snapchat Marketing API access requires approval. Contact your Snapchat account manager.'
  },
  youtube: {
    label: 'YouTube (via Google OAuth)',
    instructions: [
      { step: 1, text: 'Enable "YouTube Data API v3" in Google Cloud Console → APIs & Services → Library' },
      { step: 2, text: 'Use the same OAuth2 credentials as Google Ads, or create new ones for YouTube' },
      { step: 3, text: 'Use OAuth2 Playground to get an Access Token with youtube.readonly scope' },
    ],
    fields: [
      { key:'accessToken',  label:'Access Token (OAuth2)',   type:'password', placeholder:'ya29.xxxx', required:true },
      { key:'refreshToken', label:'Refresh Token (optional)', type:'password', placeholder:'1//xxxx' },
      { key:'clientId',     label:'Client ID (optional)',     placeholder:'xxxx.apps.googleusercontent.com' },
    ],
    docs: 'https://developers.google.com/youtube/v3/getting-started',
    tip: 'Required scope: https://www.googleapis.com/auth/youtube.readonly'
  },
};

export default function ConnectPage() {
  const [connections, setConnections]   = useState({});
  const [connecting, setConnecting]     = useState(null);
  const [credentials, setCredentials]   = useState({});
  const [syncing, setSyncing]           = useState(null);
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState({ msg:'', type:'info' });
  const [checkingPerms, setCheckingPerms] = useState(null);
  const [permResults, setPermResults]     = useState({});
  const [showDocs, setShowDocs]         = useState({});

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 6000);
  };

  useEffect(() => {
    integrationsAPI.getAll()
      .then(res => {
        const map = {};
        (res.data || []).forEach(c => { map[c.platform] = c; });
        setConnections(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async (platformId) => {
    const creds = credentials[platformId] || {};
    const info  = PLATFORM_FIELDS[platformId];

    // Validate required fields
    const missing = (info?.fields || []).filter(f => f.required && !creds[f.key]?.trim());
    if (missing.length > 0) {
      showToast(`❌ Please fill in: ${missing.map(f=>f.label).join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await integrationsAPI.connect(platformId, creds);
      setConnections(c => ({
        ...c,
        [platformId]: {
          platform: platformId, status: 'connected', hasToken: true,
          accountName: res.data.account?.accountName,
          lastSync: null
        }
      }));
      setConnecting(null);
      setCredentials(c => ({ ...c, [platformId]: {} })); // clear fields
      showToast(`✅ ${PLATFORM_FIELDS[platformId]?.label} connected! Click "Sync Data" to import your campaigns.`, 'success');
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || err.message}`, 'error');
    } finally { setSaving(false); }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm(`Disconnect ${PLATFORM_FIELDS[platformId]?.label}? Your imported campaigns will remain but syncing will stop.`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      setConnections(c => { const n = {...c}; delete n[platformId]; return n; });
      showToast(`Disconnected ${PLATFORM_FIELDS[platformId]?.label}`, 'info');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
  };

  const handleSync = async (platformId) => {
    setSyncing(platformId);
    try {
      const res = await integrationsAPI.sync(platformId);
      showToast(`✅ ${res.data.message}`, 'success');
      setConnections(c => ({
        ...c,
        [platformId]: { ...c[platformId], lastSync: new Date().toISOString() }
      }));
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || err.message}`, 'error');
    } finally { setSyncing(null); }
  };

  const checkPermissions = async (platformId) => {
    setCheckingPerms(platformId);
    try {
      const res = await integrationsAPI.checkPermissions(platformId);
      setPermResults(r => ({ ...r, [platformId]: res.data }));
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    } finally { setCheckingPerms(null); }
  };

  const toggleDocs = (platformId) => setShowDocs(d => ({ ...d, [platformId]: !d[platformId] }));

  const toastStyle = {
    success: { bg:'rgba(22,163,74,0.15)',  border:'rgba(22,163,74,0.35)'  },
    error:   { bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.35)'  },
    info:    { bg:'rgba(37,99,235,0.12)',  border:'rgba(37,99,235,0.3)'   },
  };

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999, maxWidth:440, padding:'14px 18px',
          borderRadius:12, background: toastStyle[toast.type]?.bg || toastStyle.info.bg,
          border:`1px solid ${toastStyle[toast.type]?.border || toastStyle.info.border}`,
          boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)',
          display:'flex', gap:10, alignItems:'flex-start', animation:'slideIn 0.3s ease-out',
          backdropFilter:'blur(8px)', lineHeight:1.5
        }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={()=>setToast({msg:'',type:'info'})} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:18,padding:0,flexShrink:0,lineHeight:1 }}>✕</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Integrations</h1>
          <p className="page-subtitle">Connect your ad accounts — credentials are saved securely per user</p>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:28, display:'flex', gap:14, flexWrap:'wrap' }}>
        <span style={{ fontSize:22, flexShrink:0 }}>🔐</span>
        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, flex:1 }}>
          <strong style={{ color:'var(--text-primary)' }}>How it works:</strong> Enter your API credentials below — they are saved encrypted in MongoDB to your account and persist across sessions.
          Once connected, click <strong>Sync Data</strong> to import your real campaigns and metrics.
          The system auto-syncs every hour in the background.
        </div>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
          {PLATFORMS.map(p => <div key={p.id} className="skeleton" style={{ height:160, borderRadius:16 }}/>)}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {PLATFORMS.map(pl => {
            const Icon    = PlatformIcons[pl.id];
            const info    = PLATFORM_FIELDS[pl.id];
            const conn    = connections[pl.id];
            const isConn  = conn?.status === 'connected';
            const isError = conn?.status === 'error';
            const isOpen  = connecting === pl.id;
            const isSyncing = syncing === pl.id;

            return (
              <div key={pl.id} className="glass-card" style={{
                padding:24,
                border:`1px solid ${isConn ? pl.color+'55' : isError ? 'rgba(239,68,68,0.35)' : 'var(--border-subtle)'}`,
                background: isConn ? `${pl.color}07` : isError ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
                transition:'all 0.2s'
              }}>
                {/* Header row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    {Icon && <Icon size={28}/>}
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{pl.name}</div>
                      {isConn ? (
                        <div style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>
                          ● Connected{conn.accountName ? ` · ${conn.accountName}` : ''}
                        </div>
                      ) : isError ? (
                        <div style={{ fontSize:12, color:'#ef4444', fontWeight:600 }}>● Error — {conn?.errorMessage?.slice(0,60)}</div>
                      ) : (
                        <div style={{ fontSize:12, color:'var(--text-faint)' }}>Not connected</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    {isConn && conn.lastSync && (
                      <div style={{ fontSize:11, color:'var(--text-faint)', textAlign:'right' }}>
                        Synced {new Date(conn.lastSync).toLocaleString()}
                      </div>
                    )}
                    {isConn ? (
                      <>
                        <button className="btn-primary" onClick={()=>handleSync(pl.id)} disabled={isSyncing} style={{ fontSize:12, padding:'7px 14px' }}>
                        </button>
                        <button className="btn-secondary" onClick={()=>checkPermissions(pl.id)} disabled={checkingPerms===pl.id} style={{ fontSize:12, padding:'7px 12px' }}>
                          {checkingPerms===pl.id ? '🔍...' : '🔍 Check Perms'}
                        
                          {isSyncing ? '⏳ Syncing...': '🔄 Sync Data'}
                        </button>
                        <button className="btn-secondary" onClick={()=>setConnecting(isOpen?null:pl.id)} style={{ fontSize:12, padding:'7px 12px' }}>
                          ⚙️ Update
                        </button>
                        <button onClick={()=>handleDisconnect(pl.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-primary" onClick={()=>setConnecting(isOpen?null:pl.id)} style={{ fontSize:12, padding:'8px 16px' }}>
                          {isOpen ? '✕ Cancel' : '🔗 Connect'}
                        </button>
                        {info?.docs && (
                          <a href={info.docs} target="_blank" rel="noopener noreferrer"
                            style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', color:'var(--text-muted)', fontSize:12, display:'flex', alignItems:'center', textDecoration:'none', gap:4 }}
                            title="API Documentation">
                            📖 Docs
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Permission check results */}
                {permResults[pl.id] && (
                  <div style={{ marginTop:14, padding:"14px 16px", borderRadius:10, background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", marginBottom:10 }}>🔍 Permission Check Results</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {[{label:"Token Valid", ok:permResults[pl.id].tokenValid, value:permResults[pl.id].userName},{label:"ads_read", ok:permResults[pl.id].permissions?.includes("ads_read")},{label:"ads_management", ok:permResults[pl.id].permissions?.includes("ads_management")},{label:"Can Read Campaigns", ok:permResults[pl.id].canReadCampaigns, err:permResults[pl.id].campaignError}].map(item=>(
                        <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, fontSize:12 }}>
                          <span style={{ fontSize:14 }}>{item.ok ? "✅" : "❌"}</span>
                          <span style={{ fontWeight:600, color:"var(--text-primary)", minWidth:140 }}>{item.label}</span>
                          {item.value && <span style={{ color:"var(--text-muted)" }}>{item.value}</span>}
                          {!item.ok && item.err && <span style={{ color:"#ef4444", fontSize:11 }}>{item.err.slice(0,80)}</span>}
                        </div>
                      ))}
                    </div>
                    {permResults[pl.id].missingPermissions?.length > 0 && (
                      <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", fontSize:12, color:"#ef4444" }}>
                        ⚠️ Missing permissions: <strong>{permResults[pl.id].missingPermissions.join(", ")}</strong>. Go to Graph API Explorer → add these permissions → regenerate token → reconnect.
                      </div>
                    )}
                    {permResults[pl.id].canReadCampaigns && (
                      <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.25)", fontSize:12, color:"#16a34a" }}>
                        ✅ Everything looks good! Click "Sync Data" to import your campaigns.
                      </div>
                    )}
                    <button onClick={()=>setPermResults(r=>({...r,[pl.id]:null}))} style={{ marginTop:8, background:"none", border:"none", color:"var(--text-faint)", fontSize:11, cursor:"pointer" }}>Dismiss</button>
                  </div>
                )}

                {/* Expandable connect/update form */}
                {isOpen && (
                  <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid var(--border-subtle)', animation:'fadeIn 0.2s ease-out' }}>

                    {/* Step-by-step instructions */}
                    <div style={{ marginBottom:18 }}>
                      <button onClick={()=>toggleDocs(pl.id)} style={{ background:'none', border:'none', color:'var(--purple-light)', fontSize:13, fontWeight:600, cursor:'pointer', padding:0, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        {showDocs[pl.id] ? '▼' : '▶'} How to get your credentials
                      </button>
                      {showDocs[pl.id] && (
                        <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'14px 16px' }}>
                          {(info?.instructions||[]).map(s => (
                            <div key={s.step} style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'var(--purple-light)', flexShrink:0 }}>
                                {s.step}
                              </div>
                              <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{s.text}</div>
                            </div>
                          ))}
                          {info?.tip && (
                            <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, color:'#d97706' }}>
                              💡 {info.tip}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Credential fields */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                      {(info?.fields||[]).map(field => (
                        <div key={field.key}>
                          <label className="form-label">
                            {field.label}
                            {field.required && <span style={{ color:'#ef4444', marginLeft:4 }}>*</span>}
                          </label>
                          <input
                            className="form-input"
                            type={field.type || 'text'}
                            placeholder={field.placeholder}
                            value={credentials[pl.id]?.[field.key] || ''}
                            onChange={e => setCredentials(c => ({
                              ...c,
                              [pl.id]: { ...c[pl.id], [field.key]: e.target.value }
                            }))}
                            style={{ fontSize:13 }}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display:'flex', gap:10, marginTop:16 }}>
                      <button className="btn-secondary" onClick={()=>setConnecting(null)} style={{ fontSize:13 }}>
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={()=>handleConnect(pl.id)} disabled={saving} style={{ fontSize:13 }}>
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
