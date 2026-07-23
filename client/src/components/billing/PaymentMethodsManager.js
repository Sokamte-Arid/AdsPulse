import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { AlertCircle, AlertTriangle, Check, CheckCircle, Close, CreditCard, DynIcon, Edit, Info, Lock, Plus, Smartphone, Star, Trash, Wifi, XCircle } from '../shared/Icons.js';;;

// ── Type config ───────────────────────────────────────────────────────────────
const TYPES = [
  {
    id:       'momo',
    label:    'MTN Mobile Money',
    icon:     Smartphone,
    color:    '#FFCC00',
    textColor:'#1a1a1a',
    bg:       'linear-gradient(135deg,#FFCC00,#FFA500)',
    prefix:   '237',
    flag:     '🇨🇲',
    hint:     '6XXXXXXXX (9 digits)',
    needsPhone: true,
  },
  {
    id:       'orange_money',
    label:    'Orange Money',
    icon:     AlertCircle,
    color:    '#FF6600',
    textColor:'white',
    bg:       'linear-gradient(135deg,#FF6600,#CC3300)',
    prefix:   '237',
    flag:     '🇨🇲',
    hint:     '6XXXXXXXX (9 digits)',
    needsPhone: true,
  },
  {
    id:       'wave',
    label:    'Wave',
    icon:     Wifi,
    color:    '#1DC8EE',
    textColor:'white',
    bg:       'linear-gradient(135deg,#1DC8EE,#0099CC)',
    prefix:   '221',
    flag:     '🇸🇳',
    hint:     '7XXXXXXXX (9 digits)',
    needsPhone: true,
  },
  {
    id:       'card',
    label:    'Credit / Debit Card',
    icon:     CreditCard,
    color:    '#7C3AED',
    textColor:'white',
    bg:       'linear-gradient(135deg,#7C3AED,#A855F7)',
    needsPhone: false,
  },
];

const CARD_BRANDS = [
  { id:'visa',       label:'Visa',       icon:Info },
  { id:'mastercard', label:'Mastercard', icon:Star },
  { id:'amex',       label:'Amex',       icon:CheckCircle },
  { id:'other',      label:'Other',      icon:CreditCard },
];

function typeConfig(type) {
  return TYPES.find(t => t.id === type) || TYPES[0];
}

// ── Mobile Money Card Visual ──────────────────────────────────────────────────
function MomoCard({ method, onSetDefault, onDelete, onEdit, isDefault }) {
  const tc = typeConfig(method.type);
  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:`2px solid ${isDefault ? tc.color : 'var(--border-subtle)'}`, boxShadow: isDefault ? `0 0 0 1px ${tc.color}44, 0 8px 24px ${tc.color}22` : 'var(--shadow-card)', transition:'all 0.2s' }}>
      {/* Visual */}
      <div style={{ padding:'20px 22px', background:tc.bg, minHeight:100, position:'relative' }}>
        {isDefault && (
          <div style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.2)', backdropFilter:'blur(8px)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, color:'white' }}>
            DEFAULT
          </div>
        )}
        <div style={{ fontSize:28, marginBottom:8 }}><DynIcon icon={tc.icon} size={14}/></div>
        <div style={{ fontSize:15, fontWeight:800, color:tc.textColor, marginBottom:2 }}>{tc.label}</div>
        <div style={{ fontSize:14, fontWeight:600, color: tc.textColor === 'white' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)', fontFamily:'DM Mono,monospace', letterSpacing:1 }}>
          {method.phoneNumber}
        </div>
        {method.accountName && (
          <div style={{ fontSize:11, color: tc.textColor === 'white' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', marginTop:4 }}>
            {method.accountName}
          </div>
        )}
        {/* Decorative */}
        <div style={{ position:'absolute', right:-20, bottom:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
      </div>
      {/* Actions */}
      <div style={{ padding:'12px 16px', background:'var(--bg-card)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {method.nickname && <div style={{ flex:1, fontSize:12, color:'var(--text-faint)', fontStyle:'italic' }}>"{method.nickname}"</div>}
        {!isDefault && (
          <button onClick={() => onSetDefault(method._id)}
            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            Set Default
          </button>
        )}
        <button onClick={() => onEdit(method)}
          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11 }}>
          <Edit size={14}/>️
        </button>
        <button onClick={() => onDelete(method._id, tc.label)}
          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11, fontWeight:600 }}>
          <Trash size={14}/>️
        </button>
      </div>
    </div>
  );
}

// ── Card Visual ───────────────────────────────────────────────────────────────
function CardVisual({ method, onSetDefault, onDelete, onEdit, isDefault }) {
  const now     = new Date();
  const expired = method.cardExpYear && (
    method.cardExpYear < now.getFullYear() ||
    (method.cardExpYear === now.getFullYear() && method.cardExpMonth < now.getMonth() + 1)
  );
  const BRAND_BG = {
    visa:       'linear-gradient(135deg,#1a1f71,#2563eb)',
    mastercard: 'linear-gradient(135deg,#eb001b,#f79e1b)',
    amex:       'linear-gradient(135deg,#2e77bc,#0a3d7c)',
    other:      'linear-gradient(135deg,#7c3aed,#a855f7)',
  };
  const bg = BRAND_BG[method.cardBrand] || BRAND_BG.other;

  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:`2px solid ${isDefault?'var(--purple-primary)':expired?'rgba(239,68,68,0.4)':'var(--border-subtle)'}`, boxShadow: isDefault?'0 0 0 1px rgba(124,58,237,0.3),0 8px 24px rgba(124,58,237,0.12)':'var(--shadow-card)', transition:'all 0.2s' }}>
      <div style={{ padding:'20px 22px', background:bg, minHeight:110, position:'relative' }}>
        {isDefault  && <div style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, color:'white' }}>DEFAULT</div>}
        {expired    && <div style={{ position:'absolute', top:12, right:12, background:'rgba(239,68,68,0.8)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, color:'white' }}>EXPIRED</div>}
        <div style={{ fontSize:22, marginBottom:12 }}><CreditCard size={14}/></div>
        <div style={{ fontSize:15, letterSpacing:4, color:'rgba(255,255,255,0.5)', fontFamily:'DM Mono,monospace', marginBottom:8 }}>
          •••• •••• •••• {method.cardLast4}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:2 }}>Holder</div>
            <div style={{ fontSize:12, fontWeight:600, color:'white' }}>{method.cardHolder || '—'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:2 }}>Expires</div>
            <div style={{ fontSize:12, fontWeight:600, color:expired?'#fca5a5':'white' }}>
              {String(method.cardExpMonth).padStart(2,'0')}/{String(method.cardExpYear).slice(-2)}
            </div>
          </div>
        </div>
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
      </div>
      <div style={{ padding:'12px 16px', background:'var(--bg-card)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {method.nickname && <div style={{ flex:1, fontSize:12, color:'var(--text-faint)', fontStyle:'italic' }}>"{method.nickname}"</div>}
        {!isDefault && !expired && (
          <button onClick={() => onSetDefault(method._id)}
            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            Set Default
          </button>
        )}
        <button onClick={() => onEdit(method)}
          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11 }}>
          <Edit size={14}/>️
        </button>
        <button onClick={() => onDelete(method._id, `card ending in ${method.cardLast4}`)}
          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11, fontWeight:600 }}>
          <Trash size={14}/>️
        </button>
      </div>
    </div>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function PaymentMethodModal({ method, onSave, onClose }) {
  const isEdit = !!method;
  const [type,         setType]         = useState(method?.type         || 'momo');
  const [phoneNumber,  setPhoneNumber]  = useState(method?.phoneNumber?.replace(/^\+237|\+221/,'') || '');
  const [accountName,  setAccountName]  = useState(method?.accountName  || '');
  const [nickname,     setNickname]     = useState(method?.nickname      || '');
  const [cardLast4,    setCardLast4]    = useState(method?.cardLast4     || '');
  const [cardBrand,    setCardBrand]    = useState(method?.cardBrand     || 'visa');
  const [cardExpMonth, setCardExpMonth] = useState(method?.cardExpMonth  || '');
  const [cardExpYear,  setCardExpYear]  = useState(method?.cardExpYear   || '');
  const [cardHolder,   setCardHolder]   = useState(method?.cardHolder    || '');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const tc = typeConfig(type);

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { type, nickname };
      if (['momo','orange_money','wave'].includes(type)) {
        payload.phoneNumber = phoneNumber;
        payload.accountName = accountName;
      } else {
        payload.cardLast4    = cardLast4;
        payload.cardBrand    = cardBrand;
        payload.cardExpMonth = parseInt(cardExpMonth);
        payload.cardExpYear  = parseInt(cardExpYear);
        payload.cardHolder   = cardHolder;
      }

      if (isEdit) {
        await api.patch(`/payment-methods/${method._id}`, { nickname, accountName });
      } else {
        await api.post('/payment-methods', payload);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div className="glass-card" style={{ padding:32, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
            {isEdit ? <><Edit size={14}/> Edit Payment Method</> : <><Plus size={14}/> Add Payment Method</>}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:22, padding:0 }}><Close size={14}/></button>
        </div>

        {/* Type selector — only show on add */}
        {!isEdit && (
          <div style={{ marginBottom:20 }}>
            <label className="form-label">Payment Type</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {TYPES.map(t => (
                <div key={t.id} onClick={() => { setType(t.id); setError(''); }}
                  style={{ padding:'12px 14px', borderRadius:12, border:`2px solid ${type===t.id ? t.color : 'var(--border-subtle)'}`, background: type===t.id ? `${t.color}15` : 'var(--bg-elevated)', cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    <DynIcon icon={t.icon} size={14}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', lineHeight:1.3 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile money fields */}
        {['momo','orange_money','wave'].includes(type) && !isEdit && (
          <>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">{tc.label} Number *</label>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:13, fontWeight:700, color:'var(--text-primary)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                  <span>{tc.flag}</span>
                  <span>+{tc.prefix}</span>
                </div>
                <input className="form-input" type="tel" placeholder={tc.hint}
                  value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g,'').slice(0,9))}/>
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
                Enter your {tc.label} phone number (9 digits, without country code)
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Account Holder Name (optional)</label>
              <input className="form-input" placeholder="Name on the account"
                value={accountName} onChange={e => setAccountName(e.target.value)}/>
            </div>
          </>
        )}

        {/* Card fields */}
        {type === 'card' && !isEdit && (
          <>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Card Brand</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {CARD_BRANDS.map(b => (
                  <button key={b.id} type="button" onClick={() => setCardBrand(b.id)}
                    style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${cardBrand===b.id?'var(--purple-primary)':'var(--border-subtle)'}`, background:cardBrand===b.id?'rgba(124,58,237,0.1)':'var(--bg-elevated)', color:'var(--text-primary)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:6 }}>
                    <span><DynIcon icon={b.icon} size={14}/></span>{b.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Card Holder Name *</label>
              <input className="form-input" placeholder="As shown on the card"
                value={cardHolder} onChange={e => setCardHolder(e.target.value)}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              <div style={{ gridColumn:'span 1' }}>
                <label className="form-label">Last 4 Digits *</label>
                <input className="form-input" placeholder="1234" maxLength={4}
                  value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g,'').slice(0,4))}
                  style={{ fontFamily:'DM Mono,monospace', letterSpacing:4 }}/>
              </div>
              <div>
                <label className="form-label">Exp. Month *</label>
                <select className="form-input" value={cardExpMonth} onChange={e => setCardExpMonth(e.target.value)}>
                  <option value="">MM</option>
                  {Array.from({length:12},(_,i)=>i+1).map(m => (
                    <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Exp. Year *</label>
                <select className="form-input" value={cardExpYear} onChange={e => setCardExpYear(e.target.value)}>
                  <option value="">YYYY</option>
                  {Array.from({length:10},(_,i)=>new Date().getFullYear()+i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', fontSize:12, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
              <Lock size={14}/> We only store your last 4 digits and expiry for reference. No full card numbers are saved.
              Real charges go through CinetPay's secure gateway when you make a payment.
            </div>
          </>
        )}

        {/* Nickname — always shown */}
        <div style={{ marginBottom:20 }}>
          <label className="form-label">Nickname (optional)</label>
          <input className="form-input" placeholder={`e.g. ${type==='momo'?'My MTN':type==='orange_money'?'Work Orange':type==='wave'?'Wave Account':'Work Card'}`}
            value={nickname} onChange={e => setNickname(e.target.value)}/>
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
            A label to identify this payment method
          </div>
        </div>

        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
            <AlertTriangle size={14}/>️ {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}
            style={{ flex:2, justifyContent:'center' }}>
            {saving ? '⏳ Saving...' : isEdit ? <><Check size={14}/> Save Changes</> : <><Check size={14}/> Add Payment Method</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PaymentMethodsManager({ onMethodsChange }) {
  const [methods,    setMethods]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editMethod, setEditMethod] = useState(null);
  const [toast,      setToast]      = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchMethods = useCallback(async () => {
    try {
      const res = await api.get('/payment-methods');
      setMethods(res.data || []);
      onMethodsChange?.(res.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [onMethodsChange]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/payment-methods/${id}/set-default`);
      setMethods(ms => ms.map(m => ({ ...m, isDefault: m._id === id })));
      showToast('Default payment method updated');
    } catch (err) { showToast('' + (err.response?.data?.message || err.message)); }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Remove ${label}?`)) return;
    try {
      await api.delete(`/payment-methods/${id}`);
      setMethods(ms => ms.filter(m => m._id !== id));
      showToast('Payment method removed');
      onMethodsChange?.(methods.filter(m => m._id !== id));
    } catch (err) { showToast('' + err.message); }
  };

  const handleSaved = () => {
    fetchMethods();
    showToast('Payment method saved!');
  };

  const defaultMethod = methods.find(m => m.isDefault);

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', maxWidth:380 }}>
          {toast}
        </div>
      )}

      {(showModal || editMethod) && (
        <PaymentMethodModal
          method={editMethod}
          onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditMethod(null); }}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
            <CreditCard size={14}/> Payment Methods
          </h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
            Add your Mobile Money accounts and cards to fund campaigns
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ fontSize:13 }}>
          + Add Payment Method
        </button>
      </div>

      {/* Default method banner */}
      {defaultMethod && (
        <div style={{ padding:'12px 18px', borderRadius:12, marginBottom:20, background:'rgba(22,163,74,0.07)', border:'1px solid rgba(22,163,74,0.25)', display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:20 }}><DynIcon icon={typeConfig(defaultMethod.type).icon} size={14}/></span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>Default Payment Method</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {typeConfig(defaultMethod.type).label}
              {defaultMethod.phoneNumber && ` · ${defaultMethod.phoneNumber}`}
              {defaultMethod.cardLast4   && ` · **** ${defaultMethod.cardLast4}`}
              {defaultMethod.nickname    && ` — "${defaultMethod.nickname}"`}
            </div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)', padding:'2px 10px', borderRadius:20 }}><Check size={14}/> Active</span>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:140, borderRadius:16 }}/>)}
        </div>

      ) : methods.length === 0 ? (
        <div style={{ padding:'40px 20px', borderRadius:16, border:'2px dashed var(--border-subtle)', background:'var(--bg-elevated)', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:14 }}><CreditCard size={36}/></div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
            No Payment Methods Yet
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, maxWidth:380, margin:'0 auto 20px' }}>
            Add your MTN MoMo, Orange Money, Wave account or bank card to quickly pay for campaigns.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:20 }}>
            {TYPES.map(t => (
              <div key={t.id} style={{ padding:'8px 14px', borderRadius:20, background:t.bg, color:t.textColor, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                <DynIcon icon={t.icon} size={14}/> {t.label}
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add Your First Payment Method
          </button>
        </div>

      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:16 }}>
          {methods.map(m => (
            m.type === 'card'
              ? <CardVisual key={m._id} method={m} isDefault={m.isDefault} onSetDefault={handleSetDefault} onDelete={handleDelete} onEdit={setEditMethod}/>
              : <MomoCard   key={m._id} method={m} isDefault={m.isDefault} onSetDefault={handleSetDefault} onDelete={handleDelete} onEdit={setEditMethod}/>
          ))}

          {/* Add new card */}
          <div onClick={() => setShowModal(true)}
            style={{ borderRadius:16, border:'2px dashed var(--border-subtle)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, cursor:'pointer', transition:'all 0.2s', minHeight:140 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--purple-primary)'; e.currentTarget.style.background='var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)';  e.currentTarget.style.background='transparent'; }}>
            <div style={{ fontSize:32, marginBottom:10 }}>+</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)' }}>Add Payment Method</div>
            <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>MoMo · Orange · Wave · Card</div>
          </div>
        </div>
      )}
    </div>
  );
}
