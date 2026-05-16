import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI } from '../utils/api';
import { KPI_DEFINITIONS, formatKPI } from '../utils/platforms';

export default function ComparePage() {
  const navigate = useNavigate();
  const now = new Date();
  const [period1, setPeriod1] = useState({
    start: new Date(now - 60 * 86400000).toISOString().split('T')[0],
    end:   new Date(now - 30 * 86400000).toISOString().split('T')[0],
  });
  const [period2, setPeriod2] = useState({
    start: new Date(now - 30 * 86400000).toISOString().split('T')[0],
    end:   now.toISOString().split('T')[0],
  });
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [hasData, setHasData]   = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([
    'amountSpent', 'impressions', 'totalClicks', 'conversions'
  ]);

  const toggleMetric = (id) => {
    setSelectedMetrics(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getCompare({
        period1Start: period1.start, period1End: period1.end,
        period2Start: period2.start, period2End: period2.end,
      });
      const result = res.data;
      // Check if there is any real data in either period
      const p1Total = Object.values(result.period1 || {}).reduce((s, v) => s + (v || 0), 0);
      const p2Total = Object.values(result.period2 || {}).reduce((s, v) => s + (v || 0), 0);
      const real = p1Total > 0 || p2Total > 0;
      setHasData(real);
      setData(real ? result : null);
    } catch {
      setHasData(false);
      setData(null);
    } finally { setLoading(false); }
  };

  const chartData = KPI_DEFINITIONS
    .filter(k => selectedMetrics.includes(k.id))
    .map(k => ({
      name:    k.label,
      period1: data?.period1?.[k.id] || 0,
      period2: data?.period2?.[k.id] || 0,
      change:  data?.changes?.[k.id]  || 0,
      format:  k.format,
      color:   k.color,
    }));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Period Comparison</h1>
          <p className="page-subtitle">Compare KPIs across two date ranges to track progress</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="glass-card" style={{ padding:24, marginBottom:24 }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px' }}>
          Select Date Ranges
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:16, alignItems:'end', flexWrap:'wrap' }}>
          <div>
            <label className="form-label">Period 1 (older)</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="date" className="form-input" value={period1.start}
                onChange={e => setPeriod1(p => ({ ...p, start: e.target.value }))}/>
              <input type="date" className="form-input" value={period1.end}
                onChange={e => setPeriod1(p => ({ ...p, end: e.target.value }))}/>
            </div>
          </div>
          <div>
            <label className="form-label">Period 2 (recent)</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="date" className="form-input" value={period2.start}
                onChange={e => setPeriod2(p => ({ ...p, start: e.target.value }))}/>
              <input type="date" className="form-input" value={period2.end}
                onChange={e => setPeriod2(p => ({ ...p, end: e.target.value }))}/>
            </div>
          </div>
          <button className="btn-primary" onClick={handleCompare} disabled={loading}>
            {loading ? '⏳ Loading...' : '📊 Compare'}
          </button>
        </div>
      </div>

      {/* Metric toggles */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
        {KPI_DEFINITIONS.map(k => (
          <button key={k.id} onClick={() => toggleMetric(k.id)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background: selectedMetrics.includes(k.id) ? `${k.color}22` : 'var(--bg-elevated)',
            border:`1px solid ${selectedMetrics.includes(k.id) ? k.color+'88' : 'var(--border-subtle)'}`,
            color: selectedMetrics.includes(k.id) ? k.color : 'var(--text-faint)',
            transition:'all 0.2s'
          }}>
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      {/* No comparison run yet */}
      {!data && !loading && (
        <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
          <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>
            No Comparison Yet
          </h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7, maxWidth:380, marginInline:'auto' }}>
            {hasData === false && data === null
              ? 'Select two date ranges above and click Compare to see how your performance changed.'
              : 'No campaign data found for the selected periods. Try different dates or create some campaigns first.'}
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={handleCompare} disabled={loading}>
              📊 Run Comparison
            </button>
            <button className="btn-secondary" onClick={() => navigate('/campaigns/new')}>
              + Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* No real data found after comparison */}
      {data === null && hasData === false && !loading && (
        <div className="glass-card" style={{ padding:40, textAlign:'center', marginTop:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
            No Data for Selected Periods
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
            There are no campaign metrics in these date ranges. Try selecting a wider range or connect a platform to import existing data.
          </div>
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Change cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
            {KPI_DEFINITIONS.filter(k => selectedMetrics.includes(k.id)).map(k => {
              const change     = data.changes?.[k.id] || 0;
              const isPositive = k.id === 'cpc' || k.id === 'cpm' ? change < 0 : change > 0;
              const isNeutral  = Math.abs(change) < 0.5;
              return (
                <div key={k.id} className="glass-card" style={{ padding:'16px 18px' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                    {k.icon} {k.label}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                    <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                      {formatKPI(data.period1?.[k.id] || 0, k.format)}
                    </div>
                    <div style={{ fontSize:14, color:'var(--text-muted)' }}>→</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                      {formatKPI(data.period2?.[k.id] || 0, k.format)}
                    </div>
                  </div>
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    padding:'3px 8px', borderRadius:6, fontSize:12, fontWeight:700,
                    background: isNeutral ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                    color:      isNeutral ? '#94a3b8'               : isPositive ? '#16a34a'              : '#ef4444',
                    border:`1px solid ${isNeutral ? 'rgba(148,163,184,0.2)' : isPositive ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                    {isNeutral ? '—' : isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="glass-card" style={{ padding:24 }}>
              <h4 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 20px' }}>
                Side-by-Side Comparison
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="name" tick={{ fill:'var(--text-faint)', fontSize:11 }} tickLine={false} axisLine={{ stroke:'rgba(139,92,246,0.15)' }}/>
                  <YAxis tick={{ fill:'var(--text-faint)', fontSize:11 }} tickLine={false} axisLine={false}/>
                  <Tooltip
                    contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12 }}
                    labelStyle={{ color:'var(--text-primary)', fontWeight:700, marginBottom:8 }}
                    itemStyle={{ color:'var(--text-muted)' }}
                  />
                  <Legend wrapperStyle={{ fontSize:12, color:'var(--text-muted)' }}/>
                  <Bar dataKey="period1" name="Period 1" fill="rgba(139,92,246,0.4)" radius={[4,4,0,0]}/>
                  <Bar dataKey="period2" name="Period 2" fill="rgba(168,85,247,0.85)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
