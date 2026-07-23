import React, { useState } from 'react';
import Layout from '../components/shared/Layout';
import api from '../utils/api';
import {
  AlertCircle, AlertTriangle, Analytics, CheckCircle, ChevronDown,
  ChevronUp, DollarSign, Info, Refresh, Target, TrendingDown, TrendingUp
} from '../components/shared/Icons';

const TYPE_STYLES = {
  critical: { bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.3)',   icon: AlertCircle,   color:'#ef4444' },
  warning:  { bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  icon: AlertTriangle, color:'#f59e0b' },
  success:  { bg:'rgba(22,163,74,0.1)',   border:'rgba(22,163,74,0.3)',   icon: CheckCircle,   color:'#16a34a' },
  tip:      { bg:'rgba(124,58,237,0.1)',  border:'rgba(124,58,237,0.3)', icon: Info,          color:'#7c3aed' },
};

const PLATFORM_COLORS = {
  meta: '#1877F2', google: '#4285F4', tiktok: '#010101',
  linkedin: '#0A66C2', twitter: '#1DA1F2', snapchat: '#FFFC00',
  youtube: '#FF0000', general: '#7c3aed',
};

function InsightCard({ insight }) {
  const style   = TYPE_STYLES[insight.type] || TYPE_STYLES.tip;
  const TypeIcon = style.icon;
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderRadius:12, border:`1px solid ${style.border}`, background:style.bg, overflow:'hidden', transition:'all 0.2s' }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ color:style.color, flexShrink:0, marginTop:1 }}><TypeIcon size={18}/></span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            {insight.platform && insight.platform !== 'general' && (
              <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20, background:PLATFORM_COLORS[insight.platform]+'22', color:PLATFORM_COLORS[insight.platform], textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {insight.platform}
              </span>
            )}
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{insight.title}</span>
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{insight.detail}</div>
        </div>
        <span style={{ color:'var(--text-faint)', flexShrink:0 }}>
          {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </span>
      </div>
      {open && (
        <div style={{ padding:'0 20px 16px 50px' }}>
          <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.15)', fontSize:13, color:'var(--text-primary)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--purple-light)' }}>→ Recommended action: </strong>{insight.action}
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetBar({ platform, currentPercent, recommendedPercent, change, reasoning }) {
  const isIncrease = change?.startsWith('+');
  const isDecrease = change?.startsWith('-');
  const color = PLATFORM_COLORS[platform] || '#7c3aed';

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{platform}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--text-faint)' }}>Current: {currentPercent}%</span>
          <span style={{ fontSize:12, fontWeight:700, color: isIncrease ? '#16a34a' : isDecrease ? '#ef4444' : 'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}>
            {isIncrease ? <TrendingUp size={12}/> : isDecrease ? <TrendingDown size={12}/> : null}
            {change} → {recommendedPercent}%
          </span>
        </div>
      </div>
      {/* Current bar */}
      <div style={{ height:8, borderRadius:4, background:'var(--bg-elevated)', marginBottom:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${currentPercent}%`, background:`${color}66`, borderRadius:4, transition:'width 0.5s' }}/>
      </div>
      {/* Recommended bar */}
      <div style={{ height:8, borderRadius:4, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${recommendedPercent}%`, background:color, borderRadius:4, transition:'width 0.5s' }}/>
      </div>
      <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4, lineHeight:1.5 }}>{reasoning}</div>
    </div>
  );
}

export default function InsightsPage() {
  const [perfData,   setPerfData]   = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [perfLoading,   setPerfLoading]   = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [perfError,   setPerfError]   = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [activeTab, setActiveTab] = useState('performance');

  const runPerformanceAnalysis = async () => {
    setPerfLoading(true); setPerfError(''); setPerfData(null);
    try {
      const res = await api.post('/insights/performance');
      setPerfData(res.data);
    } catch (err) {
      setPerfError(err.response?.data?.message || err.message);
    } finally { setPerfLoading(false); }
  };

  const runBudgetOptimizer = async () => {
    setBudgetLoading(true); setBudgetError(''); setBudgetData(null);
    try {
      const res = await api.post('/insights/budget-optimizer');
      setBudgetData(res.data);
    } catch (err) {
      setBudgetError(err.response?.data?.message || err.message);
    } finally { setBudgetLoading(false); }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="page-subtitle">AI-powered analysis of your campaign performance and budget allocation</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          { key:'performance', label:'Performance Insights', icon: Analytics },
          { key:'budget',      label:'Budget Optimizer',     icon: DollarSign },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:7,
              background: activeTab===tab.key ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
              color:      activeTab===tab.key ? 'white' : 'var(--text-faint)',
              transition: 'all 0.2s' }}>
            <tab.icon size={14}/> {tab.label}
          </button>
        ))}
      </div>

      {/* ── PERFORMANCE INSIGHTS TAB ── */}
      {activeTab === 'performance' && (
        <div style={{ maxWidth:860 }}>
          {/* Info card */}
          <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
            <Analytics size={18} style={{ color:'var(--purple-light)', flexShrink:0, marginTop:1 }}/>
            <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--text-primary)' }}>How it works:</strong> Claude AI analyzes your campaign KPIs (CPM, CPC, CTR, CPA) across all platforms and compares them against industry benchmarks. It identifies what's working, what's underperforming, and gives you specific actions to take.
            </div>
          </div>

          {/* Run button */}
          {!perfData && !perfLoading && (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'white' }}>
                <Analytics size={32}/>
              </div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>Ready to analyze your campaigns</h3>
              <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px' }}>Claude will review all your campaign data and surface actionable insights</p>
              <button className="btn-primary" onClick={runPerformanceAnalysis} style={{ padding:'12px 32px', fontSize:15, display:'inline-flex', alignItems:'center', gap:8 }}>
                <Analytics size={16}/> Run Performance Analysis
              </button>
              {perfError && (
                <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                  {perfError}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {perfLoading && (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <div style={{ width:48, height:48, border:'4px solid rgba(124,58,237,0.2)', borderTop:'4px solid #7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:15, color:'var(--text-muted)' }}>Claude is analyzing your campaigns...</div>
              <div style={{ fontSize:13, color:'var(--text-faint)', marginTop:6 }}>This usually takes 5–10 seconds</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Results */}
          {perfData && !perfLoading && (
            <div>
              {/* Summary */}
              <div style={{ padding:'18px 20px', borderRadius:12, background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(168,85,247,0.05))', border:'1px solid rgba(124,58,237,0.2)', marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--purple-light)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>AI Summary</div>
                <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7 }}>{perfData.summary}</div>
              </div>

              {/* Top Priority */}
              {perfData.topPriority && (
                <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
                  <Target size={16} style={{ color:'#ef4444', flexShrink:0, marginTop:2 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#ef4444', marginBottom:3 }}>TOP PRIORITY</div>
                    <div style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5 }}>{perfData.topPriority}</div>
                  </div>
                </div>
              )}

              {/* Insights list */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {(perfData.insights || []).map((insight, i) => (
                  <InsightCard key={i} insight={insight}/>
                ))}
              </div>

              {/* Re-run button */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                  Generated {new Date(perfData.generatedAt).toLocaleString()}
                </div>
                <button className="btn-secondary" onClick={runPerformanceAnalysis} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  <Refresh size={14}/> Re-analyze
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BUDGET OPTIMIZER TAB ── */}
      {activeTab === 'budget' && (
        <div style={{ maxWidth:860 }}>
          {/* Info card */}
          <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
            <DollarSign size={18} style={{ color:'var(--purple-light)', flexShrink:0, marginTop:1 }}/>
            <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--text-primary)' }}>How it works:</strong> Claude compares your spend, CPC, CTR, and conversions across platforms and recommends exactly how to redistribute your budget to maximize ROI — with specific percentages and reasoning.
            </div>
          </div>

          {/* Run button */}
          {!budgetData && !budgetLoading && (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#16a34a,#15803d)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'white' }}>
                <DollarSign size={32}/>
              </div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>Optimize your budget allocation</h3>
              <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px' }}>Requires data from at least 2 platforms to compare performance</p>
              <button className="btn-primary" onClick={runBudgetOptimizer} style={{ padding:'12px 32px', fontSize:15, display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#16a34a,#15803d)' }}>
                <DollarSign size={16}/> Run Budget Optimizer
              </button>
              {budgetError && (
                <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                  {budgetError}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {budgetLoading && (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <div style={{ width:48, height:48, border:'4px solid rgba(22,163,74,0.2)', borderTop:'4px solid #16a34a', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:15, color:'var(--text-muted)' }}>Claude is optimizing your budget...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Results */}
          {budgetData && !budgetLoading && (
            <div>
              {/* Summary */}
              <div style={{ padding:'18px 20px', borderRadius:12, background:'linear-gradient(135deg,rgba(22,163,74,0.1),rgba(22,163,74,0.05))', border:'1px solid rgba(22,163,74,0.2)', marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Budget Assessment</div>
                <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7 }}>{budgetData.summary}</div>
              </div>

              {/* Budget allocation bars */}
              <div className="glass-card" style={{ padding:24, marginBottom:20 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 6px' }}>Recommended Reallocation</h3>
                <div style={{ display:'flex', gap:16, marginBottom:20, fontSize:12, color:'var(--text-faint)' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:12, height:6, borderRadius:3, background:'rgba(124,58,237,0.4)' }}/> Current</span>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:12, height:6, borderRadius:3, background:'#7c3aed' }}/> Recommended</span>
                </div>
                {(budgetData.recommendedAllocation || []).map((item, i) => {
                  const current = (budgetData.currentAllocation || []).find(c => c.platform === item.platform);
                  return (
                    <BudgetBar key={i}
                      platform={item.platform}
                      currentPercent={current?.currentPercent || 0}
                      recommendedPercent={item.recommendedPercent}
                      change={item.change}
                      reasoning={item.reasoning}
                    />
                  );
                })}
              </div>

              {/* Projected impact */}
              {budgetData.projectedImpact && (
                <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.25)', marginBottom:20, display:'flex', gap:10 }}>
                  <TrendingUp size={16} style={{ color:'#16a34a', flexShrink:0, marginTop:2 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#16a34a', marginBottom:3 }}>PROJECTED IMPACT</div>
                    <div style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5 }}>{budgetData.projectedImpact}</div>
                  </div>
                </div>
              )}

              {/* Quick wins */}
              {budgetData.quickWins?.length > 0 && (
                <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 12px' }}>Quick Wins</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {budgetData.quickWins.map((win, i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(124,58,237,0.15)', color:'var(--purple-light)', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                        <span style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{win}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {budgetData.warning && (
                <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', display:'flex', gap:8, marginBottom:20 }}>
                  <AlertTriangle size={14} style={{ color:'#f59e0b', flexShrink:0, marginTop:2 }}/>
                  <span style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{budgetData.warning}</span>
                </div>
              )}

              {/* Re-run */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                  Generated {new Date(budgetData.generatedAt).toLocaleString()}
                </div>
                <button className="btn-secondary" onClick={runBudgetOptimizer} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  <Refresh size={14}/> Re-optimize
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}