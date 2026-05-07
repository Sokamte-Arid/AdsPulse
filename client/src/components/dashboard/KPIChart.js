import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI } from '../../utils/api';
import { KPI_DEFINITIONS, PLATFORMS, formatKPI } from '../../utils/platforms';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' }
];

const CustomTooltip = ({ active, payload, label, kpiDef }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 10, 30, 0.97)', border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 12, padding: '12px 16px', minWidth: 180
    }}>
      <div style={{ fontSize: 12, color: '#8b7baa', marginBottom: 8 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ color: entry.color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{entry.name}</span>
          <span style={{ color: '#e8e0f5', fontSize: 12, fontWeight: 700 }}>
            {formatKPI(entry.value, kpiDef?.format)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function KPIChart({ selectedKPI, selectedPlatforms }) {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [showByPlatform, setShowByPlatform] = useState(false);

  const kpiDef = KPI_DEFINITIONS.find(k => k.id === selectedKPI) || KPI_DEFINITIONS[0];
  const activePlatforms = selectedPlatforms?.length ? selectedPlatforms : PLATFORMS.map(p => p.id);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return; // don't fetch without token
    setLoading(true);
    analyticsAPI.getTimeseries({ kpi: selectedKPI || 'impressions', period })
      .then(res => setData(res.data))
      .catch(() => setData(generateMockData(period)))
      .finally(() => setLoading(false));
  }, [selectedKPI, period]);

  const generateMockData = (p) => {
    const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
    const result = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const entry = { date: date.toISOString().split('T')[0] };
      let total = 0;
      PLATFORMS.forEach(pl => {
        const base = Math.floor(Math.random() * 5000) + 1000;
        entry[pl.id] = base;
        total += base;
      });
      entry.total = total;
      result.push(entry);
    }
    return result;
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#e8e0f5', margin: 0 }}>
            {kpiDef.icon} {kpiDef.label} Over Time
          </h3>
          <p style={{ fontSize: 12, color: '#8b7baa', margin: '4px 0 0' }}>
            Click any KPI card above to switch this chart
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowByPlatform(!showByPlatform)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: showByPlatform ? 'rgba(124,58,237,0.2)' : 'transparent',
              border: '1px solid rgba(124,58,237,0.3)',
              color: showByPlatform ? '#c084fc' : '#6b7280',
              transition: 'all 0.2s'
            }}
          >
            By Platform
          </button>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: period === opt.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${period === opt.value ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.15)'}`,
                color: period === opt.value ? '#c084fc' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#8b7baa', fontSize: 14 }}>Loading chart data...</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              {showByPlatform ? (
                PLATFORMS.map(pl => (
                  <linearGradient key={pl.id} id={`grad-${pl.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={pl.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={pl.color} stopOpacity={0} />
                  </linearGradient>
                ))
              ) : (
                <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={kpiDef.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={kpiDef.color} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(139,92,246,0.15)' }}
              tickFormatter={v => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatKPI(v, kpiDef.format)}
              width={60}
            />
            <Tooltip content={<CustomTooltip kpiDef={kpiDef} />} />
            {showByPlatform ? (
              <>
                {PLATFORMS.filter(pl => activePlatforms.includes(pl.id)).map(pl => (
                  <Area
                    key={pl.id}
                    type="monotone"
                    dataKey={pl.id}
                    name={pl.name}
                    stroke={pl.color}
                    strokeWidth={2}
                    fill={`url(#grad-${pl.id})`}
                    dot={false}
                    activeDot={{ r: 4, fill: pl.color }}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => <span style={{ color: '#8b7baa' }}>{value}</span>}
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={kpiDef.color}
                strokeWidth={2.5}
                fill="url(#grad-total)"
                dot={false}
                activeDot={{ r: 5, fill: kpiDef.color, stroke: '#0f0a1e', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
