import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import KPIChart from '../components/dashboard/KPIChart';
import { PLATFORMS, PlatformIcons } from '../utils/platforms';

const KPI_OPTIONS = [
  { id:'amountSpent', label:'💰 Amount Spent', color:'#a855f7' },
  { id:'impressions', label:'👁️ Impressions',  color:'#3b82f6' },
  { id:'cpm',         label:'📊 CPM',          color:'#06b6d4' },
  { id:'totalClicks', label:'🖱️ Clicks',       color:'#10b981' },
  { id:'ctr',         label:'📈 CTR',          color:'#f59e0b' },
  { id:'cpc',         label:'💸 CPC',          color:'#ef4444' },
  { id:'conversions', label:'🎯 Conversions',  color:'#8b5cf6' },
  { id:'totalReach',  label:'📡 Reach',        color:'#ec4899' },
  { id:'addToCart',   label:'🛒 Add to Cart',  color:'#f97316' },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [selectedKPI, setSelectedKPI]         = useState('impressions');
  const [selectedPlatforms, setSelectedPlatforms] = useState(PLATFORMS.map(p => p.id));

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Deep-dive into your campaign performance metrics</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/campaigns/new')} style={{ fontSize:13 }}>
          + New Campaign
        </button>
      </div>

      {/* Platform filter pills */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-faint)', fontWeight:600 }}>Platforms:</span>
        {PLATFORMS.map(pl => {
          const Icon   = PlatformIcons[pl.id];
          const active = selectedPlatforms.includes(pl.id);
          return (
            <button key={pl.id} onClick={() => togglePlatform(pl.id)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 12px', borderRadius:20, cursor:'pointer',
              fontSize:12, fontWeight:600, fontFamily:'DM Sans,sans-serif',
              background: active ? `${pl.color}18` : 'var(--bg-elevated)',
              border:`1px solid ${active ? pl.color + '55' : 'var(--border-subtle)'}`,
              color: active ? 'var(--text-primary)' : 'var(--text-faint)',
              transition:'all 0.2s'
            }}>
              {Icon && <Icon size={14}/>}
              {pl.name}
            </button>
          );
        })}
      </div>

      {/* KPI selector */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
          Select KPI to Visualize
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {KPI_OPTIONS.map(k => (
            <button key={k.id} onClick={() => setSelectedKPI(k.id)} style={{
              padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:'DM Sans,sans-serif',
              background: selectedKPI === k.id ? `${k.color}22` : 'var(--bg-elevated)',
              border:`1px solid ${selectedKPI === k.id ? k.color + '77' : 'var(--border-subtle)'}`,
              color: selectedKPI === k.id ? k.color : 'var(--text-faint)',
              transition:'all 0.2s'
            }}>
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — shows empty state internally if no data */}
      <KPIChart selectedKPI={selectedKPI} selectedPlatforms={selectedPlatforms} />
    </Layout>
  );
}
