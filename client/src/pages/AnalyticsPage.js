import React, { useState } from 'react';
import Layout from '../components/shared/Layout';
import KPIChart from '../components/dashboard/KPIChart';
import { PLATFORMS, PlatformIcons } from '../utils/platforms';

export default function AnalyticsPage() {
  const [selectedKPI, setSelectedKPI] = useState('impressions');
  const [selectedPlatforms, setSelectedPlatforms] = useState(PLATFORMS.map(p => p.id));

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#e8e0f5', margin: '0 0 6px' }}>Analytics</h1>
        <p style={{ color: '#8b7baa', margin: 0, fontSize: 14 }}>Deep-dive into your campaign performance metrics</p>
      </div>

      {/* Platform filter pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Filter by platform:</span>
        {PLATFORMS.map(pl => {
          const Icon = PlatformIcons[pl.id];
          const active = selectedPlatforms.includes(pl.id);
          return (
            <button
              key={pl.id}
              onClick={() => togglePlatform(pl.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: active ? `${pl.color}15` : 'rgba(26,16,51,0.6)',
                border: `1px solid ${active ? pl.color + '55' : 'rgba(139,92,246,0.15)'}`,
                color: active ? '#e8e0f5' : '#6b7280', transition: 'all 0.2s'
              }}
            >
              {Icon && <Icon size={14} />}
              {pl.name}
            </button>
          );
        })}
      </div>

      {/* KPI selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#8b7baa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Select KPI to visualize
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'amountSpent', label: '💰 Amount Spent', color: '#a855f7' },
            { id: 'impressions', label: '👁️ Impressions', color: '#3b82f6' },
            { id: 'cpm', label: '📊 CPM', color: '#06b6d4' },
            { id: 'totalClicks', label: '🖱️ Clicks', color: '#10b981' },
            { id: 'ctr', label: '📈 CTR', color: '#f59e0b' },
            { id: 'cpc', label: '💸 CPC', color: '#ef4444' },
            { id: 'conversions', label: '🎯 Conversions', color: '#8b5cf6' },
            { id: 'totalReach', label: '📡 Reach', color: '#ec4899' },
            { id: 'addToCart', label: '🛒 Add to Cart', color: '#f97316' }
          ].map(k => (
            <button
              key={k.id}
              onClick={() => setSelectedKPI(k.id)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selectedKPI === k.id ? `${k.color}22` : 'rgba(26,16,51,0.6)',
                border: `1px solid ${selectedKPI === k.id ? k.color + '77' : 'rgba(139,92,246,0.15)'}`,
                color: selectedKPI === k.id ? k.color : '#6b7280', transition: 'all 0.2s'
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <KPIChart selectedKPI={selectedKPI} selectedPlatforms={selectedPlatforms} />
    </Layout>
  );
}
