import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { analyticsAPI } from '../../utils/api';
import { KPI_DEFINITIONS, formatKPI } from '../../utils/platforms';

export default function CompareAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period1, setPeriod1] = useState({ start: '', end: '' });
  const [period2, setPeriod2] = useState({ start: '', end: '' });
  const [selectedMetrics, setSelectedMetrics] = useState(['amountSpent', 'impressions', 'totalClicks', 'conversions']);

  const defaultDates = () => {
    const now = new Date();
    const p2End = now.toISOString().split('T')[0];
    const p2Start = new Date(now - 30 * 86400000).toISOString().split('T')[0];
    const p1End = p2Start;
    const p1Start = new Date(now - 60 * 86400000).toISOString().split('T')[0];
    setPeriod1({ start: p1Start, end: p1End });
    setPeriod2({ start: p2Start, end: p2End });
  };

  useEffect(() => { defaultDates(); }, []);

  const fetchData = async () => {
    if (!period1.start || !period2.start) return;
    setLoading(true);
    try {
      const res = await analyticsAPI.getCompare({
        period1Start: period1.start, period1End: period1.end,
        period2Start: period2.start, period2End: period2.end
      });
      setData(res.data);
    } catch {
      // Mock data
      const mock = {
        period1: { amountSpent: 3200, impressions: 180000, totalClicks: 4200, conversions: 120, ctr: 2.3, cpc: 0.76, cpm: 17.8, totalReach: 95000, addToCart: 350 },
        period2: { amountSpent: 4100, impressions: 240000, totalClicks: 6800, conversions: 190, ctr: 2.83, cpc: 0.60, cpm: 17.1, totalReach: 130000, addToCart: 510 },
        changes: { amountSpent: 28.1, impressions: 33.3, totalClicks: 61.9, conversions: 58.3, ctr: 23.0, cpc: -21.1, cpm: -3.9, totalReach: 36.8, addToCart: 45.7 }
      };
      setData(mock);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period1.start && period2.start) fetchData();
  }, []);

  const toggleMetric = (id) => {
    setSelectedMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const chartData = KPI_DEFINITIONS
    .filter(k => selectedMetrics.includes(k.id))
    .map(k => ({
      name: k.label,
      icon: k.icon,
      period1: data?.period1?.[k.id] || 0,
      period2: data?.period2?.[k.id] || 0,
      change: data?.changes?.[k.id] || 0,
      format: k.format,
      color: k.color
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Period selector */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#e8e0f5', margin: '0 0 16px' }}>
          📊 Comparative Analysis
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <label className="form-label">Period 1</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" className="form-input" value={period1.start} onChange={e => setPeriod1(p => ({ ...p, start: e.target.value }))} />
              <input type="date" className="form-input" value={period1.end} onChange={e => setPeriod1(p => ({ ...p, end: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Period 2</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" className="form-input" value={period2.start} onChange={e => setPeriod2(p => ({ ...p, start: e.target.value }))} />
              <input type="date" className="form-input" value={period2.end} onChange={e => setPeriod2(p => ({ ...p, end: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Metric toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {KPI_DEFINITIONS.map(k => (
          <button
            key={k.id}
            onClick={() => toggleMetric(k.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: selectedMetrics.includes(k.id) ? `${k.color}22` : 'rgba(26,16,51,0.5)',
              border: `1px solid ${selectedMetrics.includes(k.id) ? k.color + '88' : 'rgba(139,92,246,0.15)'}`,
              color: selectedMetrics.includes(k.id) ? k.color : '#6b7280',
              transition: 'all 0.2s'
            }}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      {/* Change summary cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {KPI_DEFINITIONS.filter(k => selectedMetrics.includes(k.id)).map(k => {
            const change = data.changes?.[k.id] || 0;
            const isPositive = k.id === 'cpc' || k.id === 'cpm' ? change < 0 : change > 0;
            const isNeutral = Math.abs(change) < 0.5;
            return (
              <div key={k.id} className="glass-card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#8b7baa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {k.icon} {k.label}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {formatKPI(data.period1?.[k.id] || 0, k.format)}
                  </div>
                  <div style={{ fontSize: 16, color: '#8b7baa' }}>→</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e0f5' }}>
                    {formatKPI(data.period2?.[k.id] || 0, k.format)}
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: isNeutral ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isNeutral ? '#94a3b8' : isPositive ? '#4ade80' : '#ef4444',
                  border: `1px solid ${isNeutral ? 'rgba(148,163,184,0.2)' : isPositive ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  {isNeutral ? '—' : isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bar chart comparison */}
      {data && chartData.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h4 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: '#e8e0f5', margin: '0 0 20px' }}>
            Side-by-Side Comparison
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(139,92,246,0.15)' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,10,30,0.97)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12 }}
                labelStyle={{ color: '#e8e0f5', fontWeight: 700, marginBottom: 8 }}
                itemStyle={{ color: '#8b7baa' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b7baa' }} />
              <Bar dataKey="period1" name="Period 1" fill="rgba(139,92,246,0.4)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="period2" name="Period 2" fill="rgba(168,85,247,0.8)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
