import React, { useState, useEffect } from 'react';
import { analyticsAPI, campaignAPI } from '../../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_METRICS = [
  // Standard
  { key:'amountSpent',    label:'Amount Spent',     fmt:'currency', group:'performance' },
  { key:'impressions',    label:'Impressions',      fmt:'number',   group:'performance' },
  { key:'totalClicks',    label:'Clicks',           fmt:'number',   group:'performance' },
  { key:'ctr',            label:'CTR',              fmt:'percent',  group:'performance' },
  { key:'cpc',            label:'CPC',              fmt:'currency', group:'performance' },
  { key:'cpm',            label:'CPM',              fmt:'currency', group:'performance' },
  { key:'conversions',    label:'Conversions',      fmt:'number',   group:'performance' },
  { key:'totalReach',     label:'Reach',            fmt:'number',   group:'performance' },
  { key:'addToCart',      label:'Add to Cart',      fmt:'number',   group:'performance' },
  // Video
  { key:'videoViews',     label:'Video Views',      fmt:'number',   group:'video' },
  { key:'video3SecViews', label:'3-Sec Views',      fmt:'number',   group:'video' },
  { key:'videoP25',       label:'25% Watched',      fmt:'number',   group:'video' },
  { key:'videoP50',       label:'50% Watched',      fmt:'number',   group:'video' },
  { key:'videoP75',       label:'75% Watched',      fmt:'number',   group:'video' },
  { key:'videoP100',      label:'Completed Views',  fmt:'number',   group:'video' },
  { key:'thruPlays',      label:'ThruPlays',        fmt:'number',   group:'video' },
  { key:'avgWatchTime',   label:'Avg Watch Time',   fmt:'seconds',  group:'video' },
];

const CHART_METRICS = ALL_METRICS.filter(m => !['ctr','cpc','cpm'].includes(m.key));

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtVal(key, val) {
  const m = ALL_METRICS.find(x => x.key === key);
  if (!m || val == null) return '—';
  const v = Number(val);
  if (m.fmt === 'currency') return `$${v.toFixed(2)}`;
  if (m.fmt === 'percent')  return `${v.toFixed(2)}%`;
  if (m.fmt === 'seconds')  return `${v.toFixed(1)}s`;
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v/1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
}

// ── Change Badge ──────────────────────────────────────────────────────────────
function ChangeBadge({ pct, metricKey }) {
  // For cost metrics, down is good
  const costMetrics = ['amountSpent','cpc','cpm','cpv'];
  const isCost = costMetrics.includes(metricKey);
  if (pct == null) return <span style={{ color:'var(--text-faint)' }}>—</span>;
  const isPositive = isCost ? pct < 0 : pct > 0;
  const color = pct === 0 ? 'var(--text-faint)' : isPositive ? '#16a34a' : '#ef4444';
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
  return (
    <span style={{ color, fontWeight:700, fontSize:13 }}>
      {arrow} {Math.abs(pct)}%
    </span>
  );
}

// ── Custom Tooltip for Chart ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, metric, p1Label, p2Label }) {
  if (!active || !payload?.length) return null;
  const m = ALL_METRICS.find(x => x.key === metric);
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <div style={{ fontWeight:700, marginBottom:6, color:'var(--text-primary)' }}>Day {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, marginBottom:2 }}>
          {i === 0 ? p1Label : p2Label}: <strong>{fmtVal(metric, p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampaignCompare() {
  const [campaigns,      setCampaigns]      = useState([]);
  const [campaignId,     setCampaignId]     = useState('');
  const [start1,         setStart1]         = useState('');
  const [end1,           setEnd1]           = useState('');
  const [start2,         setStart2]         = useState('');
  const [end2,           setEnd2]           = useState('');
  const [result,         setResult]         = useState(null);
  const [chartData,      setChartData]      = useState(null);
  const [chartMetric,    setChartMetric]    = useState('amountSpent');
  const [loading,        setLoading]        = useState(false);
  const [chartLoading,   setChartLoading]   = useState(false);
  const [error,          setError]          = useState('');

  // Load campaigns on mount
  useEffect(() => {
    campaignAPI.getAll().then(r => setCampaigns(r.data?.campaigns || r.data || [])).catch(() => {});
  }, []);

  const p1Label = start1 && end1 ? `${fmtDate(start1)} – ${fmtDate(end1)}` : 'Period A';
  const p2Label = start2 && end2 ? `${fmtDate(start2)} – ${fmtDate(end2)}` : 'Period B';

  const handleCompare = async () => {
    if (!campaignId) { setError('Please select a campaign.'); return; }
    if (!start1 || !end1 || !start2 || !end2) { setError('Please fill all date fields.'); return; }
    if (new Date(start1) > new Date(end1) || new Date(start2) > new Date(end2)) {
      setError('Start date must be before end date for each period.'); return;
    }
    setLoading(true); setError(''); setResult(null); setChartData(null);
    try {
      const r = await analyticsAPI.getCompare({ campaignId, start1, end1, start2, end2 });
      setResult(r.data);
      // Load chart data
      setChartLoading(true);
      const cr = await analyticsAPI.getCompareTimeseries({ campaignId, start1, end1, start2, end2, metric: chartMetric });
      setChartData(cr.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comparison data.');
    } finally {
      setLoading(false); setChartLoading(false);
    }
  };

  const handleChartMetricChange = async (metric) => {
    setChartMetric(metric);
    if (!result) return;
    setChartLoading(true);
    try {
      const cr = await analyticsAPI.getCompareTimeseries({ campaignId, start1, end1, start2, end2, metric });
      setChartData(cr.data);
    } catch {} finally { setChartLoading(false); }
  };

  const selectedCampaign = campaigns.find(c => c._id === campaignId);

  return (
    <div>
      {/* Campaign selector */}
      <div className="glass-card" style={{ padding:'20px 24px', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:10 }}>Select Campaign</div>
        <select value={campaignId} onChange={e => { setCampaignId(e.target.value); setResult(null); setChartData(null); }}
          className="form-input" style={{ width:'100%', fontSize:13 }}>
          <option value="">— Choose a campaign —</option>
          {campaigns.map(c => (
            <option key={c._id} value={c._id}>{c.name} ({c.status})</option>
          ))}
        </select>
        {selectedCampaign && (
          <div style={{ marginTop:8, display:'flex', gap:12, flexWrap:'wrap', fontSize:12, color:'var(--text-faint)' }}>
            <span>🎯 {selectedCampaign.objective}</span>
            <span>📅 {selectedCampaign.startDate ? fmtDate(selectedCampaign.startDate) : 'No start'} – {selectedCampaign.endDate ? fmtDate(selectedCampaign.endDate) : 'Ongoing'}</span>
            <span>💰 {selectedCampaign.currency} {(selectedCampaign.totalBudget||0).toLocaleString()} budget</span>
          </div>
        )}
      </div>

      {/* Period pickers */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {[
          { label:'Period A', color:'#7c3aed', start:start1, end:end1, setStart:setStart1, setEnd:setEnd1 },
          { label:'Period B', color:'#3b82f6', start:start2, end:end2, setStart:setStart2, setEnd:setEnd2 },
        ].map((p, i) => (
          <div key={i} className="glass-card" style={{ padding:'18px 20px', borderTop:`3px solid ${p.color}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:p.color, marginBottom:14 }}>{p.label}</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:120 }}>
                <label className="form-label">Start date</label>
                <input className="form-input" type="date" value={p.start} onChange={e => p.setStart(e.target.value)} />
              </div>
              <div style={{ flex:1, minWidth:120 }}>
                <label className="form-label">End date</label>
                <input className="form-input" type="date" value={p.end} onChange={e => p.setEnd(e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      <button className="btn-primary" onClick={handleCompare} disabled={loading}
        style={{ marginBottom:28, width:'100%', padding:'12px', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        {loading ? '⏳ Comparing...' : '⚡ Compare Periods'}
      </button>

      {/* Results */}
      {result && (
        <>
          {/* Chart */}
          <div className="glass-card" style={{ padding:'20px 24px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Performance Over Time</div>
              <select value={chartMetric} onChange={e => handleChartMetricChange(e.target.value)}
                className="form-input" style={{ width:'auto', fontSize:12 }}>
                {CHART_METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            {chartLoading ? (
              <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:13 }}>
                Loading chart...
              </div>
            ) : chartData?.chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData.chartData} margin={{ top:5, right:20, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:'var(--text-faint)' }} label={{ value:'Day', position:'insideBottom', offset:-2, fontSize:11, fill:'var(--text-faint)' }}/>
                  <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} width={55}
                    tickFormatter={v => fmtVal(chartMetric, v)} />
                  <Tooltip content={<CustomTooltip metric={chartMetric} p1Label={p1Label} p2Label={p2Label}/>} />
                  <Legend formatter={(value) => value === 'period1' ? p1Label : p2Label} />
                  <Line type="monotone" dataKey="period1" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="period1" connectNulls />
                  <Line type="monotone" dataKey="period2" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="period2" strokeDasharray="5 5" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:13 }}>
                No daily history data available for this campaign yet. Metrics will appear after the next sync.
              </div>
            )}

            <div style={{ display:'flex', gap:20, marginTop:10, justifyContent:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-faint)' }}>
                <div style={{ width:24, height:2.5, background:'#7c3aed', borderRadius:2 }}/>
                {p1Label}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-faint)' }}>
                <div style={{ width:24, height:2.5, background:'#3b82f6', borderRadius:2, borderTop:'2px dashed #3b82f6' }}/>
                {p2Label}
              </div>
            </div>
          </div>

          {/* Metrics table */}
          <div className="glass-card" style={{ padding:'20px 24px', overflowX:'auto' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>
              All Metrics — {selectedCampaign?.name}
            </div>

            {/* Group: Performance */}
            {['performance','video'].map(group => {
              const metrics = ALL_METRICS.filter(m => m.group === group);
              const hasData  = metrics.some(m => result.period1?.[m.key] || result.period2?.[m.key]);
              if (!hasData && group === 'video') return null;
              return (
                <div key={group} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'8px 0 6px', borderBottom:'1px solid var(--border-subtle)', marginBottom:4 }}>
                    {group === 'video' ? '🎬 Video Metrics' : '📊 Performance Metrics'}
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase' }}>Metric</th>
                        <th style={{ textAlign:'right', padding:'8px 12px', fontSize:11, fontWeight:700, color:'#7c3aed', textTransform:'uppercase' }}>{p1Label}</th>
                        <th style={{ textAlign:'right', padding:'8px 12px', fontSize:11, fontWeight:700, color:'#3b82f6', textTransform:'uppercase' }}>{p2Label}</th>
                        <th style={{ textAlign:'right', padding:'8px 12px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase' }}>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m, i) => {
                        const pct = result.changes?.[m.key];
                        return (
                          <tr key={m.key} style={{ background: i%2===0 ? 'var(--bg-elevated)' : 'transparent' }}>
                            <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--text-primary)' }}>{m.label}</td>
                            <td style={{ padding:'10px 12px', textAlign:'right', color:'var(--text-muted)' }}>{fmtVal(m.key, result.period1?.[m.key])}</td>
                            <td style={{ padding:'10px 12px', textAlign:'right', color:'var(--text-muted)' }}>{fmtVal(m.key, result.period2?.[m.key])}</td>
                            <td style={{ padding:'10px 12px', textAlign:'right' }}><ChangeBadge pct={pct} metricKey={m.key}/></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Reading guide */}
            <div style={{ marginTop:8, padding:'10px 14px', borderRadius:8, background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)', fontSize:12, color:'var(--text-faint)', lineHeight:1.6 }}>
              💡 <strong style={{ color:'var(--text-secondary)' }}>Reading the change column:</strong> For cost metrics (Spend, CPC, CPM), a decrease ↓ is good. For reach and engagement metrics, an increase ↑ is good. Color reflects whether the change is favourable for that metric type.
            </div>
          </div>
        </>
      )}
    </div>
  );
}