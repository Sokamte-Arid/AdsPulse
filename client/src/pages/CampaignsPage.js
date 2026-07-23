import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSetPageTitle } from '../context/PageContext';
import { PlatformIcons } from '../utils/platforms';
import { Bolt, Campaigns } from '../components/shared/Icons.js';
import ExportButton from '../components/shared/ExportButton';
import CompareModal from '../components/shared/CompareModal';

export default function CampaignsPage() {
  useSetPageTitle('Campaigns', 'Manage your advertising campaigns');
  const { t }       = useLanguage();
  const navigate    = useNavigate();
  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [search,       setSearch]       = useState('');
  const [deleting,     setDeleting]     = useState(null);
  const [showCompare,  setShowCompare]  = useState(false);

  useEffect(() => {
    campaignAPI.getAll({ limit:200 })
      .then(r => setCampaigns(r.data?.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = campaigns.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleDelete = async (id) => {
    if (!window.confirm(t('campaigns.confirm_delete') || 'Delete this campaign?')) return;
    setDeleting(id);
    try { await campaignAPI.delete(id); setCampaigns(cs => cs.filter(c => c._id !== id)); }
    catch { alert('Delete failed'); }
    finally { setDeleting(null); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await campaignAPI.toggleStatus(id);
      setCampaigns(cs => cs.map(c => c._id === id ? { ...c, status: res.data.status } : c));
    } catch { alert('Status update failed'); }
  };

  const statusColor = { active:'#16a34a', paused:'#d97706', draft:'#6b7280', completed:'#3b82f6' };

  const filterOptions = [
    { key:'all',       label:'All'      },
    { key:'active',    label:'Active'   },
    { key:'paused',    label:'Paused'   },
    { key:'draft',     label:'Draft'    },
  ];

  return (
    <Layout>
      {showCompare && <CompareModal onClose={() => setShowCompare(false)}/>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage your advertising campaigns</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/ab-testing')}
            style={{ fontSize:13, display:'flex', alignItems:'center', gap:6, color:'#16a34a', borderColor:'rgba(22,163,74,0.3)', background:'rgba(22,163,74,0.08)' }}>
            🧪 A/B Testing
          </button>
          <button className="btn-secondary" onClick={() => setShowCompare(true)}
            style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
            ⚖️ Compare
          </button>
          <button className="btn-secondary" onClick={() => navigate('/ad-copy')}
            style={{ fontSize:13, display:'flex', alignItems:'center', gap:6, color:'#f59e0b', borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.08)' }}>
            ✍️ Ad Copy
          </button>
          <button className="btn-secondary" onClick={() => navigate('/ai-campaign')}
            style={{ fontSize:13, display:'flex', alignItems:'center', gap:6, color:'var(--purple-light)', borderColor:'rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.08)' }}>
            <Bolt size={14}/> Create with AI
          </button>
          <ExportButton endpoint="campaigns" filename="campaigns" label="Export"/>
          <button className="btn-primary" onClick={() => navigate('/campaigns/new')}>
            + New Campaign
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:12, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
        <input className="form-input" placeholder="Search campaigns..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:'1 1 220px', maxWidth:340, fontSize:13 }}/>
        <div style={{ display:'flex', gap:6 }}>
          {filterOptions.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding:'7px 14px', borderRadius:9, border:`1px solid ${filter===f.key?'var(--purple-primary)':'var(--border-subtle)'}`, background:filter===f.key?'rgba(124,58,237,0.12)':'transparent', color:filter===f.key?'var(--purple-light)':'var(--text-muted)', fontWeight:filter===f.key?700:500, fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:88, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ marginBottom:14, color:'var(--text-faint)' }}><Campaigns size={40}/></div>
          <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No campaigns yet</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>Create your first campaign to get started</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-secondary" onClick={() => navigate('/ai-campaign')}
              style={{ fontSize:13, display:'flex', alignItems:'center', gap:6, color:'var(--purple-light)' }}>
              <Bolt size={14}/> Create with AI
            </button>
            <button className="btn-primary" onClick={() => navigate('/campaigns/new')}>+ New Campaign</button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(campaign => (
            <div key={campaign._id} className="glass-card"
              style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', cursor:'pointer' }}
              onClick={() => navigate(`/campaigns/${campaign._id}`)}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:statusColor[campaign.status]||'#6b7280', flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {campaign.name}
                </div>
                <div style={{ fontSize:12, color:'var(--text-faint)', display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span>Objective: {campaign.objective}</span>
                  <span>·</span>
                  <span>Budget: ${campaign.totalBudget?.toLocaleString()}</span>
                  {campaign.tags?.includes('imported') && (
                    <span style={{ padding:'1px 7px', borderRadius:10, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', color:'#3b82f6', fontWeight:600 }}>imported</span>
                  )}
                  {campaign.tags?.includes('ai-generated') && (
                    <span style={{ padding:'1px 7px', borderRadius:10, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'var(--purple-light)', fontWeight:600 }}>✨ AI</span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {campaign.platforms?.map(p => {
                  const Icon = PlatformIcons[p.platform];
                  return Icon ? <Icon key={p.platform} size={18}/> : null;
                })}
              </div>
              <div style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:`${statusColor[campaign.status]||'#6b7280'}18`, color:statusColor[campaign.status]||'#6b7280', border:`1px solid ${statusColor[campaign.status]||'#6b7280'}30`, flexShrink:0 }}>
                {campaign.status}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                <button className="btn-secondary" onClick={() => handleToggle(campaign._id)}
                  style={{ fontSize:11, padding:'5px 10px' }}>
                  {campaign.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button onClick={() => handleDelete(campaign._id)} disabled={deleting===campaign._id}
                  style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                  {deleting===campaign._id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}