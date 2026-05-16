import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../utils/api';
import { PlatformIcons, PLATFORMS, formatKPI } from '../../utils/platforms';
import { useNavigate } from 'react-router-dom';

const METRICS = [
  { id:'impressions',  label:'Impressions',  format:'number'   },
  { id:'totalClicks',  label:'Clicks',       format:'number'   },
  { id:'amountSpent',  label:'Spent',        format:'currency' },
  { id:'conversions',  label:'Conversions',  format:'number'   },
  { id:'ctr',          label:'CTR',          format:'percent'  },
  { id:'cpm',          label:'CPM',          format:'currency' },
];

export default function PlatformPerformanceChart() {
  const navigate = useNavigate();
  const [data, setData]     = useState([]);
  const [metric, setMetric] = useState('impressions');
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    analyticsAPI.getPlatformPerformance()
      .then(res => {
        const results = res.data || [];
        // Only use platforms that have real data
        const withData = results.filter(p =>
          p.impressions > 0 || p.amountSpent > 0 || p.totalClicks > 0
        );
        setHasData(withData.length > 0);
        setData(withData);
      })
      .catch(() => {
        setHasData(false);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const metricDef = METRICS.find(m => m.id === metric);
  const sorted    = [...data].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  const maxVal    = sorted.length > 0 ? Math.max(...sorted.map(d => d[metric] || 0)) : 1;

  return (
    <div className="glass-card" style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
            🏆 Platform Performance
          </h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
            {hasData ? 'Active campaigns ranking by metric' : 'Connect a platform to see rankings'}
          </p>
        </div>
        {hasData && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {METRICS.map(m => (
              <button key={m.id} onClick={() => setMetric(m.id)} style={{
                padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                background: metric === m.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                border:`1px solid ${metric === m.id ? 'rgba(124,58,237,0.5)' : 'var(--border-subtle)'}`,
                color: metric === m.id ? 'var(--purple-light)' : 'var(--text-faint)',
                transition:'all 0.2s'
              }}>{m.label}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:44, borderRadius:8 }}/>)}
        </div>

      ) : !hasData ? (
        /* Empty state */
        <div style={{
          padding:'40px 20px', borderRadius:12,
          background:'var(--bg-elevated)',
          border:'2px dashed var(--border-subtle)',
          textAlign:'center'
        }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
            No Platform Data Yet
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, maxWidth:340, margin:'0 auto 20px' }}>
            Once you have active campaigns running on connected platforms, you'll see a live ranking of which platform is performing best.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/campaigns/new')} style={{ fontSize:12 }}>
              + Create Campaign
            </button>
            <button className="btn-secondary" onClick={() => navigate('/connect')} style={{ fontSize:12 }}>
              🔌 Connect Platform
            </button>
          </div>
        </div>

      ) : (
        /* Real ranking bars */
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {sorted.map((item, idx) => {
            const pl   = PLATFORMS.find(p => p.id === item.platform);
            const Icon = PlatformIcons[item.platform];
            const pct  = maxVal > 0 ? (item[metric] / maxVal) * 100 : 0;

            return (
              <div key={item.platform} style={{ display:'flex', alignItems:'center', gap:14 }}>
                {/* Rank */}
                <div style={{ width:24, color:'var(--text-faint)', fontSize:12, fontWeight:800, textAlign:'right', flexShrink:0 }}>
                  #{idx + 1}
                </div>
                {/* Icon */}
                <div style={{ width:28, display:'flex', justifyContent:'center', flexShrink:0 }}>
                  {Icon && <Icon size={22}/>}
                </div>
                {/* Name */}
                <div style={{ width:90, fontSize:12, fontWeight:600, color:'var(--text-secondary)', flexShrink:0 }}>
                  {pl?.name}
                </div>
                {/* Bar */}
                <div style={{ flex:1, position:'relative' }}>
                  <div style={{
                    height:8, borderRadius:4,
                    background:'var(--bg-elevated)',
                    overflow:'hidden'
                  }}>
                    <div style={{
                      position:'absolute', left:0, top:0, height:'100%',
                      width:`${pct}%`,
                      background:`linear-gradient(90deg,${pl?.color || '#7c3aed'},${pl?.color || '#a855f7'}99)`,
                      borderRadius:4, transition:'width 0.8s ease'
                    }}/>
                  </div>
                </div>
                {/* Value */}
                <div style={{ width:90, textAlign:'right', fontSize:13, fontWeight:700, color:'var(--text-primary)', flexShrink:0 }}>
                  {formatKPI(item[metric] || 0, metricDef?.format)}
                </div>
                {/* Campaigns */}
                <div style={{
                  width:70, textAlign:'center', fontSize:11, padding:'2px 8px',
                  borderRadius:6, flexShrink:0,
                  background:'rgba(22,163,74,0.1)', color:'#16a34a',
                  border:'1px solid rgba(22,163,74,0.2)'
                }}>
                  {item.campaignCount || 0} active
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
