import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

// Load Stripe.js dynamically
let stripePromise = null;
function getStripe() {
  const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripePromise) {
    stripePromise = new Promise((resolve) => {
      if (window.Stripe) { resolve(window.Stripe(key)); return; }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve(window.Stripe(key));
      document.head.appendChild(script);
    });
  }
  return stripePromise;
}

// ── Card brand detection ──────────────────────────────────────────────────────
const BRAND_STYLES = {
  visa:       { label:'Visa',       color:'#1a1f71', bg:'linear-gradient(135deg,#1a1f71,#2563eb)' },
  mastercard: { label:'Mastercard', color:'#eb001b', bg:'linear-gradient(135deg,#eb001b,#f79e1b)' },
  amex:       { label:'Amex',       color:'#2e77bc', bg:'linear-gradient(135deg,#2e77bc,#0a3d7c)' },
  discover:   { label:'Discover',   color:'#f76f20', bg:'linear-gradient(135deg,#f76f20,#e44a00)' },
  unknown:    { label:'Card',       color:'#7c3aed', bg:'linear-gradient(135deg,#7c3aed,#a855f7)' },
};

// ── Stripe Card Form ──────────────────────────────────────────────────────────
export function StripeCardForm({ onSuccess, onClose }) {
  const [stripe,   setStripe]   = useState(null);
  const [elements, setElements] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [nickname, setNickname] = useState('');
  const [cardBrand, setCardBrand] = useState('unknown');
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const cardElementRef = useRef(null);
  const mountedRef     = useRef(false);

  useEffect(() => {
    const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    if (!key) { setLoading(false); setStripeConfigured(false); return; }
    setStripeConfigured(true);

    getStripe().then(stripeInstance => {
      if (!stripeInstance || mountedRef.current) return;
      setStripe(stripeInstance);

      const els = stripeInstance.elements({
        appearance: {
          theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'stripe' : 'night',
          variables: {
            colorPrimary:     '#7c3aed',
            colorBackground:  'var(--bg-input, #1a1030)',
            colorText:        'var(--text-primary, #e8e0f5)',
            colorDanger:      '#ef4444',
            fontFamily:       'DM Sans, Arial, sans-serif',
            spacingUnit:      '4px',
            borderRadius:     '8px',
          }
        }
      });
      setElements(els);
      setLoading(false);
    });

    return () => { mountedRef.current = true; };
  }, []);

  useEffect(() => {
    if (!elements || !cardElementRef.current) return;

    const cardElement = elements.create('card', {
      hidePostalCode: false,
      style: {
        base: {
          color: '#e8e0f5',
          fontFamily: 'DM Sans, Arial, sans-serif',
          fontSize: '15px',
          '::placeholder': { color: '#6b7280' },
        },
        invalid: { color: '#ef4444' },
      }
    });

    cardElement.mount(cardElementRef.current);
    cardElement.on('change', (event) => {
      setError(event.error ? event.error.message : '');
      if (event.brand) setCardBrand(event.brand);
    });

    return () => cardElement.destroy();
  }, [elements]);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true); setError('');

    try {
      // Step 1: Get SetupIntent from our server
      const setupRes = await api.post('/stripe/setup-intent');
      const { clientSecret } = setupRes.data;

      // Step 2: Confirm card setup with Stripe.js
      const cardElement = elements.getElement('card');
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: nickname || undefined }
        }
      });

      if (stripeError) {
        setError(stripeError.message);
        setSaving(false);
        return;
      }

      // Step 3: Confirm with our server to save the card to DB
      await api.post('/stripe/payment-methods/confirm', {
        paymentMethodId: setupIntent.payment_method,
        nickname: nickname || undefined
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const brandStyle = BRAND_STYLES[cardBrand] || BRAND_STYLES.unknown;

  if (!stripeConfigured) {
    return (
      <div style={{ padding:24 }}>
        <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.25)', fontSize:13, color:'#d97706', lineHeight:1.7, marginBottom:16 }}>
          <strong>⚠️ Stripe not configured.</strong>
          <br/>
          Add <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:4 }}>REACT_APP_STRIPE_PUBLISHABLE_KEY</code> to <code>client/.env.local</code> and <code>STRIPE_SECRET_KEY</code> to <code>server/.env</code>.
          <br/><br/>
          Get your keys at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" style={{ color:'#d97706' }}>dashboard.stripe.com/apikeys</a>
        </div>
        <button className="btn-secondary" onClick={onClose} style={{ width:'100%', justifyContent:'center' }}>Close</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
          💳 Add Payment Card
        </h3>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:22, padding:0 }}>✕</button>
      </div>

      {/* Card preview */}
      <div style={{ height:110, borderRadius:14, background:brandStyle.bg, padding:'16px 20px', marginBottom:20, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
          {brandStyle.label}
        </div>
        <div style={{ fontSize:18, letterSpacing:6, color:'rgba(255,255,255,0.5)', fontFamily:'DM Mono,monospace' }}>
          •••• •••• •••• ••••
        </div>
        {/* Decorative circles */}
        <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'absolute', right:20, top:10, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
      </div>

      {/* Stripe card element */}
      {loading ? (
        <div style={{ padding:'16px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:16, height:16, border:'2px solid var(--border-subtle)', borderTopColor:'var(--purple-primary)', borderRadius:'50%', animation:'spin 0.6s linear infinite' }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Loading secure card input...</span>
        </div>
      ) : (
        <div style={{ padding:'14px 16px', borderRadius:10, background:'var(--bg-elevated)', border:`1px solid var(--border-subtle)`, marginBottom:16, transition:'border-color 0.2s' }}
          onFocus={e => e.currentTarget.style.borderColor='var(--purple-primary)'}
          onBlur={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
          <div ref={cardElementRef}/>
        </div>
      )}

      {/* Nickname */}
      <div style={{ marginBottom:16 }}>
        <label className="form-label">Card Nickname (optional)</label>
        <input className="form-input" placeholder="e.g. Company Card, Personal Visa..."
          value={nickname} onChange={e => setNickname(e.target.value)}/>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Security note */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:12, color:'var(--text-faint)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Card details are encrypted and handled securely by Stripe. We never store your full card number.
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || loading}
          style={{ flex:2, justifyContent:'center' }}>
          {saving ? '⏳ Saving...' : '🔒 Save Card Securely'}
        </button>
      </div>
    </div>
  );
}

// ── Charge confirmation modal ─────────────────────────────────────────────────
export function ChargeModal({ amount, description, platform, campaignId, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [defaultMethod, setDefaultMethod] = useState(null);

  useEffect(() => {
    api.get('/stripe/payment-methods')
      .then(res => {
        const def = (res.data || []).find(m => m.isDefault);
        setDefaultMethod(def || null);
      })
      .catch(() => {});
  }, []);

  const handleCharge = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/stripe/charge', { amount, description, platform, campaignId });
      onSuccess?.(res.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  const brandStyle = BRAND_STYLES[defaultMethod?.brand?.toLowerCase()] || BRAND_STYLES.unknown;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div className="glass-card" style={{ padding:32, maxWidth:420, width:'100%' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 20px' }}>
          Confirm Payment
        </h3>

        {/* Amount */}
        <div style={{ textAlign:'center', padding:'20px 0', marginBottom:20 }}>
          <div style={{ fontSize:40, fontWeight:900, color:'var(--text-primary)' }}>
            ${parseFloat(amount).toFixed(2)}
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            {description || `Ad spend — ${platform}`}
          </div>
        </div>

        {/* Payment method */}
        {defaultMethod ? (
          <div style={{ padding:'14px 16px', borderRadius:12, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:8, background:brandStyle.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'white', fontWeight:700, flexShrink:0 }}>
              💳
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                {defaultMethod.brand?.toUpperCase()} •••• {defaultMethod.last4}
              </div>
              <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                Expires {String(defaultMethod.expMonth).padStart(2,'0')}/{defaultMethod.expYear}
                {defaultMethod.nickname && ` · ${defaultMethod.nickname}`}
              </div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(22,163,74,0.25)' }}>
              DEFAULT
            </div>
          </div>
        ) : (
          <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:20, fontSize:13, color:'#ef4444' }}>
            ⚠️ No payment method found. Add one in Ad Spend first.
          </div>
        )}

        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn-primary" onClick={handleCharge}
            disabled={loading || !defaultMethod}
            style={{ flex:2, justifyContent:'center' }}>
            {loading ? '⏳ Processing...' : `💳 Pay $${parseFloat(amount).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
