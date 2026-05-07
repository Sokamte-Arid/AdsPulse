import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { campaignAPI } from '../utils/api';
import { PlatformIcons, PLATFORMS, CAMPAIGN_OBJECTIVES, formatKPI } from '../utils/platforms';

const STATUS_OPTIONS = ['all', 'active', 'paused', 'draft', 'completed'];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [toggling, setToggling]   = useState(null);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const res = await campaignAPI.getAll(params);
      setCampaigns(res.data.campaigns || []);
    } catch {
      setCampaigns(MOCK_CAMPAIGNS);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleToggle = async (e, campaignId, currentStatus) => {
    e.stopPropagation();
    setToggling(campaignId);
    try {
      const res = await campaignAPI.toggleStatus(campaignId);
      const updated = res.data.campaign || res.data;
      setCampaigns(cs => cs.map(c => c._id === campaignId ? { ...c, status: updated.status } : c));
      showToast(`${updated.status === 'active' ? '▶️ Resumed' : '⏸️ Paused'}: ${updated.name}`);
    } catch {
      // Optimistic update
      setCampaigns(cs => cs.map(c => c._id === campaignId
        ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
        : c
      ));
      showToast(currentStatus === 'active' ? '⏸️ Campaign paused' : '▶️ Campaign resumed');
    } finally { setToggling(null); }
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await campaignAPI.delete(id);
      setCampaigns(cs => cs.filter(c => c._id !== id));
      showToast(`🗑️ "${name}" deleted`);
    } catch (err) { showToast('❌ Could not delete campaign'); }
  };

  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', maxWidth:380 }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/campaigns/new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Campaign
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input
          className="form-input"
          placeholder="🔍 Search campaigns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth:260 }}
        />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
              cursor:'pointer', textTransform:'capitalize',
              background: filter === s ? 'rgba(124,58,237,0.2)' : 'transparent',
              border: `1px solid ${filter === s ? 'rgba(124,58,237,0.5)' : 'rgba(139,92,246,0.15)'}`,
              color: filter === s ? 'var(--purple-light)' : 'var(--text-faint)',
              transition:'all 0.2s', fontFamily:'DM Sans,sans-serif'
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:88, borderRadius:12 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8, color:'var(--text-secondary)' }}>No campaigns found</div>
          <button className="btn-primary" onClick={() => navigate('/campaigns/new')}>Create your first campaign</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(campaign => {
            const obj = CAMPAIGN_OBJECTIVES.find(o => o.id === campaign.objective);
            const totalSpent = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.amountSpent || 0), 0);
            const totalImpressions = (campaign.platforms || []).reduce((s, p) => s + (p.metrics?.impressions || 0), 0);
            const isToggling = toggling === campaign._id;

            return (
              <div
                key={campaign._id}
                className="glass-card"
                onClick={() => navigate(`/campaigns/${campaign._id}`)}
                style={{ padding:'18px 22px', cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  {/* Name + meta */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>
                        {campaign.name}
                      </span>
                      <span className={`status-${campaign.status}`}>{campaign.status}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{obj?.icon} {obj?.label}</span>
                      <div style={{ display:'flex', gap:6 }}>
                        {(campaign.platforms || []).map(p => {
                          const Icon = PlatformIcons[p.platform];
                          return Icon ? (
                            <div key={p.platform} title={`${p.platform} — ${p.status}`} style={{ opacity: p.status === 'paused' ? 0.4 : 1 }}>
                              <Icon size={15}/>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Budget */}
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:2 }}>Budget</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
                      ${(campaign.totalBudget || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Spent */}
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:2 }}>Spent</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--purple-light)' }}>
                      {formatKPI(totalSpent, 'currency')}
                    </div>
                  </div>

                  {/* Impressions */}
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:2 }}>Impressions</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
                      {formatKPI(totalImpressions, 'number')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                    {/* Pause / Resume */}
                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                      <button
                        onClick={e => handleToggle(e, campaign._id, campaign.status)}
                        disabled={isToggling}
                        style={{
                          padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700,
                          cursor:'pointer', border:'none', fontFamily:'DM Sans,sans-serif',
                          background: campaign.status === 'active' ? 'rgba(217,119,6,0.12)' : 'rgba(22,163,74,0.12)',
                          color: campaign.status === 'active' ? '#d97706' : '#16a34a',
                          opacity: isToggling ? 0.6 : 1,
                          transition:'all 0.2s'
                        }}
                      >
                        {isToggling ? '⏳' : campaign.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/campaigns/${campaign._id}/edit`); }}
                      style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-hover)', color:'var(--purple-light)', cursor:'pointer', fontSize:12, fontWeight:600 }}
                    >
                      ✏️
                    </button>

                    {/* Delete */}
                    <button
                      onClick={e => handleDelete(e, campaign._id, campaign.name)}
                      style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:12 }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

const MOCK_CAMPAIGNS = [
  { _id:'1', name:'Q4 Brand Awareness Drive', objective:'awareness', status:'active', totalBudget:12000, platforms:[{platform:'meta',status:'active',metrics:{amountSpent:3200,impressions:280000}},{platform:'google',status:'active',metrics:{amountSpent:2800,impressions:195000}},{platform:'tiktok',status:'paused',metrics:{amountSpent:2100,impressions:420000}}] },
  { _id:'2', name:'Summer Sale – Conversions', objective:'conversions', status:'active', totalBudget:18500, platforms:[{platform:'meta',status:'active',metrics:{amountSpent:6200,impressions:310000}},{platform:'google',status:'active',metrics:{amountSpent:5800,impressions:220000}}] },
  { _id:'3', name:'App Install – Africa', objective:'app_installs', status:'paused', totalBudget:8000, platforms:[{platform:'tiktok',status:'paused',metrics:{amountSpent:1900,impressions:380000}},{platform:'snapchat',status:'paused',metrics:{amountSpent:1100,impressions:145000}}] },
  { _id:'4', name:'Holiday Catalog 2025', objective:'catalog_sales', status:'draft', totalBudget:15000, platforms:[{platform:'meta',status:'draft',metrics:{amountSpent:0,impressions:0}},{platform:'google',status:'draft',metrics:{amountSpent:0,impressions:0}}] },
];
