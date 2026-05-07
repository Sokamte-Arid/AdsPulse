import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/shared/Layout';
import { PlatformIcons, PLATFORMS, formatKPI } from '../utils/platforms';
import api from '../utils/api';

const CARD_BRANDS = {
  visa:       { label:'Visa',       color:'#1a1f71', bg:'linear-gradient(135deg,#1a1f71,#2563eb)' },
  mastercard: { label:'Mastercard', color:'#eb001b', bg:'linear-gradient(135deg,#eb001b,#f79e1b)' },
  amex:       { label:'Amex',       color:'#2e77bc', bg:'linear-gradient(135deg,#2e77bc,#0a3d7c)' },
  other:      { label:'Card',       color:'#7c3aed', bg:'linear-gradient(135deg,#7c3aed,#a855f7)' },
};

function PaymentCard({ method, onSetDefault, onDelete, isDefault }) {
  const brand = CARD_BRANDS[method.brand?.toLowerCase()] || CARD_BRANDS.other;
  const isExpired = method.type === 'card' && method.expYear && (
    method.expYear < new Date().getFullYear() ||
    (method.expYear === new Date().getFullYear() && method.expMonth < new Date().getMonth() + 1)
  );

  return (
    <div style={{
      borderRadius:16, overflow:'hidden',
      border:`2px solid ${isDefault ? 'var(--purple-primary)' : isExpired ? 'rgba(239,68,68,0.4)' : 'var(--border-subtle)'}`,
      background:'var(--bg-card)', transition:'all 0.2s',
      boxShadow: isDefault ? '0 0 0 1px rgba(124,58,237,0.2), 0 8px 24px rgba(124,58,237,0.12)' : 'var(--shadow-card)'
    }}>
      {/* Card visual */}
      <div style={{ padding:'20px 22px', background: method.type === 'card' ? brand.bg : 'linear-gradient(135deg,#1e1030,#2d1b69)', position:'relative', minHeight:120 }}>
        {isDefault && (
          <div style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, color:'white' }}>
            DEFAULT
          </div>
        )}
        {isExpired && (
          <div style={{ position:'absolute', top:12, right:12, background:'rgba(239,68,68,0.8)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, color:'white' }}>
            EXPIRED
          </div>
        )}
        <div style={{ fontSize:28, marginBottom:16 }}>
          {method.type === 'paypal' ? '🅿️' : method.type === 'bank' ? '🏦' : '💳'}
        </div>
        {method.type === 'card' && (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.6)', letterSpacing:4, marginBottom:10, fontFamily:'DM Mono,monospace' }}>
              •••• •••• •••• {method.last4}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:2 }}>Card Holder</div>
                <div style={{ fontSize:13, fontWeight:600, color:'white' }}>{method.holderName || 'Card Holder'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:2 }}>Expires</div>
                <div style={{ fontSize:13, fontWeight:600, color: isExpired ? '#fca5a5' : 'white' }}>
                  {String(method.expMonth).padStart(2,'0')}/{String(method.expYear).slice(-2)}
                </div>
              </div>
            </div>
          </>
        )}
        {method.type === 'paypal' && (
          <div style={{ fontSize:14, fontWeight:600, color:'white' }}>{method.paypalEmail}</div>
        )}
        {method.type === 'bank' && (
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'white' }}>{method.bankName}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:4, fontFamily:'DM Mono,monospace' }}>•••• •••• {method.accountLast4}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding:'14px 16px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        {method.nickname && <div style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>"{method.nickname}"</div>}
        {!isDefault && !isExpired && (
          <button onClick={() => onSetDefault(method._id)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            Set Default
          </button>
        )}
        <button onClick={() => onDelete(method._id, method)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11, fontWeight:600 }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function AddPaymentMethodModal({ onClose, onAdd }) {
  const [type, setType] = useState('card');
  const [form, setForm] = useState({ brand:'visa', last4:'', expMonth:'', expYear:'', holderName:'', paypalEmail:'', bankName:'', accountLast4:'', nickname:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      await onAdd({ ...form, type });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div className="glass-card" style={{ padding:32, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 20px' }}>Add Payment Method</h3>

        {/* Type selector */}
        <div style={{ display:'flex', gap:8, marginBottom:22 }}>
          {[{id:'card',icon:'💳',label:'Card'},{id:'paypal',icon:'🅿️',label:'PayPal'},{id:'bank',icon:'🏦',label:'Bank'}].map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`2px solid ${type===t.id?'var(--purple-primary)':'var(--border-subtle)'}`, background:type===t.id?'var(--bg-hover)':'var(--bg-elevated)', color:type===t.id?'var(--purple-light)':'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'DM Sans,sans-serif' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {type === 'card' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="form-label">Card Brand</label>
              <select className="form-input" value={form.brand} onChange={e => update('brand', e.target.value)}>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Card Holder Name</label>
              <input className="form-input" placeholder="Full name on card" value={form.holderName} onChange={e => update('holderName', e.target.value)}/>
            </div>
            <div>
              <label className="form-label">Last 4 Digits</label>
              <input className="form-input" placeholder="4242" maxLength={4} value={form.last4} onChange={e => update('last4', e.target.value.replace(/\D/g,'').slice(0,4))}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="form-label">Expiry Month</label>
                <select className="form-input" value={form.expMonth} onChange={e => update('expMonth', e.target.value)}>
                  <option value="">Month</option>
                  {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Expiry Year</label>
                <select className="form-input" value={form.expYear} onChange={e => update('expYear', e.target.value)}>
                  <option value="">Year</option>
                  {Array.from({length:10},(_,i)=><option key={i} value={new Date().getFullYear()+i}>{new Date().getFullYear()+i}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {type === 'paypal' && (
          <div>
            <label className="form-label">PayPal Email</label>
            <input className="form-input" type="email" placeholder="your@paypal.com" value={form.paypalEmail} onChange={e => update('paypalEmail', e.target.value)}/>
          </div>
        )}

        {type === 'bank' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="form-label">Bank Name</label>
              <input className="form-input" placeholder="e.g. Société Générale" value={form.bankName} onChange={e => update('bankName', e.target.value)}/>
            </div>
            <div>
              <label className="form-label">Last 4 Digits of Account</label>
              <input className="form-input" placeholder="1234" maxLength={4} value={form.accountLast4} onChange={e => update('accountLast4', e.target.value.replace(/\D/g,'').slice(0,4))}/>
            </div>
          </div>
        )}

        <div style={{ marginTop:14 }}>
          <label className="form-label">Nickname (optional)</label>
          <input className="form-input" placeholder="e.g. Company Card, Personal Visa..." value={form.nickname} onChange={e => update('nickname', e.target.value)}/>
        </div>

        {error && <div style={{ padding:'10px 14px', borderRadius:8, marginTop:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}

        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex:2, justifyContent:'center' }}>
            {loading ? '⏳ Adding...' : '✓ Add Payment Method'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Generate PDF-like invoice
function downloadInvoicePDF(invoice) {
  const pl = PLATFORMS.find(p => p.id === invoice.platform);
  const content = `
ADSPULSE — INVOICE
==================

Invoice #:    ${invoice.invoiceNumber}
Date:         ${new Date(invoice.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
Platform:     ${pl?.name || invoice.platform}
Status:       ${invoice.status?.toUpperCase()}
Payment:      ${invoice.paymentMethod || 'N/A'}

Period:       ${invoice.period?.start ? new Date(invoice.period.start).toLocaleDateString() : '—'} to ${invoice.period?.end ? new Date(invoice.period.end).toLocaleDateString() : '—'}

LINE ITEMS:
-----------
${(invoice.lines || []).map(l => `${l.description || 'Ad Spend'}\n  Campaign: ${l.campaignName || 'N/A'}\n  Amount:   $${(l.amount||0).toFixed(2)} ${l.currency||'USD'}`).join('\n\n')}

-----------
TOTAL:        $${invoice.amount?.toFixed(2)} ${invoice.currency || 'USD'}

Paid at:      ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : 'N/A'}

==================
AdsPulse Cross-Platform Ads Manager
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.invoiceNumber}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdSpendPage() {
  const [activeTab, setActiveTab]   = useState('overview');
  const [invoices, setInvoices]     = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [generating, setGenerating]  = useState(false);
  const [toast, setToast]            = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const fetchData = useCallback(async () => {
    try {
      const [invRes, pmRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/payment-methods')
      ]);
      setInvoices(invRes.data.invoices || []);
      setPayMethods(pmRes.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddMethod = async (data) => {
    const res = await api.post('/payment-methods', data);
    setPayMethods(m => [...m, res.data]);
    showToast('✅ Payment method added successfully');
  };

  const handleSetDefault = async (id) => {
    await api.patch(`/payment-methods/${id}/set-default`);
    setPayMethods(ms => ms.map(m => ({ ...m, isDefault: m._id === id })));
    showToast('✅ Default payment method updated');
  };

  const handleDelete = async (id, method) => {
    const label = method.type === 'card' ? `${method.brand} ****${method.last4}` : method.type === 'paypal' ? method.paypalEmail : `${method.bankName} account`;
    if (!window.confirm(`Remove ${label}?`)) return;
    await api.delete(`/payment-methods/${id}`);
    setPayMethods(ms => ms.filter(m => m._id !== id));
    showToast('Payment method removed');
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/invoices/generate', {
        period: { start: new Date(Date.now() - 30 * 86400000).toISOString(), end: new Date().toISOString() }
      });
      showToast(`✅ ${res.data.created} invoice${res.data.created !== 1 ? 's' : ''} generated from campaign data`);
      fetchData();
    } catch (err) { showToast('❌ ' + err.message); }
    finally { setGenerating(false); }
  };

  const totalSpent   = invoices.reduce((s, i) => s + (i.status === 'paid' ? i.amount : 0), 0);
  const totalPending = invoices.reduce((s, i) => s + (i.status === 'pending' ? i.amount : 0), 0);
  const defaultMethod = payMethods.find(m => m.isDefault);

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', maxWidth:380 }}>
          {toast}
        </div>
      )}

      {showAddCard && <AddPaymentMethodModal onClose={() => setShowAddCard(false)} onAdd={handleAddMethod}/>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Spend</h1>
          <p className="page-subtitle">Manage budgets, payment methods and invoices</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={handleGenerateInvoices} disabled={generating} style={{ fontSize:13 }}>
            {generating ? '⏳ Generating...' : '🧾 Generate Invoices'}
          </button>
          <button className="btn-primary" onClick={() => setShowAddCard(true)} style={{ fontSize:13 }}>
            + Add Payment Method
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { label:'Total Spent',      value:formatKPI(totalSpent,'currency'),   icon:'💸', color:'#ef4444' },
          { label:'Pending',          value:formatKPI(totalPending,'currency'), icon:'⏳', color:'#d97706' },
          { label:'Invoices',         value:invoices.length,                    icon:'🧾', color:'#3b82f6' },
          { label:'Payment Methods',  value:payMethods.length,                  icon:'💳', color:'#7c3aed' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding:'18px 20px' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Default payment method banner */}
      {defaultMethod && (
        <div style={{ padding:'14px 20px', borderRadius:12, marginBottom:20, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}>💳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Default Payment Method</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {defaultMethod.type === 'card'
                ? `${defaultMethod.brand?.toUpperCase()} ending in ${defaultMethod.last4} · Expires ${String(defaultMethod.expMonth).padStart(2,'0')}/${defaultMethod.expYear}`
                : defaultMethod.type === 'paypal'
                ? `PayPal — ${defaultMethod.paypalEmail}`
                : `${defaultMethod.bankName} — ****${defaultMethod.accountLast4}`}
              {defaultMethod.nickname ? ` (${defaultMethod.nickname})` : ''}
            </div>
          </div>
          <div style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'rgba(22,163,74,0.1)', color:'#16a34a', border:'1px solid rgba(22,163,74,0.3)', fontWeight:700 }}>
            ACTIVE
          </div>
        </div>
      )}

      {!defaultMethod && !loading && (
        <div style={{ padding:'14px 20px', borderRadius:12, marginBottom:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1, fontSize:13, color:'#ef4444' }}>
            <strong>No payment method added.</strong> Add one to launch campaigns and receive fund notifications.
          </div>
          <button className="btn-primary" onClick={() => setShowAddCard(true)} style={{ fontSize:12 }}>Add Now</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[{id:'overview',label:'Overview'},{id:'payment-methods',label:'Payment Methods'},{id:'invoices',label:'Invoices'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'8px 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background:activeTab===tab.id?'var(--bg-card)':'transparent',
            color:activeTab===tab.id?'var(--text-primary)':'var(--text-faint)',
            boxShadow:activeTab===tab.id?'0 2px 8px rgba(0,0,0,0.1)':'none', transition:'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)}
        </div>
      ) : activeTab === 'payment-methods' ? (
        <div>
          {payMethods.length === 0 ? (
            <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>💳</div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No Payment Methods</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px' }}>Add a payment method to fund your ad campaigns.</p>
              <button className="btn-primary" onClick={() => setShowAddCard(true)}>+ Add Payment Method</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {payMethods.map(m => (
                <PaymentCard key={m._id} method={m} isDefault={m.isDefault} onSetDefault={handleSetDefault} onDelete={handleDelete}/>
              ))}
              <div onClick={() => setShowAddCard(true)} style={{ borderRadius:16, border:'2px dashed var(--border-subtle)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, cursor:'pointer', transition:'all 0.2s', minHeight:200 }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--purple-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
                <div style={{ fontSize:36, marginBottom:10 }}>+</div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>Add Payment Method</div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'invoices' ? (
        <div className="glass-card" style={{ padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
              Invoice History ({invoices.length})
            </h3>
            {invoices.length > 0 && (
              <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => { invoices.forEach(inv => setTimeout(() => downloadInvoicePDF(inv), 100)); }}>
                📥 Download All
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-faint)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
              <div style={{ fontWeight:600, marginBottom:8 }}>No invoices yet</div>
              <div style={{ fontSize:13, marginBottom:20 }}>Click "Generate Invoices" to create records from your campaign spend data.</div>
              <button className="btn-primary" onClick={handleGenerateInvoices} disabled={generating}>
                {generating ? '⏳ Generating...' : '🧾 Generate Invoices'}
              </button>
            </div>
          ) : (
            <div className="responsive-table">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice #','Platform','Amount','Status','Period','Payment Method','Download'].map(h => (
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, color:'var(--text-faint)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border-subtle)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const Icon = PlatformIcons[inv.platform];
                    const pl = PLATFORMS.find(p => p.id === inv.platform);
                    return (
                      <tr key={inv._id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                        <td style={{ padding:'12px 14px', fontSize:12, fontWeight:700, color:'var(--text-primary)', fontFamily:'DM Mono,monospace' }}>{inv.invoiceNumber}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {Icon && <Icon size={16}/>}
                            <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:600 }}>{pl?.name || inv.platform || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>${inv.amount?.toFixed(2)}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span className={`status-${inv.status === 'paid' ? 'active' : inv.status === 'pending' ? 'paused' : 'draft'}`} style={{ fontSize:10 }}>
                            {inv.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                          {inv.period?.start ? new Date(inv.period.start).toLocaleDateString() : '—'} – {inv.period?.end ? new Date(inv.period.end).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-muted)' }}>
                          {inv.paymentMethod || '—'}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <button onClick={() => downloadInvoicePDF(inv)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                            📥 Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Overview tab — spend by platform
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {PLATFORMS.map(pl => {
            const Icon = PlatformIcons[pl.id];
            const plInvoices = invoices.filter(i => i.platform === pl.id);
            const spent = plInvoices.reduce((s, i) => s + (i.status === 'paid' ? i.amount : 0), 0);
            if (spent === 0 && plInvoices.length === 0) return null;
            return (
              <div key={pl.id} className="glass-card" style={{ padding:22, border:`1px solid ${pl.color}33` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {Icon && <Icon size={26}/>}
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{pl.name}</div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#ef4444' }}>${spent.toFixed(0)}</div>
                </div>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>{plInvoices.length} invoice{plInvoices.length !== 1 ? 's' : ''}</div>
              </div>
            );
          }).filter(Boolean)}

          {invoices.length === 0 && (
            <div className="glass-card" style={{ padding:48, textAlign:'center', gridColumn:'1/-1' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>💳</div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No Spend Data Yet</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px' }}>Generate invoices from your campaign data or connect a platform and sync.</p>
              <button className="btn-primary" onClick={handleGenerateInvoices} disabled={generating}>🧾 Generate from Campaign Data</button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
