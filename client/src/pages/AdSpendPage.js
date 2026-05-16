import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { CinetPayModal } from '../components/billing/CinetPayModal';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import api from '../utils/api';

const STATUS_STYLES = {
  paid:    { color:'#16a34a', bg:'rgba(22,163,74,0.1)',   border:'rgba(22,163,74,0.25)'   },
  pending: { color:'#d97706', bg:'rgba(217,119,6,0.1)',   border:'rgba(217,119,6,0.25)'   },
  failed:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.25)'   },
  refunded:{ color:'#6b7280', bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.25)' },
};

const CHANNEL_ICONS = {
  'MTN Mobile Money':   '📱',
  'Orange Money':       '🟠',
  'Wave':               '🌊',
  'Credit / Debit Card':'💳',
  'Mobile Money':       '📱',
};

function formatXAF(amount, currency = 'XAF') {
  return new Intl.NumberFormat('fr-CM', {
    style:'currency', currency: currency || 'XAF', maximumFractionDigits:0
  }).format(amount);
}

export default function AdSpendPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab,   setActiveTab]   = useState('overview');
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount,   setPayAmount]   = useState('');
  const [payDesc,     setPayDesc]     = useState('');
  const [generating,  setGenerating]  = useState(false);
  const [toast,       setToast]       = useState({ msg:'', type:'info' });

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 5000);
  };

  // Handle return from CinetPay redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      showToast('✅ Payment completed! Invoice generated.', 'success');
      setSearchParams({});
      fetchData();
    } else if (payment === 'cancelled') {
      showToast('Payment was cancelled.', 'info');
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/cinetpay/invoices');
      setInvoices(res.data.invoices || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/invoices/generate', {
        period: { start: new Date(Date.now()-30*86400000).toISOString(), end: new Date().toISOString() }
      });
      showToast(`✅ ${res.data.created} invoice${res.data.created!==1?'s':''} generated`, 'success');
      fetchData();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
    finally { setGenerating(false); }
  };

  const downloadInvoice = (invoice) => {
    const lines = [
      '╔══════════════════════════════════════════╗',
      '║           ADSPULSE — INVOICE             ║',
      '╚══════════════════════════════════════════╝',
      '',
      `Invoice #:    ${invoice.invoiceNumber}`,
      `Date:         ${new Date(invoice.createdAt).toLocaleDateString('fr-CM')}`,
      `Platform:     ${PLATFORMS.find(p=>p.id===invoice.platform)?.name || invoice.platform || 'Général'}`,
      `Status:       ${invoice.status?.toUpperCase()}`,
      `Method:       ${invoice.paymentMethod || 'N/A'}`,
      `Amount:       ${formatXAF(invoice.amount, invoice.currency)}`,
      '',
      '── Line Items ──────────────────────────────',
      ...(invoice.lines||[]).map(l=>`  · ${l.description||'Ad Spend'}: ${formatXAF(l.amount||0, l.currency)}`),
      '',
      `Transaction:  ${invoice.cinetpayTransactionId || 'N/A'}`,
      `Paid at:      ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('fr-CM') : 'N/A'}`,
      '════════════════════════════════════════════',
      'AdsPulse — Cross-Platform Ads Management',
    ].join('\n');

    const blob = new Blob([lines], { type:'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${invoice.invoiceNumber}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // Totals
  const totalPaid    = invoices.reduce((s,i) => s+(i.status==='paid' ? i.amount:0), 0);
  const totalPending = invoices.reduce((s,i) => s+(i.status==='pending'?i.amount:0), 0);

  // Platform spending breakdown
  const byPlatform = PLATFORMS.map(pl => ({
    ...pl,
    spent: invoices.filter(i=>i.platform===pl.id && i.status==='paid').reduce((s,i)=>s+i.amount,0),
    count: invoices.filter(i=>i.platform===pl.id).length,
  })).filter(p => p.spent > 0 || p.count > 0);

  const toastStyles = {
    success:{ bg:'rgba(22,163,74,0.12)',  border:'rgba(22,163,74,0.3)'  },
    error:  { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
    info:   { bg:'rgba(37,99,235,0.1)',   border:'rgba(37,99,235,0.25)' },
  };

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:400, padding:'14px 18px', borderRadius:12, background:toastStyles[toast.type]?.bg, border:`1px solid ${toastStyles[toast.type]?.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={()=>setToast({msg:'',type:'info'})} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:18, padding:0 }}>✕</button>
        </div>
      )}

      {/* CinetPay Payment Modal */}
      {showPayment && (
        <CinetPayModal
          amount={parseFloat(payAmount) || 5000}
          currency="XAF"
          description={payDesc || 'AdsPulse ad spend top-up'}
          platform="general"
          onSuccess={() => { fetchData(); setShowPayment(false); }}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Spend</h1>
          <p className="page-subtitle">Manage payments via MTN MoMo, Orange Money, Wave and cards</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={handleGenerateInvoices} disabled={generating} style={{ fontSize:13 }}>
            {generating ? '⏳ Generating...' : '🧾 Generate Invoices'}
          </button>
          <button className="btn-primary" onClick={() => setShowPayment(true)} style={{ fontSize:13 }}>
            💸 Add Funds
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { label:'Total Paid',    value:formatXAF(totalPaid),    icon:'✅', color:'#16a34a' },
          { label:'Pending',       value:formatXAF(totalPending),  icon:'⏳', color:'#d97706' },
          { label:'Invoices',      value:invoices.length,          icon:'🧾', color:'#3b82f6' },
          { label:'Paid Invoices', value:invoices.filter(i=>i.status==='paid').length, icon:'💰', color:'#7c3aed' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding:'18px 20px' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Add Funds panel */}
      <div className="glass-card" style={{ padding:24, marginBottom:24, border:'1px solid rgba(124,58,237,0.2)', background:'rgba(124,58,237,0.04)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px' }}>
          💸 Quick Top-Up
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:12, alignItems:'end', flexWrap:'wrap' }}>
          <div>
            <label className="form-label">Amount (XAF)</label>
            <input className="form-input" type="number" placeholder="e.g. 25000"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} min="100"/>
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="e.g. Meta campaign budget"
              value={payDesc} onChange={e => setPayDesc(e.target.value)}/>
          </div>
          <button className="btn-primary" onClick={() => { if (!payAmount || parseFloat(payAmount)<100) { showToast('❌ Minimum 100 XAF','error'); return; } setShowPayment(true); }} style={{ height:42 }}>
            Pay Now
          </button>
        </div>

        {/* Quick amount buttons */}
        <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
          <div style={{ fontSize:12, color:'var(--text-faint)', alignSelf:'center', marginRight:4 }}>Quick amounts:</div>
          {[5000,10000,25000,50000,100000].map(amt => (
            <button key={amt} onClick={() => setPayAmount(String(amt))}
              style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${payAmount===String(amt)?'var(--purple-primary)':'var(--border-subtle)'}`, background:payAmount===String(amt)?'rgba(124,58,237,0.1)':'var(--bg-elevated)', color:payAmount===String(amt)?'var(--purple-light)':'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}>
              {formatXAF(amt)}
            </button>
          ))}
        </div>

        {/* Payment channels */}
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          {[
            { icon:'📱', label:'MTN MoMo', color:'#FFCC00' },
            { icon:'🟠', label:'Orange Money', color:'#FF6600' },
            { icon:'🌊', label:'Wave', color:'#1DC8EE' },
            { icon:'💳', label:'Card', color:'#7C3AED' },
          ].map(ch => (
            <div key={ch.label} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'var(--bg-elevated)', border:`1px solid ${ch.color}44`, fontSize:12, color:'var(--text-muted)' }}>
              <span>{ch.icon}</span>
              <span>{ch.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[{id:'overview',label:'📊 Overview'},{id:'invoices',label:'🧾 Invoices'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'8px 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background: activeTab===tab.id?'var(--bg-card)':'transparent',
            color: activeTab===tab.id?'var(--text-primary)':'var(--text-faint)',
            boxShadow: activeTab===tab.id?'0 2px 8px rgba(0,0,0,0.1)':'none', transition:'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:70,borderRadius:12 }}/>)}
        </div>

      ) : activeTab === 'overview' ? (
        <>
          {byPlatform.length === 0 ? (
            <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No Spend Data Yet</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Add funds and connect your platforms to see spending per platform.
              </p>
              <button className="btn-primary" onClick={() => setShowPayment(true)}>💸 Add Funds</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
              {byPlatform.map(pl => {
                const Icon = PlatformIcons[pl.id];
                return (
                  <div key={pl.id} className="glass-card" style={{ padding:22, border:`1px solid ${pl.color}33` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        {Icon && <Icon size={26}/>}
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{pl.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:800, color:'#ef4444', marginBottom:4 }}>
                      {formatXAF(pl.spent)}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-faint)' }}>{pl.count} invoice{pl.count!==1?'s':''}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>

      ) : (
        /* Invoices tab */
        <div className="glass-card" style={{ padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
              Invoice History ({invoices.length})
            </h3>
            {invoices.length > 0 && (
              <button className="btn-secondary" style={{ fontSize:12 }}
                onClick={() => invoices.forEach((inv,i) => setTimeout(()=>downloadInvoice(inv), i*100))}>
                📥 Download All
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-faint)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
              <div style={{ fontWeight:600, marginBottom:8 }}>No invoices yet</div>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                Invoices are created automatically when you make a payment.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button className="btn-primary" onClick={() => setShowPayment(true)}>💸 Add Funds</button>
                <button className="btn-secondary" onClick={handleGenerateInvoices} disabled={generating}>
                  {generating?'⏳ Generating...':'🧾 Generate from Campaigns'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {/* Table header */}
              <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 130px 110px 110px 60px', gap:12, padding:'8px 14px', borderBottom:'1px solid var(--border-subtle)' }}>
                {['Invoice #','Description','Amount','Status','Date',''].map(h => (
                  <div key={h} style={{ fontSize:11, color:'var(--text-faint)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</div>
                ))}
              </div>

              {invoices.map((inv, idx) => {
                const Icon   = PlatformIcons[inv.platform];
                const pl     = PLATFORMS.find(p=>p.id===inv.platform);
                const st     = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                const chIcon = CHANNEL_ICONS[inv.paymentMethod] || '💳';

                return (
                  <div key={inv._id} style={{ display:'grid', gridTemplateColumns:'130px 1fr 130px 110px 110px 60px', gap:12, padding:'14px', borderBottom: idx<invoices.length-1?'1px solid var(--border-subtle)':'none', alignItems:'center', background: idx%2===0?'transparent':'rgba(0,0,0,0.02)' }}>
                    {/* Invoice # */}
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', fontFamily:'DM Mono,monospace' }}>{inv.invoiceNumber}</div>

                    {/* Description */}
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                        {Icon && <Icon size={14}/>}
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{pl?.name || inv.platform || 'General'}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-faint)' }}>
                        {chIcon} {inv.paymentMethod || 'Mobile Money'}
                        {inv.cinetpayTransactionId && ` · ${inv.cinetpayTransactionId.slice(-8)}`}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
                      {formatXAF(inv.amount, inv.currency)}
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, textTransform:'uppercase' }}>
                        {inv.status}
                      </span>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {new Date(inv.createdAt).toLocaleDateString('fr-CM')}
                    </div>

                    {/* Download */}
                    <div>
                      <button onClick={() => downloadInvoice(inv)}
                        style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11 }} title="Download">
                        📥
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
