import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import KPICards from '../components/dashboard/KPICards';
import KPIChart from '../components/dashboard/KPIChart';
import PlatformPerformanceChart from '../components/analytics/PlatformPerformanceChart';
import api, { analyticsAPI, campaignAPI, integrationsAPI } from '../utils/api';
import { revenueAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PlatformIcons } from '../utils/platforms';
import { Analytics, Bolt, Camera, Campaigns, Close, Connect, Download, DynIcon, Edit, FileText, Image } from '../components/shared/Icons.js';

const LOGO_SIZE    = 72;
const LOGO_OVERLAP = LOGO_SIZE / 2;

export default function DashboardPage() {
  useSetPageTitle("Dashboard", "Overview of your ad performance");
  const { user }    = useAuth();
  const { t }       = useLanguage();
  const navigate    = useNavigate();
  const coverRef    = useRef();

  const [kpiData,   setKpiData]   = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [brand,     setBrand]     = useState(null);
  const [selectedKPI, setSelectedKPI] = useState('impressions');
  const [loading,   setLoading]   = useState(true);
  const [period,    setPeriod]    = useState('30d');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showOverlay,    setShowOverlay]    = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview()
        .then(async r => {
          const kpis = r.data.kpis || {};
          // Merge revenue summary into KPI data
          try {
            const rev = await api.get('/revenue/summary?period=30d');
            const s   = rev.data;
            kpis.revenue = s.totalRevenue  || 0;
            kpis.profit  = s.profit        || 0;
            kpis.roi     = s.roi           !== null ? s.roi   : 0;
            kpis.roas    = s.roas          !== null ? s.roas  : 0;
          } catch {}
          setKpiData(kpis);
        }).catch(() => {}),
      campaignAPI.getAll({ limit:100 }).then(r => setCampaigns(r.data.campaigns || [])).catch(() => {}),
      integrationsAPI.getAll().then(r => setPlatforms(r.data || [])).catch(() => {}),
      api.get('/profile').then(r => setBrand(r.data.brand || null)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const hasData            = campaigns.length > 0;
  const hasConnected       = platforms.some(p => p.status === 'connected');
  const activeCampaigns    = campaigns.filter(c => c.status === 'active').length;
  const pausedCampaigns    = campaigns.filter(c => c.status === 'paused').length;
  const draftCampaigns     = campaigns.filter(c => c.status === 'draft').length;
  const connectedPlatforms = platforms.filter(p => p.status === 'connected');
  const hasCover           = !!(brand?.coverImage);
  const hasLogo            = !!(brand?.companyLogo);
  const welcomeText        = brand?.welcomeMessage || t('dashboard.welcome_default', { name: user?.name?.split(' ')[0] || '' });

  const handleExportPDF = () => { try { window.print(); } catch { alert('Use browser Print → Save as PDF'); } };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingCover(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try { const res = await api.patch('/profile/brand', { coverImage: reader.result }); setBrand(b => ({ ...b, coverImage: res.data.brand.coverImage })); }
      catch {} finally { setUploadingCover(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = async () => {
    try { await api.delete('/profile/brand/coverImage'); setBrand(b => ({ ...b, coverImage: '' })); } catch {}
  };

  const onboardingSteps = [
    { done: hasConnected, icon:Connect, titleKey:'onboard_connect_title', descKey:'onboard_connect_desc', btnKey:'onboard_connect_btn', action:()=>navigate('/connect'), btnStyle:'primary' },
    { done: hasData,      icon:Campaigns, titleKey:'onboard_campaign_title', descKey:'onboard_campaign_desc', btnKey:'onboard_campaign_btn', action:()=>navigate('/campaigns/new'), btnStyle:'primary' },
    { done: hasData && hasConnected, icon:Download, titleKey:'onboard_import_title', descKey:'onboard_import_desc', btnKey:'onboard_import_btn', action:()=>navigate('/connect'), btnStyle:'secondary' },
  ];
  const pendingSteps   = onboardingSteps.filter(s => !s.done);
  const showOnboarding = pendingSteps.length > 0;

  const periodOptions = [
    { value:'7d',  label:t('common.last_7_days')  },
    { value:'30d', label:t('common.last_30_days') },
    { value:'90d', label:t('common.last_90_days') },
  ];

  return (
    <Layout>
      {/* ── BRAND BANNER ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ position:'relative', width:'100%', aspectRatio:'820/312', borderRadius:14, overflow:'visible',
          background: hasCover ? `url(${brand.coverImage}) center/cover no-repeat` : 'linear-gradient(135deg,#1e0a3c 0%,#3b0764 50%,#7c3aed 100%)' }}>
          <div style={{ position:'absolute', inset:0, borderRadius:14, overflow:'hidden' }}>
            {hasCover && <img src={brand.coverImage} alt="cover" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />}
            {!hasCover && <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1e0a3c 0%,#3b0764 50%,#7c3aed 100%)' }} />}
            {uploadingCover && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:20 }}>
                <div style={{ color:'white', fontSize:13, fontWeight:600 }}>{t('profile.uploading')}</div>
              </div>
            )}
            {/* Controls top-right */}
            <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:8, alignItems:'center', zIndex:6 }}>
              <select className="form-input" value={period} onChange={e => setPeriod(e.target.value)}
                style={{ width:'auto', padding:'6px 10px', fontSize:12, background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.2)', color:'white', backdropFilter:'blur(8px)', borderRadius:8 }}>
                {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={handleExportPDF} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.2)', color:'white', fontSize:12, cursor:'pointer', backdropFilter:'blur(8px)', fontWeight:600, fontFamily:'DM Sans,sans-serif' }}>
                <FileText size={14}/> {t('common.export')}
              </button>
            </div>
            {/* Centre hover overlay */}
            <div onMouseEnter={() => setShowOverlay(true)} onMouseLeave={() => setShowOverlay(false)}
              style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, transition:'background 0.2s', background: showOverlay ? 'rgba(0,0,0,0.28)' : 'transparent' }}>
              {showOverlay && (
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => coverRef.current?.click()} style={{ padding:'8px 18px', borderRadius:10, background:'rgba(255,255,255,0.18)', color:'white', border:'1px solid rgba(255,255,255,0.35)', fontSize:12, cursor:'pointer', fontWeight:700, backdropFilter:'blur(10px)', fontFamily:'DM Sans,sans-serif' }}>
                    {hasCover ? <><Image size={14}/> Change Cover</> : <><Camera size={14}/> Add Cover Photo</>}
                  </button>
                  {hasCover && <button onClick={handleRemoveCover} style={{ padding:'8px 18px', borderRadius:10, background:'rgba(239,68,68,0.55)', color:'white', border:'1px solid rgba(255,100,100,0.35)', fontSize:12, cursor:'pointer', fontWeight:700, backdropFilter:'blur(10px)', fontFamily:'DM Sans,sans-serif' }}><Close size={14}/> {t('common.delete')}</button>}
                  <button onClick={() => navigate('/profile')} style={{ padding:'8px 18px', borderRadius:10, background:'rgba(124,58,237,0.65)', color:'white', border:'1px solid rgba(167,139,250,0.4)', fontSize:12, cursor:'pointer', fontWeight:700, backdropFilter:'blur(10px)', fontFamily:'DM Sans,sans-serif' }}><Edit size={14}/>️ Edit</button>
                </div>
              )}
            </div>
          </div>
          {hasLogo && (
            <div style={{ position:'absolute', bottom:-(LOGO_SIZE/2), left:24, width:LOGO_SIZE, height:LOGO_SIZE, borderRadius:'50%', overflow:'hidden', border:'3px solid var(--bg-page)', boxShadow:'0 4px 16px rgba(0,0,0,0.25)', zIndex:10, background:'white' }}>
              <img src={brand.companyLogo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          )}
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleCoverFileChange} />
        </div>

        {/* Info bar */}
        <div style={{ background:'var(--bg-card)', borderRadius:'0 0 14px 14px', border:'1px solid var(--border-subtle)', borderTop:'none', paddingTop: hasLogo ? LOGO_OVERLAP + 8 : 14, paddingBottom:14, paddingLeft: hasLogo ? LOGO_SIZE + 24 + 12 : 20, paddingRight:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginTop:-2 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:2 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:'2px solid var(--border-subtle)', background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
                {user?.avatar ? <img src={user.avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{welcomeText}</span>
            </div>
            {(brand?.companyName || brand?.tagline) && (
              <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
                {brand.companyName && <span style={{ fontWeight:700, color:'var(--purple-light)' }}>{brand.companyName}</span>}
                {brand.companyName && brand.tagline && <span style={{ opacity:0.4 }}>·</span>}
                {brand.tagline && <span>{brand.tagline}</span>}
              </div>
            )}
            <div style={{ fontSize:11, color:'var(--text-faint)' }}>
              {new Date().toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            {!hasCover && <button className="btn-secondary" onClick={() => navigate('/profile')} style={{ fontSize:11, padding:'6px 12px' }}>{t('dashboard.customize_banner')}</button>}
            <button className="btn-primary" onClick={() => navigate('/campaigns/new')} style={{ fontSize:12, padding:'7px 14px' }}>{t('common.new_campaign')}</button>
          </div>
        </div>
      </div>

      {/* ── ONBOARDING ── */}
      {showOnboarding && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>{t('dashboard.onboarding_title')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14 }}>
            {pendingSteps.map((step, i) => (
              <div key={i} className="glass-card" style={{ padding:22, border:'1px solid rgba(124,58,237,0.2)', background:'rgba(124,58,237,0.04)' }}>
                <div style={{ fontSize:28, marginBottom:10 }}><DynIcon icon={step.icon} size={14}/></div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{t(`dashboard.${step.titleKey}`)}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6, marginBottom:16 }}>{t(`dashboard.${step.descKey}`)}</div>
                <button className={step.btnStyle==='primary'?'btn-primary':'btn-secondary'} onClick={step.action} style={{ width:'100%', justifyContent:'center', fontSize:13 }}>
                  {t(`dashboard.${step.btnKey}`)} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LIVE STATS ── */}
      {hasData && (
        <div style={{ padding:'14px 20px', borderRadius:12, marginBottom:24, background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(168,85,247,0.05))', border:'1px solid rgba(124,58,237,0.2)', display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ fontSize:22 }}><Bolt size={14}/></div>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--purple-light)', marginBottom:2 }}>
              {campaigns.length} {t('campaigns.title').toLowerCase()} · {connectedPlatforms.length} {t('connect.title').toLowerCase()}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
              {connectedPlatforms.slice(0,5).map(p => { const Icon = PlatformIcons[p.platform]; return Icon ? <Icon key={p.platform} size={16}/> : null; })}
            </div>
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {[
              { label:t('common.active'), value:activeCampaigns, color:'#16a34a' },
              { label:t('common.paused'), value:pausedCampaigns, color:'#d97706' },
              { label:t('common.draft'),  value:draftCampaigns,  color:'#6b7280' },
            ].filter(s => s.value > 0).map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text-faint)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      {hasData ? (
        <>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            {t('dashboard.kpi_hint')}
          </div>
          <KPICards data={loading ? {} : kpiData} selectedKPI={selectedKPI} onSelectKPI={setSelectedKPI} />
          <div style={{ marginTop:24, marginBottom:24 }}><KPIChart selectedKPI={selectedKPI} /></div>
          <PlatformPerformanceChart />
        </>
      ) : !loading && (
        <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}><Analytics size={44}/></div>
          <h3 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:'0 0 10px' }}>{t('dashboard.no_data_title')}</h3>
          <p style={{ fontSize:14, color:'var(--text-muted)', maxWidth:440, margin:'0 auto 24px', lineHeight:1.7 }}>{t('dashboard.no_data_desc')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/campaigns/new')}>{t('dashboard.create_campaign')}</button>
            <button className="btn-secondary" onClick={() => navigate('/connect')}>{t('dashboard.connect_platform')}</button>
          </div>
        </div>
      )}
    </Layout>
  );
}