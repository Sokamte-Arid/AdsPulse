import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI } from '../../utils/api';
import { KPI_DEFINITIONS, PLATFORMS, formatKPI } from '../../utils/platforms';

const PERIOD_OPTIONS = [
  { value: '7d',  label: '7 Days'  },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const CustomTooltip = ({ active, payload, label, kpiDef }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
      borderRadius:12, padding:'12px 16px', minWidth:180,
      boxShadow:'0 8px 32px rgba(0,0,0,0.2)'
    }}>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ display:'flex', justifyContent:'space-between', gap:20, marginBottom:4 }}>
          <span style={{ color:entry.color, fontSize:12, fontWeight:600 }}>{entry.name}</span>
          <span style={{ color:'var(--text-primary)', fontSize:12, fontWeight:700 }}>
            {formatKPI(entry.value, kpiDef?.format)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function KPIChart({ selectedKPI, period: externalPeriod }) {
  const [data, setData]               = useState([]);
  const [period, setPeriod]           = useState(externalPeriod || '30d');
  const [loading, setLoading]         = useState(true);
  const [showByPlatform, setShowByPlatform] = useState(false);
  const [hasData, setHasData]         = useState(false);

  const kpiDef = KPI_DEFINITIONS.find(k => k.id === selectedKPI) || KPI_DEFINITIONS[0];

  useEffect(() => {
    if (externalPeriod) setPeriod(externalPeriod);
  }, [externalPeriod]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    setLoading(true);
    analyticsAPI.getTimeseries({ kpi: selectedKPI || 'impressions', period })
      .then(res => {
        const series = res.data || [];
        // Check if any data point has a non-zero value
        const hasRealData = series.some(d =>
          (d.total > 0) || PLATFORMS.some(p => d[p.id] > 0)
        );
        setHasData(hasRealData);
        setData(hasRealData ? series : []);
      })
      .catch(() => {
        setHasData(false);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [selectedKPI, period]);

  return (
    <div className="glass-card" style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
            {kpiDef.icon} {kpiDef.label} Over Time
          </h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
            {hasData ? 'Click any KPI card above to switch this chart' : 'No data yet — create a campaign to see trends'}
          </p>
        </div>
        {hasData && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              onClick={() => setShowByPlatform(!showByPlatform)}
              style={{
                padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                background: showByPlatform ? 'rgba(124,58,237,0.2)' : 'transparent',
                border:`1px solid ${showByPlatform ? 'rgba(124,58,237,0.5)' : 'var(--border-subtle)'}`,
                color: showByPlatform ? 'var(--purple-light)' : 'var(--text-faint)',
                transition:'all 0.2s', fontFamily:'DM Sans,sans-serif'
              }}
            >
              By Platform
            </button>
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                style={{
                  padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                  background: period === opt.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                  border:`1px solid ${period === opt.value ? 'rgba(124,58,237,0.5)' : 'var(--border-subtle)'}`,
                  color: period === opt.value ? 'var(--purple-light)' : 'var(--text-faint)',
                  transition:'all 0.2s', fontFamily:'DM Sans,sans-serif'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading chart...</div>
        </div>

      ) : !hasData ? (
        /* Empty state */
        <div style={{
          height:280, borderRadius:12,
          background:'var(--bg-elevated)',
          border:'2px dashed var(--border-subtle)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:10
        }}>
          <div style={{ fontSize:36 }}>📈</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>No chart data yet</div>
          <div style={{ fontSize:12, color:'var(--text-faint)', textAlign:'center', maxWidth:280, lineHeight:1.6 }}>
            Once you have active campaigns with spend data, your {kpiDef.label} trend will appear here.
          </div>
        </div>

      ) : (
        /* Real chart */
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top:5, right:10, left:0, bottom:5 }}>
            <defs>
              {showByPlatform ? (
                PLATFORMS.map(pl => (
                  <linearGradient key={pl.id} id={`grad-${pl.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={pl.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={pl.color} stopOpacity={0}/>
                  </linearGradient>
                ))
              ) : (
                <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={kpiDef.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={kpiDef.color} stopOpacity={0}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
            <XAxis
              dataKey="date"
              tick={{ fill:'var(--text-faint)', fontSize:11 }}
              tickLine={false}
              axisLine={{ stroke:'rgba(139,92,246,0.15)' }}
              tickFormatter={v => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; }}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fill:'var(--text-faint)', fontSize:11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatKPI(v, kpiDef.format)}
              width={60}
            />
            <Tooltip content={<CustomTooltip kpiDef={kpiDef}/>}/>
            {showByPlatform ? (
              <>
                {PLATFORMS.map(pl => (
                  <Area
                    key={pl.id}
                    type="monotone"
                    dataKey={pl.id}
                    name={pl.name}
                    stroke={pl.color}
                    strokeWidth={2}
                    fill={`url(#grad-${pl.id})`}
                    dot={false}
                    activeDot={{ r:4, fill:pl.color }}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize:12, paddingTop:12 }}
                  formatter={value => <span style={{ color:'var(--text-muted)' }}>{value}</span>}/>
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="total"
                name={kpiDef.label}
                stroke={kpiDef.color}
                strokeWidth={2.5}
                fill="url(#grad-total)"
                dot={false}
                activeDot={{ r:5, fill:kpiDef.color, stroke:'var(--bg-page)', strokeWidth:2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
