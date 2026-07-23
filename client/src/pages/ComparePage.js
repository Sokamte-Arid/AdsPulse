import React, { useState } from 'react';
import Layout from '../components/shared/Layout';
import { analyticsAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AlertTriangle } from '../components/shared/Icons.js';
import CampaignCompare from '../components/campaigns/CampaignCompare.js';

const KPI_KEYS = [
  'amountSpent','impressions','cpm','totalClicks','ctr','cpc',
  'conversions','totalReach','addToCart',
  'videoViews','video3SecViews','videoP25','videoP50','videoP75','videoP100','thruPlays','avgWatchTime'
];

const KPI_LABELS = {
  amountSpent:'Amount Spent', impressions:'Impressions', cpm:'CPM',
  totalClicks:'Clicks', ctr:'CTR', cpc:'CPC', conversions:'Conversions',
  totalReach:'Reach', addToCart:'Add to Cart',
  videoViews:'Video Views', video3SecViews:'3-Sec Views',
  videoP25:'25% Watched', videoP50:'50% Watched', videoP75:'75% Watched',
  videoP100:'Completed Views', thruPlays:'ThruPlays', avgWatchTime:'Avg Watch Time',
};

const TABS = [
  { key:'campaign', label:'🎯 Single Campaign' },
  { key:'global',   label:'🌐 All Campaigns'   },
];

export default function ComparePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('campaign');
  const [start1,  setStart1]  = useState('');
  const [end1,    setEnd1]    = useState('');
  const [start2,  setStart2]  = useState('');
  const [end2,    setEnd2]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleCompare = async () => {
    if (!start1||!end1||!start2||!end2) { setError('Please fill all date fields.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await analyticsAPI.getCompare({ start1, end1, start2, end2 });
      setResult(r.data);
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const fmt = (kpi, val) => {
    if (!val && val !== 0) return '—';
    if (['amountSpent','cpm','cpc'].includes(kpi)) return `$${Number(val).toFixed(2)}`;
    if (kpi==='ctr') return `${Number(val).toFixed(2)}%`;
    if (kpi==='avgWatchTime') return `${Number(val).toFixed(1)}s`;
    return Number(val).toLocaleString();
  };

  const changeColor = (pct, key) => {
    if (!pct && pct !== 0) return 'var(--text-faint)';
    const costMetric = ['amountSpent','cpc','cpm'].includes(key);
    const good = costMetric ? pct < 0 : pct > 0;
    return pct === 0 ? 'var(--text-faint)' : good ? '#16a34a' : '#ef4444';
  };

  const p1Label = start1 && end1 ? `${new Date(start1).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${new Date(end1).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}` : 'Period A';
  const p2Label = start2 && end2 ? `${new Date(start2).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${new Date(end2).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}` : 'Period B';

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compare</h1>
          <p className="page-subtitle">Analyse performance across time periods</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:2, marginBottom:28, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding:'8px 20px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
              background: activeTab===tab.key ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
              color:      activeTab===tab.key ? 'white' : 'var(--text-faint)',
              transition:'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Single campaign tab */}
      {activeTab === 'campaign' && <CampaignCompare />}

      {/* All campaigns tab */}
      {activeTab === 'global' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24, maxWidth:700 }}>
            {[
              { label:'Period A', color:'#7c3aed', start:start1, end:end1, setStart:setStart1, setEnd:setEnd1 },
              { label:'Period B', color:'#3b82f6', start:start2, end:end2, setStart:setStart2, setEnd:setEnd2 },
            ].map((p,i) => (
              <div key={i} className="glass-card" style={{ padding:20, borderTop:`3px solid ${p.color}` }}>
                <div style={{ fontSize:14,fontWeight:700,color:p.color,marginBottom:14 }}>{p.label}</div>
                <div style={{ marginBottom:10 }}>
                  <label className="form-label">Start date</label>
                  <input className="form-input" type="date" value={p.start} onChange={e=>p.setStart(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">End date</label>
                  <input className="form-input" type="date" value={p.end} onChange={e=>p.setEnd(e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding:'10px 14px',borderRadius:8,marginBottom:16,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',fontSize:13 }}>
              <AlertTriangle size={14}/> {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleCompare} disabled={loading} style={{ marginBottom:28 }}>
            {loading ? 'Comparing...' : '⚡ Compare All Campaigns'}
          </button>

          {result && (
            <div className="glass-card" style={{ padding:24, overflowX:'auto' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>
                All Campaigns — {p1Label} vs {p2Label}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'var(--text-faint)',textTransform:'uppercase',borderBottom:'1px solid var(--border-subtle)' }}>Metric</th>
                    <th style={{ textAlign:'right',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#7c3aed',textTransform:'uppercase',borderBottom:'1px solid var(--border-subtle)' }}>{p1Label}</th>
                    <th style={{ textAlign:'right',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#3b82f6',textTransform:'uppercase',borderBottom:'1px solid var(--border-subtle)' }}>{p2Label}</th>
                    <th style={{ textAlign:'right',padding:'10px 14px',fontSize:11,fontWeight:700,color:'var(--text-faint)',textTransform:'uppercase',borderBottom:'1px solid var(--border-subtle)' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {KPI_KEYS.map((kpi,i) => {
                    const pct = result.changes?.[kpi];
                    const hasAny = result.period1?.[kpi] || result.period2?.[kpi];
                    if (!hasAny && ['videoViews','video3SecViews','videoP25','videoP50','videoP75','videoP100','thruPlays','avgWatchTime'].includes(kpi)) return null;
                    return (
                      <tr key={kpi} style={{ background:i%2===0?'var(--bg-elevated)':'transparent' }}>
                        <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text-primary)' }}>{KPI_LABELS[kpi] || kpi}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'var(--text-muted)' }}>{fmt(kpi, result.period1?.[kpi])}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',color:'var(--text-muted)' }}>{fmt(kpi, result.period2?.[kpi])}</td>
                        <td style={{ padding:'10px 14px',textAlign:'right',fontWeight:700,color:changeColor(pct,kpi) }}>
                          {pct != null ? `${pct > 0 ? '↑' : pct < 0 ? '↓' : ''} ${Math.abs(pct)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}