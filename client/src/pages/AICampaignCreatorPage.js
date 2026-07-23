import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import api from '../utils/api';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import {
  AlertTriangle, Bolt, Campaigns, Check, ChevronRight,
  DollarSign, Edit, Info, Refresh, Rocket, Target
} from '../components/shared/Icons';

const EXAMPLES = [
  "I want to promote my bakery to women aged 25-40 in Douala with a budget of 50,000 XAF per month",
  "Launch a traffic campaign for my e-commerce store targeting tech enthusiasts in the US and UK, $200 budget",
  "Brand awareness campaign for my new restaurant in Paris, targeting foodies aged 20-45, €500 total budget",
  "Generate leads for my real estate agency in Lagos targeting professionals aged 30-55, ₦100,000 budget",
  "Promote my fitness app to young adults 18-30 globally with a $300 monthly budget on social platforms",
];

function PlatformPill({ platformId, budget, currency, budgetType, reasoning }) {
  const pl    = PLATFORMS.find(p => p.id === platformId);
  const Icon  = PlatformIcons[platformId];
  const [showReason, setShowReason] = useState(false);
  if (!pl) return null;

  return (
    <div style={{ borderRadius:10, border:`1px solid ${pl.border}`, background:pl.bg, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        {Icon && <Icon size={16}/>}
        <span style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{pl.name}</span>
        <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:pl.color }}>
          {currency} {budget?.toLocaleString()} / {budgetType === 'daily' ? 'day' : 'total'}
        </span>
      </div>
      {reasoning && (
        <div style={{ fontSize:11, color:'var(--text-faint)', lineHeight:1.5 }}>{reasoning}</div>
      )}
    </div>
  );
}

function FieldRow({ label, value, icon }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
      <span style={{ width:130, fontSize:12, color:'var(--text-faint)', flexShrink:0, paddingTop:1 }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500, flex:1 }}>{display}</span>
    </div>
  );
}

export default function AICampaignCreatorPage() {
  const navigate  = useNavigate();
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [creating,    setCreating]    = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/insights/campaign-creator', { description });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  const handleCreate = async (status = 'draft') => {
    if (!result?.campaign) return;
    setCreating(true);
    try {
      const c = result.campaign;
      const platforms = (c.platforms || []).map(p => ({
        platform:   p.platform,
        budget:     p.budget || 0,
        budgetType: p.budgetType || 'daily',
        objective:  c.objective,
        status:     'draft',
        targeting: {
          ageMin:    c.targeting?.ageMin    || 18,
          ageMax:    c.targeting?.ageMax    || 65,
          genders:   c.targeting?.genders   || [],
          locations: c.targeting?.locations || [],
          interests: c.targeting?.interests || [],
        },
        creative: {
          type:            'single_image',
          headline:        c.creative?.headline        || '',
          description:     c.creative?.description     || '',
          callToAction:    c.creative?.callToAction    || 'Learn More',
          destinationType: c.creative?.destinationType || 'website',
          destinationUrl:  '',
        },
        metrics: { amountSpent:0, impressions:0, cpm:0, totalClicks:0, ctr:0, cpc:0, conversions:0, totalReach:0, addToCart:0 },
      }));

      await api.post('/campaigns', {
        name:      c.name,
        objective: c.objective,
        status,
        startDate: c.startDate || undefined,
        endDate:   c.endDate   || undefined,
        currency:  c.currency  || 'USD',
        tags:      c.tags      || [],
        notes:     `[AI Generated] ${c.notes || ''}\n\nOriginal prompt: "${description}"`,
        totalBudget: platforms.reduce((s, p) => s + (p.budget || 0), 0),
        platforms,
      });

      navigate('/campaigns', { state: { toast: `Campaign "${c.name}" created successfully!` } });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setCreating(false);
    }
  };

  const campaign = result?.campaign;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white' }}>
              <Bolt size={18}/>
            </span>
            AI Campaign Creator
          </h1>
          <p className="page-subtitle">Describe your goal in plain English — Claude will build the full campaign setup for you</p>
        </div>
      </div>

      <div style={{ maxWidth:860 }}>

        {/* Input area */}
        <div className="glass-card" style={{ padding:28, marginBottom:24 }}>
          <label style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', display:'block', marginBottom:10 }}>
            Describe your campaign
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. I want to promote my clothing store to young women aged 18-30 in Cameroon and Nigeria, with a budget of 100,000 XAF per month..."
            rows={4}
            style={{ width:'100%', borderRadius:10, border:'1px solid var(--border-subtle)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:14, padding:'12px 14px', resize:'vertical', lineHeight:1.6, fontFamily:'DM Sans,sans-serif', outline:'none', boxSizing:'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <span style={{ fontSize:12, color:'var(--text-faint)' }}>Ctrl+Enter to generate</span>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              style={{ padding:'10px 28px', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
              {loading ? <><Refresh size={14}/> Generating...</> : <><Bolt size={14}/> Generate Campaign</>}
            </button>
          </div>

          {error && (
            <div style={{ marginTop:14, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13, display:'flex', gap:8 }}>
              <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/> {error}
            </div>
          )}
        </div>

        {/* Example prompts */}
        {!result && !loading && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Example prompts — click to use
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setDescription(ex)}
                  style={{ textAlign:'left', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif', lineHeight:1.5, transition:'all 0.15s', display:'flex', alignItems:'center', gap:8 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                  <ChevronRight size={14} style={{ flexShrink:0, color:'var(--purple-light)' }}/> {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'white' }}>
              <div style={{ width:26, height:26, border:'3px solid rgba(255,255,255,0.3)', borderTop:'3px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Claude is building your campaign...</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Analyzing your goal, selecting platforms, setting targeting...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Result */}
        {campaign && !loading && (
          <div>
            {/* AI explanation */}
            <div style={{ padding:'16px 20px', borderRadius:12, background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(168,85,247,0.05))', border:'1px solid rgba(124,58,237,0.2)', marginBottom:20, display:'flex', gap:12 }}>
              <Bolt size={18} style={{ color:'var(--purple-light)', flexShrink:0, marginTop:2 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--purple-light)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>AI Strategy</div>
                <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7 }}>{result.campaign.explanation}</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

              {/* Campaign overview */}
              <div className="glass-card" style={{ padding:22 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                  <Target size={15}/> Campaign Overview
                </h3>
                <FieldRow label="Name"      value={campaign.name} />
                <FieldRow label="Objective" value={campaign.objective?.replace(/_/g,' ')} />
                <FieldRow label="Currency"  value={campaign.currency} />
                <FieldRow label="Start"     value={campaign.startDate} />
                <FieldRow label="End"       value={campaign.endDate} />
                <FieldRow label="Tags"      value={campaign.tags} />
              </div>

              {/* Targeting */}
              <div className="glass-card" style={{ padding:22 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                  <Target size={15}/> Targeting
                </h3>
                <FieldRow label="Age"       value={`${campaign.targeting?.ageMin} – ${campaign.targeting?.ageMax}`} />
                <FieldRow label="Gender"    value={campaign.targeting?.genders} />
                <FieldRow label="Locations" value={campaign.targeting?.locations} />
                <FieldRow label="Interests" value={campaign.targeting?.interests} />
              </div>

              {/* Platforms & budget */}
              <div className="glass-card" style={{ padding:22 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                  <DollarSign size={15}/> Platforms & Budget
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(campaign.platforms || []).map((p, i) => (
                    <PlatformPill key={i}
                      platformId={p.platform}
                      budget={p.budget}
                      currency={campaign.currency}
                      budgetType={p.budgetType}
                      reasoning={p.reasoning}
                    />
                  ))}
                </div>
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'var(--text-faint)' }}>Total Budget</span>
                  <span style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
                    {campaign.currency} {(campaign.platforms || []).reduce((s, p) => s + (p.budget || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Ad Creative */}
              <div className="glass-card" style={{ padding:22 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                  <Campaigns size={15}/> Ad Creative
                </h3>
                <FieldRow label="Headline"    value={campaign.creative?.headline} />
                <FieldRow label="Description" value={campaign.creative?.description} />
                <FieldRow label="CTA"         value={campaign.creative?.callToAction} />
                <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:4 }}>Ad Preview</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{campaign.creative?.headline}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{campaign.creative?.description}</div>
                  <div style={{ marginTop:8, display:'inline-block', padding:'4px 12px', borderRadius:6, background:'var(--purple-primary)', color:'white', fontSize:11, fontWeight:700 }}>
                    {campaign.creative?.callToAction}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Tips */}
            {result.campaign.suggestions?.length > 0 && (
              <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:7 }}>
                  <Info size={15}/> AI Suggestions
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {result.campaign.suggestions.map((tip, i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(124,58,237,0.12)', color:'var(--purple-light)', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <button className="btn-secondary" onClick={() => { setResult(null); }} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                <Refresh size={14}/> Start Over
              </button>
              <button className="btn-secondary" onClick={() => handleGenerate()} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                <Bolt size={14}/> Regenerate
              </button>
              <button className="btn-secondary" onClick={() => handleCreate('draft')} disabled={creating} style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                <Edit size={14}/> {creating ? 'Creating...' : 'Save as Draft'}
              </button>
              <button className="btn-primary" onClick={() => handleCreate('active')} disabled={creating} style={{ padding:'10px 24px', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                <Rocket size={14}/> {creating ? 'Creating...' : 'Create & Launch'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}