import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import KPICards from '../components/dashboard/KPICards';
import KPIChart from '../components/dashboard/KPIChart';
import PlatformPerformanceChart from '../components/analytics/PlatformPerformanceChart';
import NotificationPanel from '../components/shared/NotificationPanel';
import { analyticsAPI } from '../utils/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpiData, setKpiData]       = useState(null);
  const [selectedKPI, setSelectedKPI] = useState('impressions');
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState('30d');
  const [hasData, setHasData]       = useState(false);

  useEffect(() => {
    analyticsAPI.getOverview()
      .then(res => {
        const kpis = res.data.kpis;
        // Only show data if there is actual spend or impressions
        const realData = kpis && (kpis.impressions > 0 || kpis.amountSpent > 0);
        setHasData(realData);
        setKpiData(realData ? kpis : null);
      })
      .catch(() => {
        setHasData(false);
        setKpiData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <NotificationPanel />
          <select
            className="form-input"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ width:'auto', padding:'8px 12px', fontSize:13 }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="btn-secondary" style={{ fontSize:13 }} onClick={() => window.print()}>
            📄 Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
            {[1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className="skeleton" style={{ height:100, borderRadius:16 }}/>
            ))}
          </div>
          <div className="skeleton" style={{ height:300, borderRadius:16 }}/>
          <div className="skeleton" style={{ height:280, borderRadius:16 }}/>
        </div>

      ) : !hasData ? (
        /* Empty state — no campaigns yet */
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Welcome banner */}
          <div style={{
            padding:'28px 32px', borderRadius:16,
            background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.06))',
            border:'1px solid rgba(124,58,237,0.2)',
            display:'flex', gap:20, alignItems:'center', flexWrap:'wrap'
          }}>
            <div style={{ fontSize:48 }}>⚡</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>
                Welcome to AdsPulse!
              </div>
              <div style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.7 }}>
                Your dashboard is ready. Create your first campaign or connect a platform to start seeing real data here.
              </div>
            </div>
          </div>

          {/* Quick action cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
            {[
              {
                icon: '📣',
                title: 'Create a Campaign',
                desc: 'Launch ads across Meta, Google, TikTok and more from one place.',
                action: 'New Campaign',
                path: '/campaigns/new',
                color: '#7c3aed'
              },
              {
                icon: '🔌',
                title: 'Connect a Platform',
                desc: 'Link your Meta, Google or TikTok ad account to sync real data.',
                action: 'Connect Now',
                path: '/connect',
                color: '#3b82f6'
              },
              {
                icon: '📥',
                title: 'Import Existing Data',
                desc: 'Already running ads? Import your campaigns and metrics.',
                action: 'Go to Integrations',
                path: '/connect',
                color: '#10b981'
              },
            ].map(card => (
              <div key={card.title} className="glass-card" style={{ padding:24 }}>
                <div style={{ fontSize:36, marginBottom:14 }}>{card.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
                  {card.title}
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, marginBottom:18 }}>
                  {card.desc}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate(card.path)}
                  style={{ fontSize:12, padding:'8px 16px', background:`linear-gradient(135deg,${card.color},${card.color}cc)` }}
                >
                  {card.action} →
                </button>
              </div>
            ))}
          </div>

          {/* Empty KPI grid placeholder */}
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
              Key Performance Indicators — Will populate once you have active campaigns
            </div>
            <div className="kpi-grid">
              {['Amount Spent','Impressions','CPM','Total Clicks','CTR','CPC','Conversions','Total Reach','Add to Cart'].map(label => (
                <div key={label} className="glass-card" style={{ padding:'18px 20px', opacity:0.5 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'var(--bg-elevated)', marginBottom:10 }}/>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--text-muted)', marginBottom:4 }}>—</div>
                  <div style={{ fontSize:12, color:'var(--text-faint)', fontWeight:600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty chart placeholder */}
          <div className="glass-card" style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Performance Over Time</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Data will appear once you have active campaigns</div>
              </div>
            </div>
            <div style={{
              height:260, borderRadius:12,
              background:'var(--bg-elevated)',
              border:'2px dashed var(--border-subtle)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12
            }}>
              <div style={{ fontSize:40 }}>📊</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>No data yet</div>
              <div style={{ fontSize:12, color:'var(--text-faint)', textAlign:'center', maxWidth:280 }}>
                Create a campaign and connect a platform to see your performance charts here
              </div>
              <button className="btn-primary" onClick={() => navigate('/campaigns/new')} style={{ fontSize:12, marginTop:4 }}>
                + Create First Campaign
              </button>
            </div>
          </div>
        </div>

      ) : (
        /* Real data view */
        <div>
          {/* Active campaigns banner */}
          <div style={{
            padding:'14px 20px', borderRadius:12, marginBottom:24,
            background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.06))',
            border:'1px solid rgba(124,58,237,0.2)',
            display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'
          }}>
            <div style={{ fontSize:20 }}>⚡</div>
            <div style={{ flex:1, fontSize:13, color:'var(--text-muted)' }}>
              Showing real data from your connected platforms
            </div>
            <div style={{ display:'flex', gap:20 }}>
              {[
                { label:'Active',    value: kpiData?._activeCampaigns    || '—', color:'#16a34a' },
                { label:'Paused',    value: kpiData?._pausedCampaigns    || '—', color:'#d97706' },
                { label:'Platforms', value: kpiData?._connectedPlatforms || '—', color:'#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            Key Performance Indicators — Click any card to update the chart
          </div>

          <KPICards
            data={kpiData}
            selectedKPI={selectedKPI}
            onSelectKPI={setSelectedKPI}
          />

          <div style={{ marginTop:24, marginBottom:24 }}>
            <KPIChart selectedKPI={selectedKPI} period={period} />
          </div>

          <PlatformPerformanceChart />
        </div>
      )}
    </Layout>
  );
}
