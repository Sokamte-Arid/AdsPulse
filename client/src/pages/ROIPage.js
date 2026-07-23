import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import api, { campaignAPI } from '../utils/api';
import { PlatformIcons } from '../utils/platforms';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  AlertTriangle, Check, Close, DollarSign, Edit,
  Plus, Receipt, Refresh, Target, Trash, TrendingDown, TrendingUp
} from '../components/shared/Icons';

const PLATFORM_COLORS = {
  meta:'#1877F2', google:'#4285F4', tiktok:'#69C9D0', linkedin:'#0A66C2',
  twitter:'#1DA1F2', snapchat:'#FFFC00', youtube:'#FF0000',
  direct:'#16a34a', other:'#7c3aed',
};

const SOURCE_LABELS = {
  sales:'Sales', leads:'Leads', subscriptions:'Subscriptions',
  app_installs:'App Installs', other:'Other',
};

function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        {Icon && <span style={{ color: color || 'var(--purple-light)' }}><Icon size={16}/></span>}
      </div>
      <div style={{ fontSize:26, fontWeight:800, color: color || 'var(--text-primary)', marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, fontSize:12, color: trend >= 0 ? '#16a34a' : '#ef4444', fontWeight:600 }}>
          {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          {trend >= 0 ? '+' : ''}{trend?.toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

const fmt = (n, currency = 'USD') => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style:'currency', currency, minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
};

const fmtPct = n => n === null || n === undefined ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;

export default function ROIPage() {
  useSetPageTitle("ROI & Revenue", "Track revenue and return on ad spend");
  const [summary,   setSummary]   = useState(null);
  const [entries,   setEntries]   = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [period,    setPeriod]    = useState('30d');
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [form, setForm] = useState({
    campaignId:'', platform:'meta', amount:'', currency:'USD',
    source:'sales', description:'', conversions:'',
    periodStart:'', periodEnd:'',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, entriesRes, campRes] = await Promise.all([
        api.get(`/revenue/summary?period=${period}`),
        api.get(`/revenue?period=${period}`),
        campaignAPI.getAll({ limit: 100 }),
      ]);
      setSummary(sumRes.data);
      setEntries(entriesRes.data || []);
      setCampaigns(campRes.data?.campaigns || campRes.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [period]);

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount:      Number(form.amount),
        conversions: Number(form.conversions) || 0,
        campaignId:  form.campaignId || undefined,
        period: form.periodStart ? { start: form.periodStart, end: form.periodEnd } : undefined,
      };
      if (editEntry) {
        await api.put(`/revenue/${editEntry._id}`, payload);
        showToast('Revenue entry updated');
      } else {
        await api.post('/revenue', payload);
        showToast('Revenue entry added');
      }
      setShowForm(false);
      setEditEntry(null);
      setForm({ campaignId:'', platform:'meta', amount:'', currency:'USD', source:'sales', description:'', conversions:'', periodStart:'', periodEnd:'' });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this revenue entry?')) return;
    await api.delete(`/revenue/${id}`);
    showToast('Entry deleted');
    loadData();
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      campaignId:  entry.campaignId || '',
      platform:    entry.platform || 'other',
      amount:      entry.amount || '',
      currency:    entry.currency || 'USD',
      source:      entry.source || 'sales',
      description: entry.description || '',
      conversions: entry.conversions || '',
      periodStart: entry.period?.start?.split('T')[0] || '',
      periodEnd:   entry.period?.end?.split('T')[0]   || '',
    });
    setShowForm(true);
  };

  const roiColor = (roi) => {
    if (roi === null || roi === undefined) return 'var(--text-muted)';
    return Number(roi) >= 0 ? '#16a34a' : '#ef4444';
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 18px', borderRadius:12, background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', color:'var(--text-primary)', fontSize:13, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">ROI & Revenue Tracking</h1>
          <p className="page-subtitle">Track revenue attributed to your campaigns and measure true return on ad spend</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select className="form-input" value={period} onChange={e => setPeriod(e.target.value)} style={{ width:'auto', fontSize:13 }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="btn-primary" onClick={() => { setEditEntry(null); setShowForm(true); }} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <Plus size={14}/> Add Revenue
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          { key:'overview', label:'Overview' },
          { key:'entries',  label:'Revenue Entries' },
          { key:'platforms',label:'By Platform' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding:'8px 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
              background: activeTab===tab.key ? 'var(--bg-card)' : 'transparent',
              color:      activeTab===tab.key ? 'var(--text-primary)' : 'var(--text-faint)',
              boxShadow:  activeTab===tab.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition:'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:12 }}/>)}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div>
              {/* KPI Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:24 }}>
                <StatCard label="Total Revenue"  value={fmt(summary?.totalRevenue)}  sub={`${summary?.entriesCount || 0} entries`}  color="#16a34a" icon={DollarSign}/>
                <StatCard label="Total Ad Spend" value={fmt(summary?.totalAdSpend)}  sub="Across all platforms" icon={Receipt}/>
                <StatCard label="Net Profit"     value={fmt(summary?.profit)}
                  color={summary?.profit >= 0 ? '#16a34a' : '#ef4444'}
                  sub={summary?.profit >= 0 ? 'Profitable' : 'Loss'}
                  icon={summary?.profit >= 0 ? TrendingUp : TrendingDown}/>
                <StatCard label="ROI"
                  value={summary?.roi !== null ? fmtPct(summary?.roi) : '—'}
                  color={roiColor(summary?.roi)}
                  sub="Return on investment"
                  icon={Target}/>
                <StatCard label="ROAS"
                  value={summary?.roas !== null ? `${Number(summary?.roas).toFixed(2)}x` : '—'}
                  sub="Return on ad spend"
                  color="var(--purple-light)"
                  icon={TrendingUp}/>
                <StatCard label="Conversions" value={summary?.totalConversions?.toLocaleString() || '0'} sub="Total tracked" icon={Check}/>
              </div>

              {/* Revenue vs Ad Spend Chart */}
              <div className="glass-card" style={{ padding:24, marginBottom:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Revenue vs Ad Spend Trend</h3>
                  <button onClick={loadData} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
                    <Refresh size={12}/> Refresh
                  </button>
                </div>
                {summary?.trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={summary.trend} margin={{ top:5, right:10, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                      <Tooltip formatter={(v, n) => [`$${Number(v).toFixed(0)}`, n === 'revenue' ? 'Revenue' : 'Ad Spend']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }}/>
                      <Legend wrapperStyle={{ fontSize:12 }}/>
                      <Area type="monotone" dataKey="revenue" name="Revenue"  stroke="#16a34a" strokeWidth={2} fill="url(#revGrad)"/>
                      <Area type="monotone" dataKey="adSpend" name="Ad Spend" stroke="#7c3aed" strokeWidth={2} fill="url(#spendGrad)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:13 }}>
                    No trend data yet — add revenue entries to see the chart
                  </div>
                )}
              </div>

              {/* ROI by Platform bar chart */}
              {summary?.platformBreakdown?.length > 0 && (
                <div className="glass-card" style={{ padding:24 }}>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px' }}>ROI by Platform</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summary.platformBreakdown} margin={{ top:5, right:10, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                      <XAxis dataKey="platform" tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)}/>
                      <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'ROI']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }}/>
                      <Bar dataKey="roi" name="ROI %" radius={[6,6,0,0]} fill="#7c3aed"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── ENTRIES TAB ── */}
          {activeTab === 'entries' && (
            <div>
              {entries.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 0' }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:'rgba(124,58,237,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'var(--purple-light)' }}>
                    <DollarSign size={28}/>
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No revenue entries yet</h3>
                  <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>Add your first revenue entry to start tracking ROI</p>
                  <button className="btn-primary" onClick={() => setShowForm(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13 }}>
                    <Plus size={14}/> Add Revenue Entry
                  </button>
                </div>
              ) : (
                <div className="glass-card" style={{ overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                        {['Date','Campaign','Platform','Source','Revenue','Ad Spend','ROI','ROAS','Actions'].map(h => (
                          <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(e => {
                        const Icon = PlatformIcons[e.platform];
                        return (
                          <tr key={e._id} style={{ borderBottom:'1px solid var(--border-subtle)' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-faint)', whiteSpace:'nowrap' }}>
                              {new Date(e.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-primary)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {e.campaignName || <span style={{ color:'var(--text-faint)' }}>—</span>}
                            </td>
                            <td style={{ padding:'12px 16px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                                {Icon && <Icon size={14}/>}
                                <span style={{ color:'var(--text-muted)', textTransform:'capitalize' }}>{e.platform}</span>
                              </div>
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)', textTransform:'capitalize' }}>
                              {SOURCE_LABELS[e.source] || e.source}
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#16a34a', whiteSpace:'nowrap' }}>
                              {fmt(e.amount, e.currency)}
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                              {e.adSpend > 0 ? fmt(e.adSpend, e.currency) : '—'}
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color: roiColor(e.roi), whiteSpace:'nowrap' }}>
                              {e.roi !== null ? fmtPct(e.roi) : '—'}
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'var(--purple-light)', fontWeight:600, whiteSpace:'nowrap' }}>
                              {e.roas !== null ? `${e.roas}x` : '—'}
                            </td>
                            <td style={{ padding:'12px 16px' }}>
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => openEdit(e)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, borderRadius:6, display:'flex' }}
                                  onMouseEnter={ev => ev.currentTarget.style.color = 'var(--purple-light)'}
                                  onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-muted)'}>
                                  <Edit size={14}/>
                                </button>
                                <button onClick={() => handleDelete(e._id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, borderRadius:6, display:'flex' }}
                                  onMouseEnter={ev => ev.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-muted)'}>
                                  <Trash size={14}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PLATFORMS TAB ── */}
          {activeTab === 'platforms' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {summary?.platformBreakdown?.length > 0 ? summary.platformBreakdown.map(p => {
                const Icon = PlatformIcons[p.platform];
                const color = PLATFORM_COLORS[p.platform] || '#7c3aed';
                return (
                  <div key={p.platform} className="glass-card" style={{ padding:20, border:`1px solid ${color}33` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      {Icon && <Icon size={20}/>}
                      <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{p.platform}</span>
                      <span style={{ marginLeft:'auto', fontSize:13, fontWeight:800, color: roiColor(p.roi) }}>
                        {p.roi !== null ? fmtPct(p.roi) : 'No data'}
                      </span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        { label:'Revenue',     value: fmt(p.revenue) },
                        { label:'Ad Spend',    value: fmt(p.adSpend) },
                        { label:'Profit',      value: fmt(p.profit), color: p.profit >= 0 ? '#16a34a' : '#ef4444' },
                        { label:'ROAS',        value: p.roas !== null ? `${p.roas}x` : '—' },
                        { label:'Conversions', value: p.conversions || 0 },
                      ].map(({ label, value, color: vc }) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                          <span style={{ color:'var(--text-faint)' }}>{label}</span>
                          <span style={{ fontWeight:600, color: vc || 'var(--text-primary)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Mini ROI bar */}
                    <div style={{ marginTop:12, height:4, borderRadius:2, background:'var(--bg-elevated)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(Math.max((Number(p.roi) + 100) / 2, 0), 100)}%`, background: color, borderRadius:2, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'var(--text-faint)', fontSize:13 }}>
                  No platform data yet. Add revenue entries to see breakdown by platform.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Revenue Form Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:520, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
                {editEntry ? 'Edit Revenue Entry' : 'Add Revenue Entry'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditEntry(null); }} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex' }}>
                <Close size={18}/>
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Campaign */}
              <div>
                <label className="form-label">Campaign (optional)</label>
                <select className="form-input" value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))}>
                  <option value="">— No specific campaign —</option>
                  {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {/* Platform + Source */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="form-label">Platform</label>
                  <select className="form-input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    {['meta','google','tiktok','linkedin','twitter','snapchat','youtube','direct','other'].map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Revenue Source</label>
                  <select className="form-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Amount + Currency */}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
                <div>
                  <label className="form-label">Revenue Amount *</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/>
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {['USD','EUR','GBP','XAF','CAD','AUD','NGN'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Conversions */}
              <div>
                <label className="form-label">Number of Conversions (optional)</label>
                <input className="form-input" type="number" min="0" placeholder="0"
                  value={form.conversions} onChange={e => setForm(f => ({ ...f, conversions: e.target.value }))}/>
              </div>

              {/* Period */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="form-label">Period Start (optional)</label>
                  <input className="form-input" type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}/>
                </div>
                <div>
                  <label className="form-label">Period End (optional)</label>
                  <input className="form-input" type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}/>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" rows={2} placeholder="e.g. Revenue from Meta campaign Black Friday promotion"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize:'vertical', lineHeight:1.6 }}/>
              </div>

              {/* Info box */}
              <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.15)', fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--purple-light)' }}>Note:</strong> Ad spend is automatically fetched from your campaign data. ROI and ROAS are calculated instantly when you save.
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
                <button className="btn-secondary" onClick={() => { setShowForm(false); setEditEntry(null); }} style={{ fontSize:13 }}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving || !form.amount} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  {saving ? 'Saving...' : <><Check size={14}/> {editEntry ? 'Update Entry' : 'Save Entry'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}