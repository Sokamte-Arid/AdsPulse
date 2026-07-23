import React, { useState, useEffect } from 'react';
import { campaignAPI } from '../../utils/api';
import { PlatformIcons } from '../../utils/platforms';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Close, TrendingUp, TrendingDown } from './Icons';

const METRICS = [
  { key:'amountSpent',  label:'Amount Spent',  format:'currency', higherIsBetter:false },
  { key:'impressions',  label:'Impressions',   format:'number',   higherIsBetter:true  },
  { key:'totalClicks',  label:'Clicks',        format:'number',   higherIsBetter:true  },
  { key:'ctr',          label:'CTR',           format:'percent',  higherIsBetter:true  },
  { key:'cpm',          label:'CPM',           format:'currency', higherIsBetter:false },
  { key:'cpc',          label:'CPC',           format:'currency', higherIsBetter:false },
  { key:'conversions',  label:'Conversions',   format:'number',   higherIsBetter:true  },
  { key:'totalReach',   label:'Reach',         format:'number',   higherIsBetter:true  },
];

const COLORS = ['#7c3aed','#f59e0b','#16a34a','#3b82f6','#ef4444'];

function fmt(val, format) {
  if (val === null || val === undefined) return '—';
  if (format === 'currency') return `$${Number(val).toFixed(2)}`;
  if (format === 'percent')  return `${Number(val).toFixed(2)}%`;
  if (Number(val) >= 1000000) return `${(val/1000000).toFixed(1)}M`;
  if (Number(val) >= 1000)    return `${(val/1000).toFixed(1)}K`;
  return String(Number(val).toFixed(0));
}

function getMetrics(campaign) {
  const totals = {};
  METRICS.forEach(m => totals[m.key] = 0);
  (campaign.platforms || []).forEach(p => {
    const metrics = p.metrics || {};
    METRICS.forEach(m => { totals[m.key] += metrics[m.key] || 0; });
  });
  return totals;
}

function pctChange(a, b) {
  if (!a || a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

export default function CompareModal({ onClose }) {
  const [campaigns,    setCampaigns]    = useState([]);
  const [selected,     setSelected]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeChart,  setActiveChart]  = useState('bar');
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    campaignAPI.getAll({ limit: 200 })
      .then(r => setCampaigns(r.data?.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleCampaign = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const selectedCampaigns = campaigns.filter(c => selected.includes(c._id));
  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Build comparison data
  const comparisonData = selectedCampaigns.map((c, i) => ({
    campaign: c,
    metrics:  getMetrics(c),
    color:    COLORS[i % COLORS.length],
  }));

  // Bar chart data — one bar per metric per campaign
  const barData = METRICS.map(m => {
    const row = { metric: m.label };
    comparisonData.forEach(cd => {
      row[cd.campaign.name] = cd.metrics[m.key] || 0;
    });
    return row;
  });

  // Radar chart data
  const radarData = METRICS.map(m => {
    const row = { metric: m.label };
    // Normalize values 0-100
    const values = comparisonData.map(cd => cd.metrics[m.key] || 0);
    const maxVal = Math.max(...values, 1);
    comparisonData.forEach(cd => {
      row[cd.campaign.name] = Math.round(((cd.metrics[m.key] || 0) / maxVal) * 100);
    });
    return row;
  });

  const statusColor = { active:'#16a34a', paused:'#d97706', draft:'#6b7280', completed:'#3b82f6' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
      <div className="glass-card" style={{ width:'100%', maxWidth:1000, maxHeight:'94vh', display:'flex', flexDirection:'column', borderRadius:20, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>⚖️ Campaign Comparison</div>
            <div style={{ fontSize:12, color:'var(--text-faint)' }}>Select up to 5 campaigns to compare side by side</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex' }}>
            <Close size={20}/>
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', flex:1, overflow:'hidden' }}>

          {/* Left: Campaign selector */}
          <div style={{ borderRight:'1px solid var(--border-subtle)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-subtle)' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:12, fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>
                {selected.length}/5 selected
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading ? (
                <div style={{ padding:16 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:60, borderRadius:8, marginBottom:8 }}/>)}
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>No campaigns found</div>
              ) : (
                filteredCampaigns.map((c, i) => {
                  const isSelected = selected.includes(c._id);
                  const selIdx     = selected.indexOf(c._id);
                  const color      = isSelected ? COLORS[selIdx % COLORS.length] : null;
                  const metrics    = getMetrics(c);
                  return (
                    <div key={c._id} onClick={() => toggleCampaign(c._id)}
                      style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--border-subtle)', background: isSelected ? `${color}12` : 'transparent', borderLeft:`3px solid ${isSelected ? color : 'transparent'}`, transition:'all 0.15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        {isSelected && (
                          <div style={{ width:18, height:18, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white', flexShrink:0 }}>
                            {selIdx + 1}
                          </div>
                        )}
                        <div style={{ fontSize:13, fontWeight:isSelected?700:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                          {c.name}
                        </div>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:statusColor[c.status]||'#6b7280', flexShrink:0 }}/>
                      </div>
                      <div style={{ display:'flex', gap:8, fontSize:10, color:'var(--text-faint)', flexWrap:'wrap' }}>
                        <span>${(metrics.amountSpent||0).toFixed(0)} spent</span>
                        <span>·</span>
                        <span>{(metrics.impressions||0).toLocaleString()} impr</span>
                        <span>·</span>
                        <span style={{ textTransform:'capitalize' }}>{c.status}</span>
                      </div>
                      {/* Platform icons */}
                      <div style={{ display:'flex', gap:4, marginTop:4 }}>
                        {(c.platforms||[]).map(p => {
                          const Icon = PlatformIcons[p.platform];
                          return Icon ? <Icon key={p.platform} size={12}/> : null;
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Comparison results */}
          <div style={{ overflowY:'auto', padding:20 }}>
            {selected.length < 2 ? (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', gap:12 }}>
                <div style={{ fontSize:48 }}>⚖️</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-muted)' }}>Select at least 2 campaigns</div>
                <div style={{ fontSize:13, textAlign:'center', maxWidth:280 }}>
                  Choose campaigns from the left panel to see a side-by-side comparison of their performance
                </div>
              </div>
            ) : (
              <>
                {/* Campaign color legend */}
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
                  {comparisonData.map(cd => (
                    <div key={cd.campaign._id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:`${cd.color}15`, border:`1px solid ${cd.color}40` }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:cd.color }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{cd.campaign.name}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics comparison table */}
                <div className="glass-card" style={{ padding:0, overflow:'hidden', marginBottom:20 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'var(--bg-elevated)' }}>
                        <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Metric</th>
                        {comparisonData.map(cd => (
                          <th key={cd.campaign._id} style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:cd.color, textTransform:'uppercase', letterSpacing:'0.06em', maxWidth:120 }}>
                            <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cd.campaign.name}</div>
                          </th>
                        ))}
                        {comparisonData.length === 2 && (
                          <th style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>vs</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {METRICS.map((m, i) => {
                        const values = comparisonData.map(cd => cd.metrics[m.key] || 0);
                        const maxVal = Math.max(...values);
                        const change = comparisonData.length === 2 ? pctChange(values[0], values[1]) : null;
                        const isGood = change !== null && (m.higherIsBetter ? change > 0 : change < 0);
                        const isBad  = change !== null && (m.higherIsBetter ? change < 0 : change > 0);
                        return (
                          <tr key={m.key} style={{ borderTop:'1px solid var(--border-subtle)', background: i%2===0?'transparent':'var(--bg-elevated)' }}>
                            <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text-muted)' }}>{m.label}</td>
                            {comparisonData.map(cd => {
                              const val     = cd.metrics[m.key] || 0;
                              const isMax   = val === maxVal && maxVal > 0;
                              return (
                                <td key={cd.campaign._id} style={{ padding:'10px 14px', textAlign:'right', fontWeight: isMax ? 800 : 500, color: isMax ? cd.color : 'var(--text-primary)' }}>
                                  {fmt(val, m.format)}
                                  {isMax && comparisonData.length > 1 && <span style={{ fontSize:10, marginLeft:4 }}>🏆</span>}
                                </td>
                              );
                            })}
                            {change !== null && (
                              <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color: isGood?'#16a34a':isBad?'#ef4444':'var(--text-faint)', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:3 }}>
                                {isGood ? <TrendingUp size={12}/> : isBad ? <TrendingDown size={12}/> : null}
                                {change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : '—'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Chart toggle */}
                <div style={{ display:'flex', gap:4, marginBottom:16, background:'var(--bg-elevated)', borderRadius:10, padding:4, width:'fit-content' }}>
                  {[
                    { id:'bar',   label:'Bar Chart'   },
                    { id:'radar', label:'Radar Chart'  },
                  ].map(c => (
                    <button key={c.id} onClick={() => setActiveChart(c.id)}
                      style={{ padding:'6px 14px', borderRadius:7, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                        background: activeChart===c.id ? 'var(--bg-card)' : 'transparent',
                        color: activeChart===c.id ? 'var(--text-primary)' : 'var(--text-faint)',
                        boxShadow: activeChart===c.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Metric selector for bar chart */}
                {activeChart === 'bar' && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                    {METRICS.map(m => (
                      <button key={m.key} onClick={() => setActiveMetric(m.key)}
                        style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${activeMetric===m.key?'var(--purple-primary)':'var(--border-subtle)'}`, background:activeMetric===m.key?'rgba(124,58,237,0.12)':'transparent', color:activeMetric===m.key?'var(--purple-light)':'var(--text-muted)', fontSize:11, fontWeight:activeMetric===m.key?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Charts */}
                <div className="glass-card" style={{ padding:20 }}>
                  {activeChart === 'bar' ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>
                        {METRICS.find(m=>m.key===activeMetric)?.label} — Campaign Comparison
                      </div>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={[{ metric: METRICS.find(m=>m.key===activeMetric)?.label, ...Object.fromEntries(comparisonData.map(cd => [cd.campaign.name, cd.metrics[activeMetric]||0])) }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                          <XAxis dataKey="metric" tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}/>
                          <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}
                            tickFormatter={v => fmt(v, METRICS.find(m=>m.key===activeMetric)?.format)}/>
                          <Tooltip formatter={(v, n) => [fmt(v, METRICS.find(m=>m.key===activeMetric)?.format), n]}
                            contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }}/>
                          <Legend wrapperStyle={{ fontSize:12 }}/>
                          {comparisonData.map(cd => (
                            <Bar key={cd.campaign._id} dataKey={cd.campaign.name} fill={cd.color} radius={[6,6,0,0]}/>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Performance Radar (normalized 0-100)</div>
                      <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:14 }}>Values normalized relative to the best performer in each metric</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border-subtle)"/>
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize:11, fill:'var(--text-faint)' }}/>
                          {comparisonData.map(cd => (
                            <Radar key={cd.campaign._id} name={cd.campaign.name} dataKey={cd.campaign.name}
                              stroke={cd.color} fill={cd.color} fillOpacity={0.1} strokeWidth={2}/>
                          ))}
                          <Legend wrapperStyle={{ fontSize:12 }}/>
                          <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>

                {/* Winner summary (only for 2 campaigns) */}
                {comparisonData.length === 2 && (
                  <div className="glass-card" style={{ padding:16, marginTop:16 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:12 }}>🏆 Head-to-Head Summary</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[0,1].map(idx => {
                        const cd = comparisonData[idx];
                        const wins = METRICS.filter(m => {
                          const a = comparisonData[0].metrics[m.key]||0;
                          const b = comparisonData[1].metrics[m.key]||0;
                          return idx === 0 ? (m.higherIsBetter ? a >= b : a <= b) : (m.higherIsBetter ? b >= a : b <= a);
                        }).length;
                        return (
                          <div key={idx} style={{ padding:'14px 16px', borderRadius:10, background:`${cd.color}10`, border:`1px solid ${cd.color}30`, textAlign:'center' }}>
                            <div style={{ fontSize:22, fontWeight:800, color:cd.color }}>{wins}</div>
                            <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:4 }}>metrics won</div>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cd.campaign.name}</div>
                            {wins > METRICS.length / 2 && <div style={{ fontSize:11, color:cd.color, fontWeight:700, marginTop:4 }}>🏆 Overall Winner</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}