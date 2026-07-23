import React from 'react';
import { PlatformIcons } from '../../utils/platforms';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n, type = 'number') => {
  const v = Number(n || 0);
  if (type === 'currency') return `$${v.toFixed(4)}`;
  if (type === 'percent')  return `${v.toFixed(1)}%`;
  if (type === 'seconds')  return `${v.toFixed(1)}s`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

const PLATFORM_COLORS = {
  meta: '#1877F2', tiktok: '#010101', youtube: '#FF0000',
  google: '#4285F4', instagram: '#E1306C', snapchat: '#FFFC00',
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, type, sub, color = 'var(--purple-light)' }) {
  return (
    <div className="glass-card" style={{ padding:'16px 18px', flex:1, minWidth:140 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, marginBottom:2 }}>{fmt(value, type)}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{sub}</div>}
    </div>
  );
}

// ── Watch Depth Funnel ────────────────────────────────────────────────────────
function WatchFunnel({ funnel, totalViews }) {
  const steps = [
    { label: '3-Second Views', key: 'p3sec', color: '#7c3aed' },
    { label: '25% Watched',    key: 'p25',   color: '#a855f7' },
    { label: '50% Watched',    key: 'p50',   color: '#3b82f6' },
    { label: '75% Watched',    key: 'p75',   color: '#10b981' },
    { label: '100% Completed', key: 'p100',  color: '#f59e0b' },
  ];

  return (
    <div className="glass-card" style={{ padding:'20px 24px', marginBottom:20 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Watch Depth Funnel</div>
      <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:20 }}>
        Based on {fmt(totalViews)} total video views — shows where viewers drop off
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {steps.map((step, i) => {
          const pct = funnel?.[step.key] || 0;
          const prev = i === 0 ? 100 : (funnel?.[steps[i-1].key] || 0);
          const dropOff = i === 0 ? 0 : parseFloat((prev - pct).toFixed(1));
          return (
            <div key={step.key}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{step.label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {i > 0 && dropOff > 0 && (
                    <span style={{ fontSize:11, color:'#ef4444', fontWeight:600 }}>▼ {dropOff}% drop</span>
                  )}
                  <span style={{ fontSize:14, fontWeight:800, color: step.color, minWidth:50, textAlign:'right' }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height:10, borderRadius:5, background:'var(--bg-elevated)', overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:5,
                  width:`${Math.min(pct, 100)}%`,
                  background:`linear-gradient(90deg, ${step.color}cc, ${step.color})`,
                  transition:'width 0.6s ease',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-Platform Card ─────────────────────────────────────────────────────────
function PlatformVideoCard({ stat }) {
  const Icon  = PlatformIcons[stat.platform];
  const color = PLATFORM_COLORS[stat.platform] || 'var(--purple-light)';

  return (
    <div className="glass-card" style={{ padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        {Icon && <Icon size={20}/>}
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{stat.platform}</span>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-faint)' }}>{stat.campaigns} campaign{stat.campaigns !== 1 ? 's' : ''}</span>
      </div>

      {/* Mini funnel bars */}
      <div style={{ marginBottom:16 }}>
        {[
          { label:'3s',  pct: stat.funnel?.p3sec || 0, color:'#7c3aed' },
          { label:'25%', pct: stat.funnel?.p25   || 0, color:'#a855f7' },
          { label:'50%', pct: stat.funnel?.p50   || 0, color:'#3b82f6' },
          { label:'75%', pct: stat.funnel?.p75   || 0, color:'#10b981' },
          { label:'100%',pct: stat.funnel?.p100  || 0, color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <span style={{ fontSize:10, color:'var(--text-faint)', width:28, flexShrink:0 }}>{s.label}</span>
            <div style={{ flex:1, height:6, borderRadius:3, background:'var(--bg-elevated)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, width:`${s.pct}%`, background:s.color }}/>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:s.color, width:38, textAlign:'right' }}>{s.pct}%</span>
          </div>
        ))}
      </div>

      {/* Key stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { label:'Views',       value: fmt(stat.videoViews)              },
          { label:'Avg Watch',   value: fmt(stat.avgWatchTime, 'seconds') },
          { label:'CPV',         value: fmt(stat.cpv, 'currency')         },
          { label:'Completion',  value: fmt(stat.completionRate, 'percent')},
          { label:'ThruPlays',   value: fmt(stat.thruPlays)               },
          { label:'View Rate',   value: fmt(stat.videoViewRate, 'percent') },
        ].map(s => (
          <div key={s.label} style={{ padding:'8px 10px', borderRadius:8, background:'var(--bg-elevated)' }}>
            <div style={{ fontSize:10, color:'var(--text-faint)', fontWeight:600, marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🎬</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>No Video Data Yet</div>
      <div style={{ fontSize:13, color:'var(--text-faint)', maxWidth:360, margin:'0 auto', lineHeight:1.6 }}>
        Video metrics will appear here once your connected platforms sync campaigns with video creatives.
        Make sure you have active video ad campaigns on Meta, TikTok, or YouTube.
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VideoAnalytics({ data, loading, period, onPeriodChange }) {
  const periodOptions = [
    { value:'7d', label:'Last 7 days' },
    { value:'30d', label:'Last 30 days' },
    { value:'90d', label:'Last 90 days' },
  ];

  if (loading) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-faint)' }}>
      Loading video analytics...
    </div>
  );

  const hasData = data?.totals?.videoViews > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Video Performance</div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>Watch depth, completion rates & engagement across platforms</div>
        </div>
        <select value={period} onChange={e => onPeriodChange(e.target.value)}
          className="form-input" style={{ width:'auto', fontSize:13 }}>
          {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {!hasData ? <EmptyState /> : (
        <>
          {/* Top KPI row */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
            <KPICard label="Total Video Views"  value={data.totals.videoViews}     color="#7c3aed" />
            <KPICard label="3-Second Views"     value={data.totals.video3SecViews} color="#a855f7" />
            <KPICard label="ThruPlays"          value={data.totals.thruPlays}      color="#3b82f6" />
            <KPICard label="Avg Watch Time"     value={data.totals.avgWatchTime}   type="seconds" color="#10b981" />
            <KPICard label="Cost Per View"      value={data.totals.cpv}            type="currency" color="#f59e0b" />
            <KPICard label="Completion Rate"    value={data.totals.completionRate} type="percent"  color="#ef4444"
              sub={`${fmt(data.totals.videoP100)} viewers watched to end`}/>
          </div>

          {/* Watch Depth Funnel */}
          <WatchFunnel funnel={data.funnel} totalViews={data.totals.videoViews}/>

          {/* Per-platform breakdown */}
          {data.byPlatform?.length > 0 && (
            <>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:12 }}>
                By Platform
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
                {data.byPlatform.map(stat => (
                  <PlatformVideoCard key={stat.platform} stat={stat}/>
                ))}
              </div>
            </>
          )}

          {/* Tips */}
          <div className="glass-card" style={{ padding:'18px 20px', marginTop:20, borderLeft:'3px solid var(--purple-primary)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:10 }}>💡 How to read this</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                '3-Second Views filter out accidental plays — this is the standard "view" metric across platforms.',
                'A healthy completion rate is 25–40%. Below 15% means your hook (first 3 seconds) needs work.',
                'High drop-off between 25% and 50% usually means the value proposition isn\'t clear early enough.',
                'CPV (Cost Per View) under $0.05 is strong for Meta/TikTok. Above $0.15 suggests targeting issues.',
              ].map((tip, i) => (
                <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>
                  <span style={{ color:'var(--purple-light)', flexShrink:0 }}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}