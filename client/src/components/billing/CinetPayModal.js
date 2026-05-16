import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const CHANNELS = [
  {
    id:      'MOBILE_MONEY',
    label:   'MTN Mobile Money',
    icon:    '📱',
    color:   '#FFCC00',
    textColor:'#1a1a1a',
    bg:      'linear-gradient(135deg,#FFCC00,#FFA500)',
    prefix:  '237',
    hint:    'e.g. 6XXXXXXXX',
    needsPhone: true,
  },
  {
    id:      'ORANGE_MONEY',
    label:   'Orange Money',
    icon:    '🟠',
    color:   '#FF6600',
    textColor:'white',
    bg:      'linear-gradient(135deg,#FF6600,#FF3300)',
    prefix:  '237',
    hint:    'e.g. 6XXXXXXXX',
    needsPhone: true,
  },
  {
    id:      'WAVE',
    label:   'Wave',
    icon:    '🌊',
    color:   '#1DC8EE',
    textColor:'white',
    bg:      'linear-gradient(135deg,#1DC8EE,#0099CC)',
    prefix:  '221',
    hint:    'e.g. 7XXXXXXXX',
    needsPhone: true,
  },
  {
    id:      'CREDIT_CARD',
    label:   'Credit / Debit Card',
    icon:    '💳',
    color:   '#7C3AED',
    textColor:'white',
    bg:      'linear-gradient(135deg,#7C3AED,#A855F7)',
    needsPhone: false,
  },
];

// ── Format XAF ────────────────────────────────────────────────────────────────
function formatXAF(amount) {
  return new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(amount);
}

// ── Payment status poller ────────────────────────────────────────────────────
function usePaymentPoller(transactionId, onComplete) {
  useEffect(() => {
    if (!transactionId) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 24; // poll for up to 2 minutes

    const poll = async () => {
      try {
        const res = await api.get(`/cinetpay/check/${transactionId}`);
        const { status } = res.data;
        if (status === 'paid' || status === 'failed') {
          onComplete(res.data);
          return;
        }
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 5000); // poll every 5 seconds
        } else {
          onComplete({ status: 'timeout' });
        }
      } catch {
        attempts++;
        if (attempts < MAX_ATTEMPTS) setTimeout(poll, 5000);
      }
    };

    setTimeout(poll, 3000); // start polling after 3s
  }, [transactionId, onComplete]);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAYMENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
export function CinetPayModal({ amount, currency = 'XAF', description, platform, campaignId, onSuccess, onClose }) {
  const [step,          setStep]          = useState('channel');  // channel | phone | processing | redirect | success | failed
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [phone,         setPhone]         = useState('');
  const [customerName,  setCustomerName]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentUrl,    setPaymentUrl]    = useState('');
  const [configured,    setConfigured]    = useState(true);
  const [pollResult,    setPollResult]    = useState(null);

  useEffect(() => {
    api.get('/cinetpay/status')
      .then(res => setConfigured(res.data.configured))
      .catch(() => setConfigured(false));
  }, []);

  // Poll for payment completion
  usePaymentPoller(transactionId, (result) => {
    setPollResult(result);
    if (result.status === 'paid') {
      setStep('success');
      onSuccess?.(result);
    } else if (result.status === 'failed') {
      setStep('failed');
      setError('Payment was not completed. Please try again.');
    } else if (result.status === 'timeout') {
      setStep('redirect'); // Keep showing redirect, let user check manually
    }
  });

  const channel = CHANNELS.find(c => c.id === selectedChannel);

  const handleInitiate = async () => {
    if (!selectedChannel) return;
    if (channel?.needsPhone && !phone.trim()) { setError('Phone number is required'); return; }
    setLoading(true); setError('');

    try {
      const res = await api.post('/cinetpay/initiate', {
        amount,
        currency,
        description,
        platform,
        campaignId,
        channel:      selectedChannel,
        phoneNumber:  phone ? `+${channel.prefix}${phone.replace(/^0+/,'')}` : undefined,
        customerName: customerName || undefined,
      });

      setTransactionId(res.data.transactionId);
      setPaymentUrl(res.data.paymentUrl);

      if (selectedChannel === 'CREDIT_CARD' || !channel?.needsPhone) {
        // Open payment URL in new tab for cards
        window.open(res.data.paymentUrl, '_blank');
        setStep('redirect');
      } else {
        // Mobile money — show instructions
        setStep('redirect');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  const handleCheckManually = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const res = await api.get(`/cinetpay/check/${transactionId}`);
      if (res.data.status === 'paid') {
        setStep('success');
        onSuccess?.(res.data);
      } else if (res.data.status === 'failed') {
        setStep('failed');
        setError('Payment was declined or cancelled.');
      } else {
        setError('Payment is still pending. Please complete it and check again.');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={step === 'channel' ? onClose : undefined}>
      <div className="glass-card" style={{ padding:32, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>
              Add Funds
            </h3>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--purple-light)' }}>
              {formatXAF(amount)}
            </div>
          </div>
          {(step === 'channel' || step === 'phone') && (
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:22, padding:0 }}>✕</button>
          )}
        </div>

        {/* ── Not configured ── */}
        {!configured && (
          <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.25)', fontSize:13, color:'#d97706', lineHeight:1.7 }}>
            <strong>⚙️ CinetPay not configured.</strong><br/>
            Add to <code>server/.env</code>:<br/>
            <code>CINETPAY_SITE_ID=your_site_id</code><br/>
            <code>CINETPAY_API_KEY=your_api_key</code><br/><br/>
            Get keys at <a href="https://cinetpay.com" target="_blank" rel="noopener noreferrer" style={{ color:'#d97706' }}>cinetpay.com</a>
          </div>
        )}

        {/* ── Step 1: Choose channel ── */}
        {step === 'channel' && configured && (
          <>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 18px', lineHeight:1.6 }}>
              Choose your payment method:
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {CHANNELS.map(ch => (
                <div key={ch.id} onClick={() => { setSelectedChannel(ch.id); setError(''); }}
                  style={{ padding:'16px 18px', borderRadius:14, cursor:'pointer', transition:'all 0.15s',
                    border:`2px solid ${selectedChannel===ch.id ? ch.color : 'var(--border-subtle)'}`,
                    background: selectedChannel===ch.id ? `${ch.color}15` : 'var(--bg-elevated)',
                    display:'flex', alignItems:'center', gap:14 }}>
                  {/* Icon */}
                  <div style={{ width:46, height:46, borderRadius:12, background:ch.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {ch.icon}
                  </div>
                  {/* Label */}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{ch.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>
                      {ch.needsPhone ? 'Enter your phone number to pay' : 'Visa, Mastercard, etc.'}
                    </div>
                  </div>
                  {/* Selected indicator */}
                  <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${selectedChannel===ch.id ? ch.color : 'var(--border-subtle)'}`, background:selectedChannel===ch.id ? ch.color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {selectedChannel===ch.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
              ))}
            </div>

            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}

            <button className="btn-primary" onClick={() => { if (!selectedChannel) { setError('Please select a payment method'); return; } setStep('phone'); setError(''); }}
              disabled={!selectedChannel}
              style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:15 }}>
              Continue →
            </button>
          </>
        )}

        {/* ── Step 2: Phone number / confirm ── */}
        {step === 'phone' && configured && (
          <>
            {/* Selected channel badge */}
            <div style={{ padding:'12px 16px', borderRadius:12, background:`${channel?.color}15`, border:`1px solid ${channel?.color}44`, marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:channel?.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {channel?.icon}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{channel?.label}</div>
                <div style={{ fontSize:11, color:'var(--text-faint)' }}>
                  {channel?.needsPhone ? `Country code +${channel.prefix} will be added automatically` : 'You will be redirected to complete payment'}
                </div>
              </div>
              <button onClick={() => { setStep('channel'); setError(''); }}
                style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:12, fontWeight:600, flexShrink:0 }}>
                Change
              </button>
            </div>

            {/* Phone number for mobile money */}
            {channel?.needsPhone && (
              <div style={{ marginBottom:16 }}>
                <label className="form-label">Phone Number *</label>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:13, fontWeight:700, color:'var(--text-primary)', flexShrink:0 }}>
                    +{channel.prefix}
                  </div>
                  <input className="form-input" type="tel" placeholder={channel.hint}
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/,'').slice(0,9))}
                    style={{ flex:1 }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
                  You will receive a payment prompt on this number
                </div>
              </div>
            )}

            {/* Customer name */}
            <div style={{ marginBottom:20 }}>
              <label className="form-label">Full Name (optional)</label>
              <input className="form-input" placeholder="Your full name"
                value={customerName} onChange={e => setCustomerName(e.target.value)}/>
            </div>

            {/* Amount summary */}
            <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>Amount to pay</div>
                <div style={{ fontSize:20, fontWeight:900, color:'var(--text-primary)' }}>{formatXAF(amount)}</div>
              </div>
              {description && (
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>{description}</div>
              )}
            </div>

            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={() => { setStep('channel'); setError(''); }} style={{ flex:1, justifyContent:'center' }}>← Back</button>
              <button className="btn-primary" onClick={handleInitiate} disabled={loading || (channel?.needsPhone && !phone.trim())}
                style={{ flex:2, justifyContent:'center', padding:'12px 0', fontSize:15, background:`linear-gradient(135deg,${channel?.color||'#7c3aed'},${channel?.color||'#a855f7'})` }}>
                {loading ? '⏳ Processing...' : `${channel?.icon} Pay ${formatXAF(amount)}`}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Redirect / waiting ── */}
        {step === 'redirect' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>{channel?.icon || '📱'}</div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 12px' }}>
              {channel?.needsPhone && selectedChannel !== 'CREDIT_CARD'
                ? 'Check Your Phone'
                : 'Complete Payment'}
            </h3>

            {/* Mobile money instructions */}
            {channel?.needsPhone && selectedChannel !== 'CREDIT_CARD' && (
              <div style={{ padding:'16px 20px', borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:20, textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:12 }}>Follow these steps:</div>
                {selectedChannel === 'MOBILE_MONEY' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {['Open your MTN MoMo app or dial *126#', 'Select "Pay a Bill" or wait for a push notification', `Enter the amount: ${formatXAF(amount)}`, 'Enter your MoMo PIN to confirm'].map((s,i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,204,0,0.2)', border:'1px solid #FFCC00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#FFCC00', flexShrink:0 }}>{i+1}</div>
                        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedChannel === 'ORANGE_MONEY' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {['Dial #150# or open Orange Money app', 'Select "Payer une facture"', `Enter amount: ${formatXAF(amount)}`, 'Enter your Orange Money PIN'].map((s,i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,102,0,0.2)', border:'1px solid #FF6600', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#FF6600', flexShrink:0 }}>{i+1}</div>
                        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedChannel === 'WAVE' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {['Open the Wave app on your phone', 'Tap "Send" and enter the merchant code', `Confirm the amount: ${formatXAF(amount)}`, 'Approve the transaction'].map((s,i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(29,200,238,0.2)', border:'1px solid #1DC8EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#1DC8EE', flexShrink:0 }}>{i+1}</div>
                        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Card redirect notice */}
            {selectedChannel === 'CREDIT_CARD' && (
              <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:20, fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
                A secure payment page has opened in a new tab. Complete your card payment there, then come back and click "I've Paid" below.
                <br/><br/>
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer" style={{ color:'var(--purple-light)', fontWeight:600 }}>
                  Click here if it didn't open →
                </a>
              </div>
            )}

            {/* Polling indicator */}
            <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginBottom:20, fontSize:13, color:'var(--text-muted)' }}>
              <div style={{ width:14, height:14, border:'2px solid var(--border-subtle)', borderTopColor:'var(--purple-primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              Waiting for payment confirmation...
            </div>

            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
              <button className="btn-primary" onClick={handleCheckManually} disabled={loading}
                style={{ flex:2, justifyContent:'center' }}>
                {loading ? '⏳ Checking...' : "✓ I've Paid"}
              </button>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <h3 style={{ fontSize:22, fontWeight:800, color:'#16a34a', margin:'0 0 12px' }}>Payment Confirmed!</h3>
            <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
              <strong>{formatXAF(amount)}</strong> received via <strong>{channel?.label}</strong>.
              <br/>An invoice has been generated in your Ad Spend page.
            </p>
            <button className="btn-primary" onClick={onClose}
              style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:15 }}>
              Done →
            </button>
          </div>
        )}

        {/* ── Failed ── */}
        {step === 'failed' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>❌</div>
            <h3 style={{ fontSize:20, fontWeight:800, color:'#ef4444', margin:'0 0 12px' }}>Payment Failed</h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
              {error || 'Your payment could not be processed. Please try again.'}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
              <button className="btn-primary" onClick={() => { setStep('channel'); setSelectedChannel(null); setPhone(''); setError(''); setTransactionId(''); }}
                style={{ flex:2, justifyContent:'center' }}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
