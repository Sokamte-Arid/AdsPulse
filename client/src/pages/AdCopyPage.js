import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import api from '../utils/api';
import { Bolt, Copy, Check, AlertTriangle, Refresh } from '../components/shared/Icons';

const PLATFORMS  = ['General','Meta','Google','TikTok','LinkedIn','Twitter','Snapchat','YouTube'];
const TONES      = ['Professional','Friendly','Urgent','Playful','Inspirational','Minimalist'];
const OBJECTIVES = ['Conversions','Brand Awareness','Traffic','Lead Generation','Engagement','App Installs'];
const LANGUAGES  = ['English','French','Spanish','Arabic','Portuguese','German'];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title="Copy to clipboard"
      style={{ background:'none', border:'none', cursor:'pointer', color: copied ? '#10b981' : 'var(--text-faint)', padding:'2px 4px', borderRadius:4, display:'flex', alignItems:'center', gap:4, fontSize:11, flexShrink:0 }}>
      {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
    </button>
  );
}

function VariantCard({ variant, index }) {
  return (
    <div className="glass-card" style={{ padding:'18px 20px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--purple-light)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Variant {index + 1}</span>
        <CopyButton text={`${variant.headline}\n\n${variant.primaryText}\n\n${variant.callToAction}${variant.hashtags?.length ? '\n\n' + variant.hashtags.join(' ') : ''}`} />
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--text-faint)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Headline</div>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', lineHeight:1.4 }}>{variant.headline}</div>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--text-faint)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Primary Text</div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{variant.primaryText}</div>
      </div>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:140 }}>
          <div style={{ fontSize:11, color:'var(--text-faint)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Call to Action</div>
          <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:20, background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:12, fontWeight:700 }}>
            {variant.callToAction}
          </span>
        </div>
        {variant.hashtags?.length > 0 && (
          <div style={{ flex:2, minWidth:160 }}>
            <div style={{ fontSize:11, color:'var(--text-faint)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Hashtags</div>
            <div style={{ fontSize:12, color:'#7c3aed', lineHeight:1.8 }}>{variant.hashtags.join(' ')}</div>
          </div>
        )}
      </div>

      {variant.notes && (
        <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.12)' }}>
          <div style={{ fontSize:11, color:'var(--text-faint)', fontWeight:600, marginBottom:2 }}>💡 Why this works</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{variant.notes}</div>
        </div>
      )}
    </div>
  );
}

export default function AdCopyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ product:'', audience:'', tone:'Professional', platform:'General', objective:'Conversions', language:'English', variants:3 });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.product.trim() || !form.audience.trim()) {
      setError('Please fill in both Product/Service and Target Audience.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/insights/ad-copy', form);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate ad copy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SelectField = ({ label, field, options }) => (
    <div style={{ flex:1, minWidth:140 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>{label}</label>
      <select value={form[field]} onChange={e => set(field, e.target.value)} className="form-input" style={{ width:'100%', fontSize:13 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <Layout>
      <div style={{ maxWidth:820, margin:'0 auto', padding:'0 0 40px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => navigate('/campaigns')}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:20, padding:0, lineHeight:1 }}>←</button>
          <div>
            <h1 className="page-title" style={{ marginBottom:2 }}>✍️ Ad Copy Generator</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Generate platform-optimised ad copy with AI</p>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card" style={{ padding:'24px', marginBottom:20 }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Product / Service *</label>
            <input className="form-input" value={form.product} onChange={e => set('product', e.target.value)}
              placeholder="e.g. Premium fitness app with personalised workout plans" style={{ width:'100%' }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Target Audience *</label>
            <input className="form-input" value={form.audience} onChange={e => set('audience', e.target.value)}
              placeholder="e.g. Women aged 25-40 interested in fitness and healthy living" style={{ width:'100%' }} />
          </div>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <SelectField label="Platform"  field="platform"  options={PLATFORMS}  />
            <SelectField label="Objective" field="objective" options={OBJECTIVES} />
            <SelectField label="Tone"      field="tone"      options={TONES}      />
          </div>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
            <SelectField label="Language"  field="language"  options={LANGUAGES}  />
            <div style={{ flex:1, minWidth:140 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Number of Variants</label>
              <select value={form.variants} onChange={e => set('variants', Number(e.target.value))} className="form-input" style={{ width:'100%', fontSize:13 }}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} variant{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:16 }}>
              <AlertTriangle size={14} style={{ color:'#ef4444', flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'#ef4444' }}>{error}</span>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="btn-primary" style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, padding:'12px' }}>
            {loading ? <><Refresh size={15}/> Generating...</> : <><Bolt size={15}/> Generate Ad Copy</>}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
                {result.variants?.length} Variant{result.variants?.length !== 1 ? 's' : ''} Generated
              </h2>
              <button onClick={handleGenerate} disabled={loading}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--purple-light)', background:'none', border:'1px solid rgba(124,58,237,0.3)', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>
                <Refresh size={12}/> Regenerate
              </button>
            </div>

            {result.variants?.map((v, i) => <VariantCard key={i} variant={v} index={i} />)}

            {result.tips?.length > 0 && (
              <div className="glass-card" style={{ padding:'18px 20px', marginTop:8 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:12 }}>💡 Pro Tips for This Campaign</div>
                <ul style={{ margin:0, padding:'0 0 0 16px' }}>
                  {result.tips.map((tip, i) => (
                    <li key={i} style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:4 }}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}