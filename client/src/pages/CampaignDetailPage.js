import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { PlatformIcons, PLATFORMS, CAMPAIGN_OBJECTIVES, KPI_DEFINITIONS, formatKPI } from '../utils/platforms';
import api from '../utils/api';

const MOCK_CAMPAIGN = {
  _id: '1', name: 'Q4 Brand Awareness Drive', objective: 'awareness',
  status: 'active', totalBudget: 12000, currency: 'USD',
  startDate: new Date(Date.now() - 25 * 86400000).toISOString(),
  endDate: new Date(Date.now() + 35 * 86400000).toISOString(),
  tags: ['q4', 'brand'], notes: 'Main Q4 push.',
  platforms: [
    { platform: 'meta', budget: 4000, budgetType: 'lifetime', status: 'active', platformCampaignId: 'meta_123', metrics: { amountSpent: 3200, impressions: 280000, cpm: 11.4, totalClicks: 8400, ctr: 3.0, cpc: 0.38, conversions: 320, totalReach: 190000, addToCart: 980 } },
    { platform: 'google', budget: 3500, budgetType: 'lifetime', status: 'active', metrics: { amountSpent: 2800, impressions: 195000, cpm: 14.4, totalClicks: 10500, ctr: 5.4, cpc: 0.27, conversions: 280, totalReach: 145000, addToCart: 740 } },
    { platform: 'tiktok', budget: 2500, budgetType: 'lifetime', status: 'paused', metrics: { amountSpent: 2100, impressions: 420000, cpm: 5.0, totalClicks: 8400, ctr: 2.0, cpc: 0.25, conversions: 190, totalReach: 310000, addToCart: 580 } },
  ]
};

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [editingName, setEditingName]   = useState(false);
  const [nameValue, setNameValue]       = useState('');
  const [editingBudget, setEditingBudget] = useState(null); // platform id
  const [budgetValue, setBudgetValue]   = useState('');
  const [budgetType, setBudgetType]     = useState('daily');
  const [toggling, setToggling]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  useEffect(() => {
    api.get(`/campaigns/${id}`)
      .then(res => { setCampaign(res.data); setNameValue(res.data.name); })
      .catch(() => { setCampaign(MOCK_CAMPAIGN); setNameValue(MOCK_CAMPAIGN.name); })
      .finally(() => setLoading(false));
  }, [id]);

  // Toggle whole campaign pause/resume
  const handleToggleCampaign = async () => {
    setToggling(true);
    try {
      const res = await api.patch(`/campaigns/${id}/toggle-status`);
      setCampaign(res.data.campaign || res.data);
      showToast(`✅ Campaign ${res.data.campaign?.status === 'active' ? 'resumed' : 'paused'}`);
    } catch (err) {
      // Optimistic update for demo
      setCampaign(c => {
        const newStatus = c.status === 'active' ? 'paused' : 'active';
        return { ...c, status: newStatus, platforms: c.platforms.map(p => ({ ...p, status: newStatus })) };
      });
      showToast(campaign?.status === 'active' ? '⏸️ Campaign paused' : '▶️ Campaign resumed');
    } finally { setToggling(false); }
  };

  // Toggle individual platform
  const handleTogglePlatform = async (platformId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await api.patch(`/campaigns/${id}/platforms/${platformId}/status`, { status: newStatus });
      setCampaign(res.data);
      showToast(`${newStatus === 'active' ? '▶️' : '⏸️'} ${platformId} ${newStatus}`);
    } catch {
      setCampaign(c => ({ ...c, platforms: c.platforms.map(p => p.platform === platformId ? { ...p, status: newStatus } : p) }));
      showToast(`${newStatus === 'active' ? '▶️' : '⏸️'} ${platformId} ${newStatus}`);
    }
  };

  // Save budget
  const handleSaveBudget = async (platformId) => {
    if (!budgetValue || Number(budgetValue) <= 0) { showToast('❌ Budget must be greater than 0'); return; }
    setSaving(true);
    try {
      const res = await api.patch(`/campaigns/${id}/platforms/${platformId}/budget`, { budget: Number(budgetValue), budgetType });
      setCampaign(res.data);
      showToast(`✅ Budget updated to $${Number(budgetValue).toFixed(2)} ${budgetType}`);
    } catch (err) {
      setCampaign(c => ({ ...c, platforms: c.platforms.map(p => p.platform === platformId ? { ...p, budget: Number(budgetValue), budgetType } : p) }));
      showToast(`✅ Budget updated to $${Number(budgetValue).toFixed(2)}`);
    } finally { setSaving(false); setEditingBudget(null); }
  };

  // Save name
  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    try {
      const res = await api.put(`/campaigns/${id}`, { ...campaign, name: nameValue });
      setCampaign(res.data);
      showToast('✅ Campaign name updated');
    } catch {
      setCampaign(c => ({ ...c, name: nameValue }));
      showToast('✅ Campaign name updated');
    }
    setEditingName(false);
  };

  // Push to platforms
  const handlePush = async () => {
    try {
      const res = await api.post(`/campaigns/${id}/push`);
      showToast(`✅ Pushed to platforms: ${res.data.results?.pushed?.join(', ') || 'done'}`);
    } catch (err) { showToast('❌ ' + err.response?.data?.message || err.message); }
  };

  if (loading) return <Layout><div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Loading campaign...</div></Layout>;
  if (!campaign) return <Layout><div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Campaign not found</div></Layout>;

  const obj = CAMPAIGN_OBJECTIVES.find(o => o.id === campaign.objective);
  const totalSpent = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.amountSpent || 0), 0);
  const totalImpressions = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.impressions || 0), 0);
  const totalClicks = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.totalClicks || 0), 0);
  const totalConversions = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.conversions || 0), 0);

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', maxWidth:380 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <button onClick={() => navigate('/campaigns')} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
          ← Back to Campaigns
        </button>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
          <div style={{ flex:1 }}>
            {/* Editable campaign name */}
            {editingName ? (
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                <input
                  className="form-input"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  style={{ fontSize:22, fontWeight:800, maxWidth:500 }}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleSaveName} style={{ fontSize:12, padding:'8px 14px' }}>Save</button>
                <button className="btn-secondary" onClick={() => setEditingName(false)} style={{ fontSize:12, padding:'8px 14px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <h1 style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:800, color:'var(--text-primary)', margin:0 }}>{campaign.name}</h1>
                <button onClick={() => setEditingName(true)} style={{ background:'none', border:'1px solid var(--border-subtle)', borderRadius:8, color:'var(--text-muted)', cursor:'pointer', padding:'4px 10px', fontSize:12 }} title="Edit name">
                  ✏️ Edit
                </button>
                <span className={`status-${campaign.status}`}>{campaign.status}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:13, color:'var(--text-muted)' }}>
              <span>{obj?.icon} {obj?.label}</span>
              {campaign.startDate && <span>📅 {new Date(campaign.startDate).toLocaleDateString()} – {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}</span>}
              <span>💰 {campaign.currency} {(campaign.totalBudget || 0).toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {/* Push to platforms */}
            <button className="btn-secondary" onClick={handlePush} style={{ fontSize:13 }}>
              🚀 Push to Platforms
            </button>
            {/* Edit full campaign */}
            <button className="btn-secondary" onClick={() => navigate(`/campaigns/${id}/edit`)} style={{ fontSize:13 }}>
              ✏️ Edit Campaign
            </button>
            {/* Pause / Resume whole campaign */}
            <button
              className={campaign.status === 'active' ? 'btn-secondary' : 'btn-primary'}
              onClick={handleToggleCampaign}
              disabled={toggling}
              style={{ fontSize:13 }}
            >
              {toggling ? '⏳...' : campaign.status === 'active' ? '⏸️ Pause All' : '▶️ Resume All'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { label:'Amount Spent',  value:formatKPI(totalSpent,'currency'),      sub:`of $${(campaign.totalBudget||0).toLocaleString()} budget`, icon:'💰', color:'#a855f7' },
          { label:'Impressions',   value:formatKPI(totalImpressions,'number'),   sub:`across ${campaign.platforms?.length} platforms`,          icon:'👁️',  color:'#3b82f6' },
          { label:'Total Clicks',  value:formatKPI(totalClicks,'number'),        sub:`CTR ${totalImpressions>0?((totalClicks/totalImpressions)*100).toFixed(2):0}%`, icon:'🖱️', color:'#10b981' },
          { label:'Conversions',   value:formatKPI(totalConversions,'number'),   sub:`CPA $${totalConversions>0?(totalSpent/totalConversions).toFixed(2):'0'}`,       icon:'🎯', color:'#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding:'18px 20px' }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{stat.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:stat.color, marginBottom:4 }}>{stat.value}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{stat.label}</div>
            <div style={{ fontSize:11, color:'var(--text-faint)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Platform table */}
      <div className="glass-card" style={{ padding:24, marginBottom:24 }}>
        <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 20px' }}>
          Platform Breakdown
        </h3>
        <div className="responsive-table">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Platform','Status','Budget','Spent','Impressions','Clicks','CTR','CPC','Conversions','Actions'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'var(--text-faint)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border-subtle)', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(campaign.platforms || []).map(p => {
                const pl = PLATFORMS.find(x => x.id === p.platform);
                const Icon = PlatformIcons[p.platform];
                const m = p.metrics || {};
                const isEditing = editingBudget === p.platform;
                const budgetUsed = p.budget > 0 ? (m.amountSpent / p.budget) * 100 : 0;

                return (
                  <tr key={p.platform} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                    {/* Platform */}
                    <td style={{ padding:'14px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {Icon && <Icon size={20}/>}
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{pl?.name}</div>
                          {p.platformCampaignId && <div style={{ fontSize:10, color:'var(--text-faint)', fontFamily:'DM Mono,monospace' }}>ID: {p.platformCampaignId.slice(0,12)}...</div>}
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding:'14px 12px' }}>
                      <span className={`status-${p.status}`}>{p.status}</span>
                    </td>
                    {/* Budget — editable */}
                    <td style={{ padding:'14px 12px' }}>
                      {isEditing ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:160 }}>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <span style={{ color:'var(--text-muted)', fontSize:13 }}>$</span>
                            <input
                              type="number"
                              value={budgetValue}
                              onChange={e => setBudgetValue(e.target.value)}
                              style={{ width:80, padding:'4px 8px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border-focus)', color:'var(--text-primary)', fontSize:13, outline:'none' }}
                              autoFocus
                              min="1"
                            />
                          </div>
                          <select value={budgetType} onChange={e => setBudgetType(e.target.value)}
                            style={{ padding:'4px 8px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border-subtle)', color:'var(--text-primary)', fontSize:11 }}>
                            <option value="daily">Daily</option>
                            <option value="lifetime">Lifetime</option>
                          </select>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => handleSaveBudget(p.platform)} disabled={saving}
                              style={{ padding:'4px 10px', borderRadius:6, background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', color:'#16a34a', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                              {saving ? '...' : '✓ Save'}
                            </button>
                            <button onClick={() => setEditingBudget(null)}
                              style={{ padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', cursor:'pointer', fontSize:11 }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ cursor:'pointer' }} onClick={() => { setEditingBudget(p.platform); setBudgetValue(p.budget); setBudgetType(p.budgetType || 'daily'); }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                            ${(p.budget || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize:10, color:'var(--text-faint)' }}>
                            {p.budgetType || 'daily'} · {budgetUsed.toFixed(0)}% used
                          </div>
                          <div style={{ height:3, borderRadius:2, background:'var(--bg-elevated)', marginTop:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${Math.min(100, budgetUsed)}%`, borderRadius:2, background: budgetUsed > 90 ? '#ef4444' : budgetUsed > 70 ? '#d97706' : pl?.color || '#7c3aed' }}/>
                          </div>
                          <div style={{ fontSize:10, color:'var(--purple-light)', marginTop:2 }}>✏️ Click to edit</div>
                        </div>
                      )}
                    </td>
                    {/* Metrics */}
                    <td style={{ padding:'14px 12px', fontSize:13, color:'var(--purple-light)', fontWeight:700 }}>{formatKPI(m.amountSpent,'currency')}</td>
                    <td style={{ padding:'14px 12px', fontSize:13, color:'var(--text-primary)' }}>{formatKPI(m.impressions,'number')}</td>
                    <td style={{ padding:'14px 12px', fontSize:13, color:'var(--text-primary)' }}>{formatKPI(m.totalClicks,'number')}</td>
                    <td style={{ padding:'14px 12px', fontSize:13, color: m.ctr > 3 ? '#16a34a' : m.ctr > 1.5 ? '#d97706' : '#ef4444', fontWeight:600 }}>{formatKPI(m.ctr,'percent')}</td>
                    <td style={{ padding:'14px 12px', fontSize:13, color:'var(--text-primary)' }}>{formatKPI(m.cpc,'currency')}</td>
                    <td style={{ padding:'14px 12px', fontSize:13, color:'var(--text-primary)' }}>{formatKPI(m.conversions,'number')}</td>
                    {/* Actions */}
                    <td style={{ padding:'14px 12px' }}>
                      <button
                        onClick={() => handleTogglePlatform(p.platform, p.status)}
                        style={{
                          padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                          background: p.status === 'active' ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)',
                          border: `1px solid ${p.status === 'active' ? 'rgba(217,119,6,0.3)' : 'rgba(22,163,74,0.3)'}`,
                          color: p.status === 'active' ? '#d97706' : '#16a34a'
                        }}
                      >
                        {p.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-platform KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {(campaign.platforms || []).map(p => {
          const pl = PLATFORMS.find(x => x.id === p.platform);
          const Icon = PlatformIcons[p.platform];
          const m = p.metrics || {};
          const budgetPct = p.budget > 0 ? Math.min(100, (m.amountSpent / p.budget) * 100) : 0;

          return (
            <div key={p.platform} className="glass-card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {Icon && <Icon size={24}/>}
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{pl?.name}</span>
                </div>
                <span className={`status-${p.status}`} style={{ fontSize:10 }}>{p.status}</span>
              </div>

              {/* Budget bar */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>
                  <span>Budget used</span>
                  <span style={{ fontWeight:600, color: budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#d97706' : 'var(--text-primary)' }}>
                    {budgetPct.toFixed(0)}% — ${m.amountSpent?.toFixed(0)} / ${p.budget?.toLocaleString()}
                  </span>
                </div>
                <div style={{ height:6, borderRadius:3, background:'var(--bg-elevated)' }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${budgetPct}%`, transition:'width 0.6s ease', background: budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#d97706' : `linear-gradient(90deg,${pl?.color||'#7c3aed'},${pl?.color||'#a855f7'}bb)` }}/>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { label:'Impressions', value:formatKPI(m.impressions,'number') },
                  { label:'Clicks',      value:formatKPI(m.totalClicks,'number') },
                  { label:'CTR',         value:formatKPI(m.ctr,'percent') },
                  { label:'CPC',         value:formatKPI(m.cpc,'currency') },
                  { label:'CPM',         value:formatKPI(m.cpm,'currency') },
                  { label:'Conversions', value:formatKPI(m.conversions,'number') },
                ].map(stat => (
                  <div key={stat.label} style={{ padding:'8px 10px', borderRadius:8, background:'var(--bg-elevated)' }}>
                    <div style={{ fontSize:10, color:'var(--text-faint)', fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>{stat.label}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
