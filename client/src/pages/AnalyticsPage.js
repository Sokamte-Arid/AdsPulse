import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { analyticsAPI } from '../utils/api';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useSetPageTitle } from '../context/PageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import { Analytics, Bolt, Close, DollarSign, ExternalLink, Refresh, Target, TrendingUp, TrendingDown } from '../components/shared/Icons';
import ExportButton from '../components/shared/ExportButton';
import VideoAnalytics from '../components/analytics/VideoAnalytics';

const KPI_KEYS = ['amountSpent','impressions','cpm','totalClicks','ctr','cpc','conversions','totalReach','addToCart'];
const KPI_LABELS = {
  amountSpent:'Amount Spent', impressions:'Impressions', cpm:'CPM',
  totalClicks:'Clicks', ctr:'CTR', cpc:'CPC', conversions:'Conversions',
  totalReach:'Reach', addToCart:'Add to Cart',
};

// ── Inner Navbar ──────────────────────────────────────────────────────────────
function PageNav({ active, onChange }) {
  const tabs = [
    { key:'overview',  label:'Overview'       },
    { key:'video',     label:'🎬 Video'        },
    { key:'insights',  label:'✨ AI Insights'  },
    { key:'roi',       label:'ROI & Revenue'   },
  ];
  return (
    <div style={{ display:'flex', gap:2, marginBottom:28, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          style={{ padding:'8px 20px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background: active===tab.key ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
            color:      active===tab.key ? 'white' : 'var(--text-faint)',
            transition: 'all 0.2s' }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── AI Insights Modal ─────────────────────────────────────────────────────────
function AIInsightsModal({ onClose }) {
  const [perfData,      setPerfData]      = useState(null);
  const [budgetData,    setBudgetData]    = useState(null);
  const [perfLoading,   setPerfLoading]   = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [perfError,     setPerfError]     = useState('');
  const [budgetError,   setBudgetError]   = useState('');
  const [activeTab,     setActiveTab]     = useState('performance');

  const runPerformance = async () => {
    setPerfLoading(true); setPerfError(''); setPerfData(null);
    try { const res = await api.post('/insights/performance'); setPerfData(res.data); }
    catch (err) { setPerfError(err.response?.data?.message || err.message); }
    finally { setPerfLoading(false); }
  };

  const runBudget = async () => {
    setBudgetLoading(true); setBudgetError(''); setBudgetData(null);
    try { const res = await api.post('/insights/budget-optimizer'); setBudgetData(res.data); }
    catch (err) { setBudgetError(err.response?.data?.message || err.message); }
    finally { setBudgetLoading(false); }
  };

  const TYPE_STYLES = {
    critical: { bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)',  color:'#ef4444' },
    warning:  { bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)', color:'#f59e0b' },
    success:  { bg:'rgba(22,163,74,0.1)',  border:'rgba(22,163,74,0.3)',  color:'#16a34a' },
    tip:      { bg:'rgba(124,58,237,0.1)', border:'rgba(124,58,237,0.3)',color:'#7c3aed' },
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
      <div className="glass-card" style={{ width:'100%', maxWidth:720, maxHeight:'90vh', display:'flex', flexDirection:'column', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
            <Bolt size={18}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>AI Insights</div>
            <div style={{ fontSize:12, color:'var(--text-faint)' }}>Powered by Claude AI</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', padding:4 }}>
            <Close size={20}/>
          </button>
        </div>

        <div style={{ display:'flex', gap:4, padding:'12px 24px 0', borderBottom:'1px solid var(--border-subtle)' }}>
          {[{key:'performance',label:'Performance Analysis'},{key:'budget',label:'Budget Optimizer'}].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                background: activeTab===tab.key ? 'var(--bg-card)' : 'transparent',
                color: activeTab===tab.key ? 'var(--text-primary)' : 'var(--text-faint)',
                borderBottom: activeTab===tab.key ? '2px solid var(--purple-primary)' : '2px solid transparent' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {activeTab === 'performance' && (
            <div>
              {!perfData && !perfLoading && (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ color:'var(--text-faint)', marginBottom:12 }}><Analytics size={40}/></div>
                  <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Claude will analyze your campaign KPIs against industry benchmarks</p>
                  <button className="btn-primary" onClick={runPerformance} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <Bolt size={14}/> Run Analysis
                  </button>
                  {perfError && <div style={{ marginTop:12, color:'#ef4444', fontSize:13 }}>{perfError}</div>}
                </div>
              )}
              {perfLoading && (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ width:40, height:40, border:'3px solid rgba(124,58,237,0.2)', borderTop:'3px solid #7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Analyzing your campaigns...</div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
              {perfData && (
                <div>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:16, fontSize:13, color:'var(--text-primary)', lineHeight:1.6 }}>
                    {perfData.summary}
                  </div>
                  {perfData.topPriority && (
                    <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:16, fontSize:13 }}>
                      <strong style={{ color:'#ef4444' }}>Top Priority: </strong>{perfData.topPriority}
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(perfData.insights||[]).map((ins,i) => {
                      const s = TYPE_STYLES[ins.type] || TYPE_STYLES.tip;
                      return (
                        <div key={i} style={{ padding:'12px 16px', borderRadius:10, background:s.bg, border:`1px solid ${s.border}` }}>
                          <div style={{ fontSize:13, fontWeight:700, color:s.color, marginBottom:4 }}>{ins.title}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{ins.detail}</div>
                          <div style={{ fontSize:12, color:'var(--text-primary)' }}><strong>→ </strong>{ins.action}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                    <button className="btn-secondary" onClick={runPerformance} style={{ fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                      <Refresh size={12}/> Re-analyze
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div>
              {!budgetData && !budgetLoading && (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ color:'var(--text-faint)', marginBottom:12 }}><DollarSign size={40}/></div>
                  <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Requires data from at least 2 platforms</p>
                  <button className="btn-primary" onClick={runBudget} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#16a34a,#15803d)' }}>
                    <DollarSign size={14}/> Optimize Budget
                  </button>
                  {budgetError && <div style={{ marginTop:12, color:'#ef4444', fontSize:13 }}>{budgetError}</div>}
                </div>
              )}
              {budgetLoading && (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ width:40, height:40, border:'3px solid rgba(22,163,74,0.2)', borderTop:'3px solid #16a34a', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Optimizing budget...</div>
                </div>
              )}
              {budgetData && (
                <div>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', marginBottom:16, fontSize:13, lineHeight:1.6 }}>
                    {budgetData.summary}
                  </div>
                  {(budgetData.recommendedAllocation||[]).map((item,i) => {
                    const current = (budgetData.currentAllocation||[]).find(c=>c.platform===item.platform);
                    const isIncrease = item.change?.startsWith('+');
                    return (
                      <div key={i} style={{ marginBottom:14 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{item.platform}</span>
                          <span style={{ fontSize:12, fontWeight:700, color: isIncrease?'#16a34a':'#ef4444' }}>
                            {current?.currentPercent}% → {item.recommendedPercent}% ({item.change})
                          </span>
                        </div>
                        <div style={{ height:6, borderRadius:3, background:'var(--bg-elevated)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${item.recommendedPercent}%`, background:'#7c3aed', borderRadius:3 }}/>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>{item.reasoning}</div>
                      </div>
                    );
                  })}
                  {budgetData.projectedImpact && (
                    <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', marginTop:12, fontSize:13 }}>
                      <strong style={{ color:'#16a34a' }}>Projected Impact: </strong>{budgetData.projectedImpact}
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                    <button className="btn-secondary" onClick={runBudget} style={{ fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                      <Refresh size={12}/> Re-optimize
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROI Summary ───────────────────────────────────────────────────────────────
function ROISummary({ navigate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/revenue/summary?period=30d')
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = n => n != null ? `$${Number(n).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}` : '—';
  const fmtPct = n => n != null ? `${Number(n)>=0?'+':''}${Number(n).toFixed(1)}%` : '—';
  const roiColor = n => n == null ? 'var(--text-muted)' : Number(n)>=0 ? '#16a34a' : '#ef4444';

  if (loading) return <div className="skeleton" style={{ height:200, borderRadius:12 }}/>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>ROI & Revenue</h2>
          <p style={{ fontSize:13, color:'var(--text-faint)', margin:0 }}>Last 30 days</p>
        </div>
        <button onClick={() => navigate('/roi')} className="btn-secondary" style={{ fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
          View Full Report <ExternalLink size={12}/>
        </button>
      </div>

      {summary ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
            {[
              { label:'Revenue',   value:fmt(summary.totalRevenue),  color:'#16a34a', icon:DollarSign },
              { label:'Ad Spend',  value:fmt(summary.totalAdSpend),  color:'var(--purple-light)', icon:Target },
              { label:'Profit',    value:fmt(summary.profit),        color:roiColor(summary.profit), icon:summary?.profit>=0?TrendingUp:TrendingDown },
              { label:'ROI',       value:fmtPct(summary.roi),        color:roiColor(summary.roi), icon:TrendingUp },
              { label:'ROAS',      value:summary.roas!=null?`${Number(summary.roas).toFixed(2)}x`:'—', color:'#f59e0b', icon:Analytics },
            ].map(s => (
              <div key={s.label} className="glass-card" style={{ padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{s.label}</span>
                  <s.icon size={14} style={{ color:s.color }}/>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {summary.trend?.length > 0 && (
            <div className="glass-card" style={{ padding:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>Revenue vs Ad Spend (6 months)</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={summary.trend}>
                  <defs>
                    <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <Tooltip formatter={(v,n)=>[`$${Number(v).toFixed(0)}`,n==='revenue'?'Revenue':'Ad Spend']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:11 }}/>
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#rg2)"/>
                  <Area type="monotone" dataKey="adSpend" name="adSpend" stroke="#7c3aed" strokeWidth={2} fill="url(#sg2)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ marginTop:14, textAlign:'center' }}>
            <button onClick={() => navigate('/roi')} style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
              Add revenue entries & view full report <ExternalLink size={13}/>
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-faint)', fontSize:13 }}>
          No revenue data yet.
          <button onClick={() => navigate('/roi')} style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:13, fontWeight:600, marginLeft:6 }}>
            Add revenue entries →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  useSetPageTitle('Analytics', 'Performance metrics across all platforms');
  const navigate = useNavigate();
  const [activeTab,        setActiveTab]        = useState('overview');
  const [showInsights,     setShowInsights]     = useState(false);
  const [period,           setPeriod]           = useState('30d');
  const [selectedKPI,      setSelectedKPI]      = useState('impressions');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [timeseries,       setTimeseries]       = useState([]);
  const [platformData,     setPlatformData]     = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [videoData,        setVideoData]        = useState(null);
  const [videoLoading,     setVideoLoading]     = useState(false);

  useEffect(() => {
    if (activeTab === 'video') {
      setVideoLoading(true);
      analyticsAPI.getVideoAnalytics({ period }).then(r => setVideoData(r.data)).catch(() => {}).finally(() => setVideoLoading(false));
      return;
    }
    if (activeTab !== 'overview') return;
    setLoading(true);
    const params = { period, ...(selectedPlatform !== 'all' ? { platform: selectedPlatform } : {}) };
    Promise.all([
      analyticsAPI.getTimeseries({ ...params, kpi: selectedKPI }).then(r => setTimeseries(r.data || [])).catch(() => {}),
      analyticsAPI.getPlatformPerformance().then(r => setPlatformData(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [period, selectedKPI, selectedPlatform, activeTab]);

  const handleTabChange = (tab) => {
    if (tab === 'insights') { setShowInsights(true); return; }
    setActiveTab(tab);
  };

  const periodOptions = [
    { value:'7d', label:'Last 7 days' },
    { value:'30d', label:'Last 30 days' },
    { value:'90d', label:'Last 90 days' },
  ];

  const formatValue = (v) => {
    if (selectedKPI === 'amountSpent' || selectedKPI === 'cpm' || selectedKPI === 'cpc') return `$${Number(v||0).toFixed(2)}`;
    if (selectedKPI === 'ctr') return `${Number(v||0).toFixed(2)}%`;
    if (Number(v) >= 1000000) return `${(v/1000000).toFixed(1)}M`;
    if (Number(v) >= 1000) return `${(v/1000).toFixed(1)}K`;
    return String(v||0);
  };

  return (
    <Layout>
      {showInsights && <AIInsightsModal onClose={() => setShowInsights(false)}/>}

      <div className="page-header">
        <div/>
        {activeTab === 'overview' && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <ExportButton endpoint="analytics" filename="analytics" label="Export"/>
            <select className="form-input" value={period} onChange={e => setPeriod(e.target.value)} style={{ width:'auto', fontSize:13 }}>
              {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <PageNav active={activeTab} onChange={handleTabChange}/>

      {activeTab === 'overview' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:22, flexWrap:'wrap' }}>
            <button onClick={() => setSelectedPlatform('all')} style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${selectedPlatform==='all'?'var(--purple-primary)':'var(--border-subtle)'}`, background:selectedPlatform==='all'?'rgba(124,58,237,0.12)':'transparent', color:selectedPlatform==='all'?'var(--purple-light)':'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              All Platforms
            </button>
            {PLATFORMS.map(p => {
              const Icon = PlatformIcons[p.id];
              const sel  = selectedPlatform === p.id;
              return (
                <button key={p.id} onClick={() => setSelectedPlatform(p.id)} style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${sel?p.color:'var(--border-subtle)'}`, background:sel?`${p.color}18`:'transparent', color:sel?p.color:'var(--text-muted)', fontSize:12, fontWeight:sel?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:6 }}>
                  {Icon && <Icon size={14}/>} {p.name}
                </button>
              );
            })}
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
            {KPI_KEYS.map(kpi => (
              <button key={kpi} onClick={() => setSelectedKPI(kpi)} style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${selectedKPI===kpi?'var(--purple-primary)':'var(--border-subtle)'}`, background:selectedKPI===kpi?'rgba(124,58,237,0.12)':'transparent', color:selectedKPI===kpi?'var(--purple-light)':'var(--text-muted)', fontSize:12, fontWeight:selectedKPI===kpi?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}>
                {KPI_LABELS[kpi] || kpi}
              </button>
            ))}
          </div>

          <div className="glass-card" style={{ padding:24, marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:18 }}>
              {KPI_LABELS[selectedKPI]} — {periodOptions.find(o=>o.value===period)?.label}
            </div>
            {loading ? (
              <div className="skeleton" style={{ height:280, borderRadius:10 }}/>
            ) : timeseries.length === 0 ? (
              <div style={{ height:280, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:13 }}>No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-faint)' }} />
                  <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} tickFormatter={formatValue} />
                  <Tooltip formatter={v => formatValue(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }} />
                  <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} dot={false} name={KPI_LABELS[selectedKPI]}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {platformData.length > 0 && (
            <div className="glass-card" style={{ padding:24 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:18 }}>Platform Performance</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr>
                      {['Platform','Amount Spent','Impressions','Clicks','CTR','CPC','Conversions'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--border-subtle)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {platformData.map((p,i) => {
                      const Icon = PlatformIcons[p.platform];
                      return (
                        <tr key={p.platform} style={{ background: i%2===0?'var(--bg-elevated)':'transparent' }}>
                          <td style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>{Icon && <Icon size={16}/>}<span style={{ fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>{p.platform}</span></td>
                          <td style={{ padding:'10px 12px', color:'var(--text-primary)' }}>${(p.amountSpent||0).toLocaleString()}</td>
                          <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{(p.impressions||0).toLocaleString()}</td>
                          <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{(p.totalClicks||0).toLocaleString()}</td>
                          <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{(p.ctr||0).toFixed(2)}%</td>
                          <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>${(p.cpc||0).toFixed(2)}</td>
                          <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{(p.conversions||0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'video' && (
        <VideoAnalytics data={videoData} loading={videoLoading} period={period} onPeriodChange={setPeriod}/>
      )}

      {activeTab === 'roi' && <ROISummary navigate={navigate}/>}
    </Layout>
  );
}