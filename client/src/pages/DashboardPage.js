import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import KPICards from '../components/dashboard/KPICards';
import KPIChart from '../components/dashboard/KPIChart';
import PlatformPerformanceChart from '../components/analytics/PlatformPerformanceChart';
import NotificationPanel from '../components/shared/NotificationPanel';
import { analyticsAPI } from '../utils/api';

const MOCK_KPI = { amountSpent:70800, impressions:6000, cpm:10.94, totalClicks:6200, ctr:1.64, cpc:0.33, conversions:12200, totalReach:4200000, addToCart:42100 };

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState('impressions');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const exportRef = useRef();

  useEffect(() => {
    analyticsAPI.getOverview()
      .then(res => setKpiData(res.data.kpis))
      .catch(() => setKpiData(MOCK_KPI))
      .finally(() => setLoading(false));
  }, []);

  const handleExportPDF = async () => {
    try {
      window.print();
    } catch(e) {
      alert('Use browser Print (Ctrl+P) and select "Save as PDF". Full PDF export with jsPDF coming soon.');
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of all active campaigns · {new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
          <NotificationPanel />
          <select className="form-input" value={period} onChange={e=>setPeriod(e.target.value)}
            style={{ width:'auto',padding:'8px 12px',fontSize:13 }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="btn-secondary" style={{ fontSize:13,padding:'8px 16px' }} onClick={handleExportPDF}>
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Quick stats banner */}
      <div style={{ padding:'16px 20px',borderRadius:12,marginBottom:24,background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.06))',border:'1px solid rgba(124,58,237,0.22)',display:'flex',gap:20,alignItems:'center',flexWrap:'wrap' }}>
        <div style={{ fontSize:24 }}>⚡</div>
        <div style={{ flex:1,minWidth:160 }}>
          <div style={{ fontSize:13,fontWeight:700,color:'var(--purple-light)',marginBottom:2 }}>5 Active Campaigns across 7 platforms</div>
          <div style={{ fontSize:12,color:'var(--text-muted)' }}>Meta is your top performer this week with +28% impressions growth</div>
        </div>
        <div style={{ display:'flex',gap:20,flexWrap:'wrap' }}>
          {[{label:'Active',value:'5',color:'#16a34a'},{label:'Paused',value:'2',color:'#d97706'},{label:'Draft',value:'3',color:'#6b7280'}].map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11,color:'var(--text-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI section label */}
      <div style={{ fontSize:11,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12 }}>
        Key Performance Indicators — Click to switch chart view
      </div>

      <KPICards data={loading ? {} : kpiData} selectedKPI={selectedKPI} onSelectKPI={setSelectedKPI} />

      <div style={{ marginTop:24,marginBottom:24 }}>
        <KPIChart selectedKPI={selectedKPI} />
      </div>

      <PlatformPerformanceChart />
    </Layout>
  );
}
