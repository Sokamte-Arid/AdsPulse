import React, { useState, useEffect } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { analyticsAPI } from '../../utils/api';
import { PlatformIcons, PLATFORMS, formatKPI } from '../../utils/platforms';

const MOCK_DATA = PLATFORMS.map(p => ({
  platform: p.id,
  amountSpent: Math.random() * 5000 + 500,
  impressions: Math.floor(Math.random() * 500000) + 50000,
  totalClicks: Math.floor(Math.random() * 20000) + 1000,
  conversions: Math.floor(Math.random() * 500) + 50,
  totalReach: Math.floor(Math.random() * 300000) + 30000,
  ctr: Math.random() * 5 + 0.5,
  cpc: Math.random() * 2 + 0.1,
  cpm: Math.random() * 15 + 2,
  campaignCount: Math.floor(Math.random() * 5) + 1,
  budget: Math.random() * 8000 + 1000
}));

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const pl = PLATFORMS.find(p => p.id === d.platform);
  const Icon = PlatformIcons[d.platform];
  return (
    <div style={{
      background: 'rgba(15,10,30,0.97)', border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 12, padding: '14px 18px', minWidth: 200
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {Icon && <Icon size={20} />}
        <span style={{ fontFamily: 'Syne', fontWeight: 700, color: '#e8e0f5' }}>{pl?.name}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
        {[
          ['Spent', formatKPI(d.amountSpent, 'currency')],
          ['Impressions', formatKPI(d.impressions, 'number')],
          ['Clicks', formatKPI(d.totalClicks, 'number')],
          ['CTR', formatKPI(d.ctr, 'percent')],
          ['CPM', formatKPI(d.cpm, 'currency')],
          ['CPC', formatKPI(d.cpc, 'currency')]
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ color: '#6b7280' }}>{label}</div>
            <div style={{ color: '#e8e0f5', fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlatformPerformanceChart() {
  const [data, setData] = useState([]);
  const [metric, setMetric] = useState('impressions');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bar');

  const metrics = [
    { id: 'impressions', label: 'Impressions', format: 'number' },
    { id: 'totalClicks', label: 'Clicks', format: 'number' },
    { id: 'amountSpent', label: 'Spent', format: 'currency' },
    { id: 'conversions', label: 'Conversions', format: 'number' },
    { id: 'ctr', label: 'CTR', format: 'percent' },
    { id: 'cpm', label: 'CPM', format: 'currency' }
  ];

  useEffect(() => {
    analyticsAPI.getPlatformPerformance()
      .then(res => setData(res.data.length ? res.data : MOCK_DATA))
      .catch(() => setData(MOCK_DATA))
      .finally(() => setLoading(false));
  }, []);

  const metricDef = metrics.find(m => m.id === metric);
  const sortedData = [...data].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  const maxVal = Math.max(...sortedData.map(d => d[metric] || 0));

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#e8e0f5', margin: 0 }}>
            🏆 Platform Performance
          </h3>
          <p style={{ fontSize: 12, color: '#8b7baa', margin: '4px 0 0' }}>Active campaigns ranking</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {metrics.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: metric === m.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${metric === m.id ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.15)'}`,
                color: metric === m.id ? '#c084fc' : '#6b7280', transition: 'all 0.2s'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedData.map((item, idx) => {
          const pl = PLATFORMS.find(p => p.id === item.platform);
          const Icon = PlatformIcons[item.platform];
          const pct = maxVal > 0 ? (item[metric] / maxVal) * 100 : 0;
          return (
            <div key={item.platform} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 24, color: '#6b7280', fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
                #{idx + 1}
              </div>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                {Icon && <Icon size={22} />}
              </div>
              <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#c8bde8' }}>
                {pl?.name}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{
                  height: 8, borderRadius: 4, background: 'rgba(139,92,246,0.1)',
                  overflow: 'hidden', position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${pl?.color || '#7c3aed'}, ${pl?.color || '#a855f7'}99)`,
                    borderRadius: 4, transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
              <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#e8e0f5' }}>
                {formatKPI(item[metric] || 0, metricDef?.format)}
              </div>
              <div style={{
                width: 60, textAlign: 'center', fontSize: 11, padding: '2px 8px',
                borderRadius: 6, background: 'rgba(74,222,128,0.1)',
                color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)'
              }}>
                {item.campaignCount} active
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
