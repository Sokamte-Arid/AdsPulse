import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import api from '../utils/api';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Bolt, Check, Close, Edit, Plus, Refresh, Rocket, Target, Trash, Upload } from '../components/shared/Icons';

const VARIATION_COLORS = ['#7c3aed','#f59e0b','#16a34a','#3b82f6'];
const VARIATION_NAMES  = ['A','B','C','D'];

const STATUS_STYLES = {
  draft:     { color:'#6b7280', bg:'rgba(107,114,128,0.1)', label:'Draft'     },
  active:    { color:'#16a34a', bg:'rgba(22,163,74,0.1)',   label:'Active'    },
  paused:    { color:'#d97706', bg:'rgba(217,119,6,0.1)',   label:'Paused'    },
  completed: { color:'#3b82f6', bg:'rgba(59,130,246,0.1)', label:'Completed' },
  cancelled: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   label:'Cancelled' },
};

const OBJECTIVES = ['awareness','reach','traffic','engagement','lead_generation','conversions','app_installs','video_views'];
const CTAS       = ['Learn More','Shop Now','Sign Up','Contact Us','Download','Watch More','Book Now','Get Offer'];

// ── Empty variation template ──────────────────────────────────────────────────
const emptyVariation = (index) => ({
  name:         `Variation ${VARIATION_NAMES[index]}`,
  label:        '',
  headline:     '',
  description:  '',
  callToAction: 'Learn More',
  imageUrl:     '',
  videoUrl:     '',
  budgetPercent: 25,
  impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0, ctr: 0, cpc: 0,
  status: 'active',
});

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepBar({ step, steps }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, transition:'all 0.2s',
              background: i < step ? '#16a34a' : i === step ? 'var(--purple-primary)' : 'var(--bg-elevated)',
              color: i <= step ? 'white' : 'var(--text-faint)',
              border: i === step ? '2px solid var(--purple-primary)' : '2px solid transparent' }}>
              {i < step ? <Check size={14}/> : i + 1}
            </div>
            <div style={{ fontSize:10, fontWeight:600, color: i === step ? 'var(--purple-light)' : 'var(--text-faint)', whiteSpace:'nowrap' }}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:2, background: i < step ? '#16a34a' : 'var(--border-subtle)', margin:'0 4px', marginBottom:18, transition:'background 0.3s' }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Variation Card (editor) ───────────────────────────────────────────────────
function VariationEditor({ variation, index, onChange, onRemove, canRemove, totalBudget, splitType }) {
  const color   = VARIATION_COLORS[index];
  const fileRef = useRef();

  const handleImageUpload = async (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onChange({ ...variation, imageUrl: preview, _imageFile: file });
  };

  return (
    <div style={{ borderRadius:14, border:`2px solid ${color}40`, background:`${color}06`, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 18px', background:`${color}12`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'white', flexShrink:0 }}>
          {VARIATION_NAMES[index]}
        </div>
        <input value={variation.label || ''} onChange={e => onChange({ ...variation, label: e.target.value })}
          placeholder={`Variation ${VARIATION_NAMES[index]} — add a label`}
          style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'DM Sans,sans-serif' }}/>
        {canRemove && (
          <button onClick={onRemove} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', padding:4, borderRadius:6 }}
            onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-faint)'}>
            <Trash size={14}/>
          </button>
        )}
      </div>

      <div style={{ padding:18, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Creative upload */}
        <div style={{ gridColumn:'1/-1' }}>
          <label className="form-label">Creative (Image or Video)</label>
          {variation.imageUrl ? (
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', height:140, background:'var(--bg-elevated)' }}>
              <img src={variation.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              <button onClick={() => onChange({ ...variation, imageUrl:'', _imageFile:null })}
                style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Close size={12}/>
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              style={{ border:`2px dashed ${color}50`, borderRadius:10, padding:'20px', textAlign:'center', cursor:'pointer', transition:'border 0.15s', background:'var(--bg-elevated)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor=color}
              onMouseLeave={e => e.currentTarget.style.borderColor=`${color}50`}>
              <Upload size={20} style={{ color, marginBottom:6 }}/>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Upload image or video</div>
              <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>JPG, PNG, MP4, MOV</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
            onChange={e => handleImageUpload(e.target.files[0])}/>
        </div>

        {/* Headline */}
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <label className="form-label">Headline</label>
            <span style={{ fontSize:10, color: (variation.headline||'').length>40?'#ef4444':(variation.headline||'').length>30?'#f59e0b':'var(--text-faint)', fontWeight:700 }}>
              {(variation.headline||'').length}/40
            </span>
          </div>
          <input className="form-input" value={variation.headline||''} onChange={e => onChange({ ...variation, headline: e.target.value })}
            placeholder="e.g. Get 50% Off Today Only!" style={{ fontSize:13 }}/>
        </div>

        {/* Description */}
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <label className="form-label">Ad Copy / Description</label>
            <span style={{ fontSize:10, color:(variation.description||'').length>125?'#ef4444':'var(--text-faint)', fontWeight:700 }}>
              {(variation.description||'').length}/125
            </span>
          </div>
          <textarea className="form-input" value={variation.description||''} onChange={e => onChange({ ...variation, description: e.target.value })}
            placeholder="Describe your offer or message..." rows={3} style={{ resize:'vertical', fontSize:13, lineHeight:1.5 }}/>
        </div>

        {/* CTA */}
        <div>
          <label className="form-label">Call to Action</label>
          <select className="form-input" value={variation.callToAction||'Learn More'} onChange={e => onChange({ ...variation, callToAction: e.target.value })} style={{ fontSize:13 }}>
            {CTAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Budget % */}
        {splitType === 'custom' && (
          <div>
            <label className="form-label">Budget Share (%)</label>
            <input className="form-input" type="number" min="1" max="97" value={variation.budgetPercent||25}
              onChange={e => onChange({ ...variation, budgetPercent: parseInt(e.target.value)||25 })}
              style={{ fontSize:13 }}/>
            {totalBudget > 0 && (
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>
                = ${((totalBudget * (variation.budgetPercent||25)) / 100).toFixed(2)} budget
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results Card ──────────────────────────────────────────────────────────────
function ResultsCard({ test, onDeclareWinner, onAIAnalyze, aiLoading, onRefresh }) {
  const metrics = [
    { key:'impressions', label:'Impressions', format: v => v.toLocaleString() },
    { key:'clicks',      label:'Clicks',      format: v => v.toLocaleString() },
    { key:'ctr',         label:'CTR',         format: v => `${v.toFixed(2)}%`  },
    { key:'conversions', label:'Conv.',        format: v => v.toLocaleString() },
    { key:'spend',       label:'Spend',        format: v => `$${v.toFixed(2)}`  },
    { key:'cpc',         label:'CPC',          format: v => `$${v.toFixed(2)}`  },
  ];

  const chartData = metrics.map(m => {
    const row = { metric: m.label };
    test.variations.forEach((v, i) => { row[v.name] = v[m.key] || 0; });
    return row;
  });

  const winner = test.variations.reduce((best, v, i) =>
    (v.clicks || 0) > (test.variations[best]?.clicks || 0) ? i : best, 0
  );

  return (
    <div>
      {/* Metric cards */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${test.variations.length}, 1fr)`, gap:12, marginBottom:20 }}>
        {test.variations.map((v, i) => {
          const color  = VARIATION_COLORS[i];
          const isWinner = test.winnerIndex === i || (test.status === 'active' && i === winner && v.clicks > 0);
          return (
            <div key={i} style={{ borderRadius:12, border:`2px solid ${isWinner?color:color+'30'}`, background:`${color}${isWinner?'15':'08'}`, padding:16, position:'relative' }}>
              {isWinner && test.status === 'completed' && (
                <div style={{ position:'absolute', top:-10, right:10, background:color, color:'white', fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20 }}>🏆 WINNER</div>
              )}
              {isWinner && test.status === 'active' && (
                <div style={{ position:'absolute', top:-10, right:10, background:'#16a34a', color:'white', fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20 }}>📈 LEADING</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white' }}>
                  {VARIATION_NAMES[i]}
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{v.label || v.name}</span>
              </div>
              {metrics.map(m => (
                <div key={m.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                  <span style={{ color:'var(--text-faint)' }}>{m.label}</span>
                  <span style={{ fontWeight:700, color: m.key==='ctr'||m.key==='conversions' ? (isWinner?color:'var(--text-primary)') : 'var(--text-primary)' }}>
                    {m.format(v[m.key]||0)}
                  </span>
                </div>
              ))}
              {test.status === 'active' && test.winnerIndex === undefined && (
                <button onClick={() => onDeclareWinner(i)} style={{ marginTop:8, width:'100%', padding:'6px', borderRadius:8, border:`1px solid ${color}`, background:'transparent', color:color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  Declare Winner
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="glass-card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>Performance Comparison</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
            <XAxis dataKey="metric" tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize:11, fill:'var(--text-faint)' }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, fontSize:12 }}/>
            <Legend wrapperStyle={{ fontSize:12 }}/>
            {test.variations.map((v, i) => (
              <Bar key={i} dataKey={v.name} fill={VARIATION_COLORS[i]} radius={[4,4,0,0]}/>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Analysis */}
      <div className="glass-card" style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
            <Bolt size={14} style={{ color:'var(--purple-light)' }}/> AI Analysis
          </div>
          <button onClick={onAIAnalyze} disabled={aiLoading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            {aiLoading ? <><Refresh size={12}/> Analyzing...</> : <><Bolt size={12}/> Analyze with AI</>}
          </button>
        </div>
        {test.aiAnalysis ? (
          <div style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.7, padding:'12px 14px', borderRadius:10, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.15)', whiteSpace:'pre-wrap' }}>
            {test.aiAnalysis}
          </div>
        ) : (
          <div style={{ fontSize:13, color:'var(--text-faint)', fontStyle:'italic' }}>
            Click "Analyze with AI" to get Claude's recommendation on which variation to scale.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ABTestingPage() {
  useSetPageTitle('A/B Creative Testing', 'Test different ad creatives to find the best performer');

  const [tests,      setTests]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewTest,   setViewTest]   = useState(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [toast,      setToast]      = useState('');

  // Create form state
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState({
    name:'', objective:'conversions', platforms:['meta'],
    totalBudget:'', currency:'USD', budgetType:'daily',
    splitType:'equal', durationDays:7,
    targeting:{ ageMin:18, ageMax:65, gender:'all', locations:[], interests:[] },
    notes:'',
  });
  const [variations, setVariations] = useState([emptyVariation(0), emptyVariation(1)]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''), 4000); };

  const loadTests = async () => {
    setLoading(true);
    try { const r = await api.get('/abtests'); setTests(r.data||[]); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadTests(); }, []);

  const resetCreate = () => {
    setStep(0);
    setForm({ name:'', objective:'conversions', platforms:['meta'], totalBudget:'', currency:'USD', budgetType:'daily', splitType:'equal', durationDays:7, targeting:{ ageMin:18, ageMax:65, gender:'all', locations:[], interests:[] }, notes:'' });
    setVariations([emptyVariation(0), emptyVariation(1)]);
  };

  const handleCreateTest = async (status = 'draft') => {
    if (!form.name.trim()) { showToast('Test name is required'); return; }
    if (variations.length < 2) { showToast('At least 2 variations required'); return; }
    try {
      const res = await api.post('/abtests', { ...form, variations, status });
      setTests(prev => [res.data, ...prev]);
      setShowCreate(false);
      resetCreate();
      showToast(status === 'active' ? 'Test launched!' : 'Test saved as draft');
    } catch (err) { showToast(err.response?.data?.message || err.message); }
  };

  const handleLaunch = async (id) => {
    try {
      const res = await api.post(`/abtests/${id}/launch`);
      setTests(prev => prev.map(t => t._id === id ? res.data : t));
      if (viewTest?._id === id) setViewTest(res.data);
      showToast('Test launched!');
    } catch (err) { showToast(err.message); }
  };

  const handlePause = async (id) => {
    try {
      const res = await api.post(`/abtests/${id}/pause`);
      setTests(prev => prev.map(t => t._id === id ? res.data : t));
      if (viewTest?._id === id) setViewTest(res.data);
      showToast('Test paused');
    } catch (err) { showToast(err.message); }
  };

  const handleDeclareWinner = async (variationIndex) => {
    if (!viewTest) return;
    try {
      const res = await api.post(`/abtests/${viewTest._id}/declare-winner`, { variationIndex });
      setViewTest(res.data);
      setTests(prev => prev.map(t => t._id === res.data._id ? res.data : t));
      showToast(`Variation ${VARIATION_NAMES[variationIndex]} declared winner!`);
    } catch (err) { showToast(err.message); }
  };

  const handleAIAnalyze = async () => {
    if (!viewTest) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/abtests/${viewTest._id}/ai-analyze`);
      setViewTest(prev => ({ ...prev, aiAnalysis: res.data.analysis, aiAnalyzedAt: res.data.analyzedAt }));
      showToast('AI analysis complete');
    } catch (err) { showToast(err.response?.data?.message || err.message); }
    finally { setAiLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test?')) return;
    await api.delete(`/abtests/${id}`);
    setTests(prev => prev.filter(t => t._id !== id));
    if (viewTest?._id === id) setViewTest(null);
    showToast('Test deleted');
  };

  const STEPS = ['Setup', 'Variations', 'Targeting', 'Review'];

  const togglePlatform = (id) => {
    setForm(f => ({ ...f, platforms: f.platforms.includes(id) ? f.platforms.filter(p=>p!==id) : [...f.platforms, id] }));
  };

  // ── Test list view ──────────────────────────────────────────────────────────
  if (viewTest) {
    const st = STATUS_STYLES[viewTest.status] || STATUS_STYLES.draft;
    const daysLeft = viewTest.endDate ? Math.max(0, Math.ceil((new Date(viewTest.endDate) - new Date()) / 86400000)) : null;
    return (
      <Layout>
        {toast && <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)' }}>{toast}</div>}
        <div className="page-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setViewTest(null)} className="btn-secondary" style={{ fontSize:12 }}>← Back</button>
            <div>
              <h1 className="page-title" style={{ margin:0 }}>{viewTest.name}</h1>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                <span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                {daysLeft !== null && viewTest.status === 'active' && (
                  <span style={{ fontSize:12, color:'var(--text-faint)' }}>{daysLeft} days remaining</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {viewTest.status === 'draft'  && <button className="btn-primary"   onClick={() => handleLaunch(viewTest._id)} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}><Rocket size={14}/> Launch Test</button>}
            {viewTest.status === 'active' && <button className="btn-secondary" onClick={() => handlePause(viewTest._id)}  style={{ fontSize:13 }}>⏸ Pause</button>}
            {viewTest.status === 'paused' && <button className="btn-primary"   onClick={() => handleLaunch(viewTest._id)} style={{ fontSize:13 }}>▶ Resume</button>}
            <button onClick={() => handleDelete(viewTest._id)} style={{ padding:'8px 14px', borderRadius:9, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:13, fontWeight:600 }}>Delete</button>
          </div>
        </div>

        {/* Test info */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { label:'Objective',  value: viewTest.objective?.replace(/_/g,' ') },
            { label:'Budget',     value: `$${viewTest.totalBudget} / ${viewTest.budgetType}` },
            { label:'Duration',   value: `${viewTest.durationDays} days` },
            { label:'Variations', value: viewTest.variations?.length },
            { label:'Split',      value: viewTest.splitType === 'equal' ? 'Equal split' : 'Custom split' },
            { label:'Platforms',  value: (viewTest.platforms||[]).join(', ') },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Variation creatives */}
        <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>Creative Variations</div>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${viewTest.variations?.length||2}, 1fr)`, gap:12 }}>
            {(viewTest.variations||[]).map((v, i) => (
              <div key={i} style={{ padding:14, borderRadius:10, border:`1px solid ${VARIATION_COLORS[i]}40`, background:`${VARIATION_COLORS[i]}08` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:VARIATION_COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white' }}>{VARIATION_NAMES[i]}</div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{v.label||v.name}</span>
                  {v.status === 'winner' && <span style={{ fontSize:10, background:'#16a34a', color:'white', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>🏆 WINNER</span>}
                </div>
                {v.imageUrl && <img src={v.imageUrl} alt="" style={{ width:'100%', height:100, objectFit:'cover', borderRadius:8, marginBottom:8 }}/>}
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{v.headline||'—'}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5, marginBottom:6 }}>{v.description||'—'}</div>
                <div style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:`${VARIATION_COLORS[i]}20`, color:VARIATION_COLORS[i], display:'inline-block', fontWeight:700 }}>{v.callToAction}</div>
                <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:6 }}>{v.budgetPercent}% of budget</div>
              </div>
            ))}
          </div>
        </div>

        <ResultsCard test={viewTest} onDeclareWinner={handleDeclareWinner} onAIAnalyze={handleAIAnalyze} aiLoading={aiLoading} onRefresh={loadTests}/>
      </Layout>
    );
  }

  return (
    <Layout>
      {toast && <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)' }}>{toast}</div>}

      <div className="page-header">
        <div/>
        <button className="btn-primary" onClick={() => { resetCreate(); setShowCreate(true); }} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <Plus size={14}/> New A/B Test
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:800, maxHeight:'94vh', display:'flex', flexDirection:'column', borderRadius:20, overflow:'hidden' }}>
            <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>New A/B Test</div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex' }}><Close size={20}/></button>
            </div>

            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-subtle)' }}>
              <StepBar step={step} steps={STEPS}/>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:24 }}>

              {/* STEP 0 — Setup */}
              {step === 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label className="form-label">Test Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                      placeholder="e.g. Summer Sale — Headline Test" style={{ fontSize:13 }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div>
                      <label className="form-label">Objective</label>
                      <select className="form-input" value={form.objective} onChange={e => setForm(f=>({...f,objective:e.target.value}))} style={{ fontSize:13 }}>
                        {OBJECTIVES.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Test Duration (days)</label>
                      <select className="form-input" value={form.durationDays} onChange={e => setForm(f=>({...f,durationDays:parseInt(e.target.value)}))} style={{ fontSize:13 }}>
                        {[3,5,7,10,14,21,30].map(d => <option key={d} value={d}>{d} days</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Total Budget</label>
                      <input className="form-input" type="number" min="0" value={form.totalBudget} onChange={e => setForm(f=>({...f,totalBudget:e.target.value}))} placeholder="0.00" style={{ fontSize:13 }}/>
                    </div>
                    <div>
                      <label className="form-label">Budget Type</label>
                      <select className="form-input" value={form.budgetType} onChange={e => setForm(f=>({...f,budgetType:e.target.value}))} style={{ fontSize:13 }}>
                        <option value="daily">Daily</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Platforms</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {PLATFORMS.map(pl => {
                        const Icon = PlatformIcons[pl.id];
                        const sel  = form.platforms.includes(pl.id);
                        return (
                          <button key={pl.id} type="button" onClick={() => togglePlatform(pl.id)}
                            style={{ padding:'6px 12px', borderRadius:9, border:`1px solid ${sel?pl.color:'var(--border-subtle)'}`, background:sel?`${pl.color}18`:'transparent', color:sel?pl.color:'var(--text-muted)', fontSize:12, fontWeight:sel?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:6 }}>
                            {Icon && <Icon size={14}/>} {pl.name} {sel && <Check size={11}/>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Budget Split</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{id:'equal',label:'Equal Split (Recommended)',desc:'Each variation gets the same budget'},{id:'custom',label:'Custom Split',desc:'Set custom % per variation'}].map(opt => (
                        <button key={opt.id} onClick={() => setForm(f=>({...f,splitType:opt.id}))} type="button"
                          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`2px solid ${form.splitType===opt.id?'var(--purple-primary)':'var(--border-subtle)'}`, background:form.splitType===opt.id?'rgba(124,58,237,0.1)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'DM Sans,sans-serif' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{opt.label}</div>
                          <div style={{ fontSize:11, color:'var(--text-faint)' }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1 — Variations */}
              {step === 1 && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
                      Create {variations.length} variation{variations.length>1?'s':''} — upload different creatives, headlines, and CTAs to test
                    </p>
                    {variations.length < 4 && (
                      <button onClick={() => setVariations(prev => [...prev, emptyVariation(prev.length)])} className="btn-secondary" style={{ fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                        <Plus size={12}/> Add Variation
                      </button>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {variations.map((v, i) => (
                      <VariationEditor key={i} variation={v} index={i}
                        onChange={updated => setVariations(prev => prev.map((x,j) => j===i ? updated : x))}
                        onRemove={() => setVariations(prev => prev.filter((_,j) => j!==i))}
                        canRemove={variations.length > 2}
                        totalBudget={parseFloat(form.totalBudget)||0}
                        splitType={form.splitType}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 — Targeting */}
              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 8px' }}>
                    All variations will use the same targeting to ensure a fair test.
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label className="form-label">Min Age</label>
                      <select className="form-input" value={form.targeting.ageMin} onChange={e => setForm(f=>({...f,targeting:{...f.targeting,ageMin:parseInt(e.target.value)}}))} style={{ fontSize:13 }}>
                        {[13,18,21,25,30,35,40,45,50].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Max Age</label>
                      <select className="form-input" value={form.targeting.ageMax} onChange={e => setForm(f=>({...f,targeting:{...f.targeting,ageMax:parseInt(e.target.value)}}))} style={{ fontSize:13 }}>
                        {[25,30,35,40,45,50,55,60,65,100].map(a => <option key={a} value={a}>{a===100?'65+':a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{v:'all',l:'All'},{v:'male',l:'Male'},{v:'female',l:'Female'}].map(opt => (
                        <button key={opt.v} type="button" onClick={() => setForm(f=>({...f,targeting:{...f.targeting,gender:opt.v}}))}
                          style={{ flex:1, padding:'8px', borderRadius:9, border:`1px solid ${form.targeting.gender===opt.v?'var(--purple-primary)':'var(--border-subtle)'}`, background:form.targeting.gender===opt.v?'rgba(124,58,237,0.12)':'transparent', color:form.targeting.gender===opt.v?'var(--purple-light)':'var(--text-muted)', fontSize:13, fontWeight:form.targeting.gender===opt.v?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Locations (comma separated)</label>
                    <input className="form-input" value={form.targeting.locations.join(', ')}
                      onChange={e => setForm(f=>({...f,targeting:{...f.targeting,locations:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}}))}
                      placeholder="Cameroon, Nigeria, Côte d'Ivoire" style={{ fontSize:13 }}/>
                  </div>
                  <div>
                    <label className="form-label">Interests (comma separated)</label>
                    <input className="form-input" value={form.targeting.interests.join(', ')}
                      onChange={e => setForm(f=>({...f,targeting:{...f.targeting,interests:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}}))}
                      placeholder="Fashion, E-commerce, Online Shopping" style={{ fontSize:13 }}/>
                  </div>
                  <div>
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                      placeholder="Internal notes about this test..." style={{ resize:'vertical', fontSize:13 }}/>
                  </div>
                </div>
              )}

              {/* STEP 3 — Review */}
              {step === 3 && (
                <div>
                  <div style={{ padding:'16px 18px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:20 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:10 }}>Test Summary</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
                      {[
                        ['Name',      form.name],
                        ['Objective', form.objective?.replace(/_/g,' ')],
                        ['Platforms', form.platforms.join(', ')],
                        ['Budget',    `$${form.totalBudget} / ${form.budgetType}`],
                        ['Duration',  `${form.durationDays} days`],
                        ['Split',     form.splitType === 'equal' ? 'Equal' : 'Custom'],
                        ['Variations',variations.length],
                        ['Age',       `${form.targeting.ageMin}–${form.targeting.ageMax}`],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                          <span style={{ color:'var(--text-faint)' }}>{label}</span>
                          <span style={{ fontWeight:700, color:'var(--text-primary)', textTransform:'capitalize' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variation summary */}
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${variations.length}, 1fr)`, gap:10 }}>
                    {variations.map((v, i) => (
                      <div key={i} style={{ padding:14, borderRadius:10, border:`1px solid ${VARIATION_COLORS[i]}40`, background:`${VARIATION_COLORS[i]}08` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:VARIATION_COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white' }}>{VARIATION_NAMES[i]}</div>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{v.label||v.name}</span>
                        </div>
                        {v.imageUrl && <img src={v.imageUrl} alt="" style={{ width:'100%', height:80, objectFit:'cover', borderRadius:6, marginBottom:6 }}/>}
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{v.headline||'No headline'}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{v.callToAction}</div>
                        <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:4 }}>{form.splitType==='equal'?`${Math.floor(100/variations.length)}%`:v.budgetPercent+'%'} of budget</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:16, padding:'12px 14px', borderRadius:10, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', fontSize:12, color:'#16a34a' }}>
                    ✅ All looks good! You can launch immediately or save as draft to review later.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={() => step > 0 ? setStep(s=>s-1) : setShowCreate(false)} className="btn-secondary" style={{ fontSize:13 }}>
                {step === 0 ? 'Cancel' : '← Back'}
              </button>
              <div style={{ display:'flex', gap:8 }}>
                {step === 3 && (
                  <button onClick={() => handleCreateTest('draft')} className="btn-secondary" style={{ fontSize:13 }}>
                    Save as Draft
                  </button>
                )}
                {step < 3 ? (
                  <button onClick={() => { if (!form.name && step===0) { showToast('Please enter a test name'); return; } setStep(s=>s+1); }} className="btn-primary" style={{ fontSize:13 }}>
                    Continue →
                  </button>
                ) : (
                  <button onClick={() => handleCreateTest('active')} className="btn-primary" style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                    <Rocket size={14}/> Launch Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:14 }}/>)}
        </div>
      ) : tests.length === 0 ? (
        <div className="glass-card" style={{ padding:56, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:14 }}>🧪</div>
          <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No A/B Tests Yet</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>
            Create your first A/B test to find which ad creative performs best
          </p>
          <button className="btn-primary" onClick={() => { resetCreate(); setShowCreate(true); }} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <Plus size={14}/> Create First Test
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {tests.map(test => {
            const st       = STATUS_STYLES[test.status] || STATUS_STYLES.draft;
            const daysLeft = test.endDate ? Math.max(0, Math.ceil((new Date(test.endDate)-new Date())/86400000)) : null;
            const totalImpressions = (test.variations||[]).reduce((s,v) => s+(v.impressions||0), 0);
            const totalClicks      = (test.variations||[]).reduce((s,v) => s+(v.clicks||0), 0);
            return (
              <div key={test._id} className="glass-card" style={{ padding:'18px 22px', cursor:'pointer', transition:'all 0.15s' }}
                onClick={() => setViewTest(test)}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--purple-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{test.name}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                      {test.winnerIndex !== undefined && test.winnerIndex !== null && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(22,163,74,0.1)', color:'#16a34a', fontWeight:700 }}>
                          🏆 Winner: Var. {VARIATION_NAMES[test.winnerIndex]}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:14, fontSize:12, color:'var(--text-faint)', flexWrap:'wrap' }}>
                      <span>{test.variations?.length} variations</span>
                      <span>·</span>
                      <span>{test.durationDays} days</span>
                      <span>·</span>
                      <span>${test.totalBudget} / {test.budgetType}</span>
                      {totalImpressions > 0 && <><span>·</span><span>{totalImpressions.toLocaleString()} impressions</span></>}
                      {totalClicks > 0 && <><span>·</span><span>{totalClicks.toLocaleString()} clicks</span></>}
                      {daysLeft !== null && test.status==='active' && <><span>·</span><span style={{ color:'#f59e0b', fontWeight:600 }}>{daysLeft} days left</span></>}
                    </div>
                  </div>

                  {/* Variation mini-bars */}
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {(test.variations||[]).map((v,i) => (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ width:6, height:Math.max(8, Math.min(40, (v.clicks||0)*2+8)), borderRadius:3, background:VARIATION_COLORS[i], transition:'height 0.3s' }}/>
                        <span style={{ fontSize:9, fontWeight:700, color:VARIATION_COLORS[i] }}>{VARIATION_NAMES[i]}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    {test.status === 'draft'  && <button className="btn-primary" onClick={() => handleLaunch(test._id)} style={{ fontSize:12, padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}><Rocket size={12}/> Launch</button>}
                    {test.status === 'active' && <button className="btn-secondary" onClick={() => handlePause(test._id)} style={{ fontSize:12, padding:'6px 12px' }}>⏸ Pause</button>}
                    <button onClick={() => handleDelete(test._id)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:12 }}>
                      <Trash size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}