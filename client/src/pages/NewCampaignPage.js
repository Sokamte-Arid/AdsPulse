import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import { campaignAPI } from '../utils/api';
import ObjectiveStep      from '../components/campaigns/ObjectiveStep';
import PlatformBudgetStep from '../components/campaigns/PlatformBudgetStep';
import CampaignDetailsStep from '../components/campaigns/CampaignDetailsStep';
import CreativeStep       from '../components/campaigns/CreativeStep';
import { Check } from '../components/shared/Icons';

const STEPS = [
  { id:'objective', label:'Objective'          },
  { id:'platforms', label:'Platforms & Budget' },
  { id:'details',   label:'Details & Targeting'},
  { id:'creative',  label:'Creative'           },
  { id:'review',    label:'Review'             },
];

const EMPTY_DATA = {
  name:           '',
  objective:      '',
  platforms:      [],
  totalBudget:    0,
  currency:       'USD',
  startDate:      '',
  endDate:        '',
  targeting:      { ageMin:18, ageMax:65, gender:'all', locations:[], interests:[] },
  description:    '',
  tags:           [],
  creative:       { headline:'', primaryText:'', callToAction:'Learn More', imageUrl:'', videoUrl:'' },
};

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:32, overflowX:'auto', paddingBottom:4 }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, transition:'all 0.2s',
              background: i < current ? '#16a34a' : i === current ? 'var(--purple-primary)' : 'var(--bg-elevated)',
              color: i <= current ? 'white' : 'var(--text-faint)',
              border: i === current ? '2px solid var(--purple-primary)' : i < current ? '2px solid #16a34a' : '2px solid var(--border-subtle)',
              boxShadow: i === current ? '0 0 0 4px rgba(124,58,237,0.15)' : 'none',
            }}>
              {i < current ? <Check size={16}/> : i + 1}
            </div>
            <span style={{ fontSize:11, fontWeight:600, color: i === current ? 'var(--purple-light)' : i < current ? '#16a34a' : 'var(--text-faint)', whiteSpace:'nowrap' }}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:2, margin:'0 6px', marginBottom:18, background: i < current ? '#16a34a' : 'var(--border-subtle)', transition:'background 0.3s', minWidth:20 }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ReviewStep({ data }) {
  const statusColor = { active:'#16a34a', draft:'#6b7280' };
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px' }}>Review your campaign</h2>
      <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px' }}>Check everything before launching.</p>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {[
          { label:'Campaign Name', value: data.name || '—' },
          { label:'Objective',     value: data.objective?.replace(/_/g,' ') || '—', capitalize:true },
          { label:'Currency',      value: data.currency || 'USD' },
          { label:'Total Budget',  value: data.totalBudget ? `$${Number(data.totalBudget).toLocaleString()}` : '—' },
          { label:'Start Date',    value: data.startDate || '—' },
          { label:'End Date',      value: data.endDate   || 'No end date' },
          { label:'Platforms',     value: (data.platforms||[]).map(p=>p.platform).join(', ') || '—' },
          { label:'Locations',     value: (data.targeting?.locations||[]).join(', ') || 'All locations' },
          { label:'Age Range',     value: `${data.targeting?.ageMin||18} – ${data.targeting?.ageMax||65}` },
          { label:'Gender',        value: data.targeting?.gender || 'All' },
          { label:'Tags',          value: (data.tags||[]).map(t=>`#${t}`).join(' ') || '—' },
        ].map(row => (
          <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
            <span style={{ fontSize:13, color:'var(--text-faint)', fontWeight:600 }}>{row.label}</span>
            <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:700, textAlign:'right', maxWidth:'60%', textTransform: row.capitalize?'capitalize':'none' }}>
              {row.value}
            </span>
          </div>
        ))}

        {data.creative?.headline && (
          <div style={{ padding:'14px', borderRadius:10, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--purple-light)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Creative</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{data.creative.headline}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{data.creative.primaryText}</div>
            <div style={{ marginTop:8, display:'inline-block', padding:'4px 12px', borderRadius:20, background:'var(--purple-primary)', color:'white', fontSize:11, fontWeight:700 }}>
              {data.creative.callToAction}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  useSetPageTitle('New Campaign', 'Create a new advertising campaign');
  const navigate    = useNavigate();
  const [step,      setStep]      = useState(0);
  const [data,      setData]      = useState(EMPTY_DATA);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const updateField = (fieldOrObject, value) => {
    if (typeof fieldOrObject === 'object' && value === undefined) {
      setData(fieldOrObject);
    } else {
      setData(prev => ({ ...prev, [fieldOrObject]: value }));
    }
  };

  const validateStep = () => {
    if (step === 0 && !data.objective) { setError('Please select a campaign objective'); return false; }
    if (step === 1 && (!data.platforms || data.platforms.length === 0)) { setError('Please select at least one platform'); return false; }
    if (step === 2 && !data.name?.trim()) { setError('Please enter a campaign name'); return false; }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (status = 'draft') => {
    setSaving(true); setError('');
    try {
      const payload = {
        name:        data.name,
        objective:   data.objective,
        currency:    data.currency || 'USD',
        totalBudget: data.totalBudget || 0,
        startDate:   data.startDate || undefined,
        endDate:     data.endDate   || undefined,
        status,
        tags:        data.tags || [],
        notes:       data.description || '',
        targeting:   data.targeting || {},
        platforms:   (data.platforms || []).map(p => ({
          platform:   p.platform,
          budget:     p.budget || 0,
          budgetType: p.budgetType || 'daily',
          status:     status === 'active' ? 'active' : 'draft',
          objective:  data.objective,
          targeting:  data.targeting || {},
        })),
        creative: data.creative || {},
      };
      await campaignAPI.create(payload);
      navigate('/campaigns');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const stepProps = { data, onChange: updateField };

  return (
    <Layout>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>Create Campaign</h1>
            <p style={{ fontSize:13, color:'var(--text-faint)', margin:0 }}>Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
          </div>
          <button onClick={() => navigate('/campaigns')} className="btn-secondary" style={{ fontSize:13 }}>
            ← Back to Campaigns
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={STEPS} current={step}/>

        {/* Step content */}
        <div className="glass-card" style={{ padding:28, marginBottom:20 }}>
          {step === 0 && <ObjectiveStep      {...stepProps}/>}
          {step === 1 && <PlatformBudgetStep {...stepProps}/>}
          {step === 2 && <CampaignDetailsStep {...stepProps}/>}
          {step === 3 && <CreativeStep       {...stepProps}/>}
          {step === 4 && <ReviewStep          data={data}/>}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={step === 0 ? () => navigate('/campaigns') : handleBack}
            className="btn-secondary" style={{ fontSize:13 }}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          <div style={{ display:'flex', gap:10 }}>
            {step === STEPS.length - 1 ? (
              <>
                <button onClick={() => handleSubmit('draft')} disabled={saving}
                  className="btn-secondary" style={{ fontSize:13 }}>
                  Save as Draft
                </button>
                <button onClick={() => handleSubmit('active')} disabled={saving}
                  className="btn-primary" style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  {saving ? 'Launching...' : '🚀 Launch Campaign'}
                </button>
              </>
            ) : (
              <button onClick={handleNext} className="btn-primary" style={{ fontSize:13 }}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}