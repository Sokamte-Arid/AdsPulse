import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggleFull } from '../components/shared/LanguageToggle';
import api from '../utils/api';
import { Building, Check, Edit, Eye, Globe, Image, Info, User, XCircle } from '../components/shared/Icons.js';

// ── Image upload helper ───────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Upload zone component ─────────────────────────────────────────────────────
function UploadZone({ label, preview, onFile, onRemove, aspect = '16/5', hint = '' }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = async (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      {preview ? (
        <div style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:aspect, background:'var(--bg-elevated)', marginBottom:4 }}>
          <img src={preview} alt={label} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:6 }}>
            <button onClick={() => inputRef.current.click()} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', fontSize:11, cursor:'pointer', fontWeight:600 }}>
              Change
            </button>
            <button onClick={onRemove} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(239,68,68,0.8)', color:'#fff', border:'none', fontSize:11, cursor:'pointer', fontWeight:600 }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ aspectRatio:aspect, borderRadius:12, border:`2px dashed ${dragging ? 'var(--purple-primary)' : 'var(--border-subtle)'}`, background:dragging ? 'rgba(124,58,237,0.05)' : 'var(--bg-elevated)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', gap:8, marginBottom:4 }}>
          <div style={{ color:'var(--text-faint)' }}><Image size={28}/></div>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Click or drag to upload</div>
          {hint && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{hint}</div>}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={async e => { const f = e.target.files[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [toast,   setToast]     = useState({ msg:'', type:'info' });
  const [activeTab, setActiveTab] = useState('profile');

  const [name,  setName]  = useState('');
  const [bio,   setBio]   = useState('');
  const [phone, setPhone] = useState('');

  const [companyName,    setCompanyName]    = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [tagline,        setTagline]        = useState('');
  const [logoPreview,    setLogoPreview]    = useState('');
  const [coverPreview,   setCoverPreview]   = useState('');
  const [logoFile,       setLogoFile]       = useState(null);
  const [coverFile,      setCoverFile]      = useState(null);
  const [avatarPreview,  setAvatarPreview]  = useState('');
  const [avatarFile,     setAvatarFile]     = useState(null);
  const avatarRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'info' }), 4000);
  };

  useEffect(() => {
    api.get('/profile')
      .then(r => {
        const u = r.data;
        setProfile(u);
        setName(u.name  || '');
        setBio(u.bio    || '');
        setPhone(u.phone || '');
        setCompanyName(u.brand?.companyName    || '');
        setWelcomeMessage(u.brand?.welcomeMessage || '');
        setTagline(u.brand?.tagline            || '');
        setLogoPreview(u.brand?.companyLogo    || '');
        setCoverPreview(u.brand?.coverImage    || '');
        setAvatarPreview(u.avatar              || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (avatarFile) {
        const b64 = await fileToBase64(avatarFile);
        await api.patch('/profile/avatar', { avatar: b64 });
      }
      await api.put('/profile', { name, bio, phone });
      showToast('Profile saved!');
      if (refreshUser) refreshUser();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleSaveBrand = async () => {
    setSaving(true);
    try {
      const payload = { companyName, welcomeMessage, tagline };
      if (logoFile)  payload.companyLogo = await fileToBase64(logoFile);
      if (coverFile) payload.coverImage  = await fileToBase64(coverFile);
      const res = await api.patch('/profile/brand', payload);
      setProfile(p => ({ ...p, brand: res.data.brand }));
      setLogoPreview(res.data.brand.companyLogo || logoPreview);
      setCoverPreview(res.data.brand.coverImage || coverPreview);
      setLogoFile(null); setCoverFile(null);
      showToast('Brand banner saved! Your dashboard will now show it.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleRemoveBrandImage = async (field) => {
    try {
      await api.delete(`/profile/brand/${field}`);
      if (field === 'companyLogo') { setLogoPreview(''); setLogoFile(null); }
      if (field === 'coverImage')  { setCoverPreview(''); setCoverFile(null); }
      setProfile(p => ({ ...p, brand: { ...p.brand, [field]: '' } }));
      showToast('Image removed');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toastBg     = { success:'rgba(22,163,74,0.15)',  error:'rgba(239,68,68,0.15)',  info:'rgba(37,99,235,0.15)' };
  const toastBorder = { success:'rgba(22,163,74,0.3)',   error:'rgba(239,68,68,0.3)',   info:'rgba(37,99,235,0.3)' };

  if (loading) return (
    <Layout>
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Toast */}
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, maxWidth:400, padding:'13px 18px', borderRadius:12, background:toastBg[toast.type]||toastBg.info, border:`1px solid ${toastBorder[toast.type]||toastBorder.info}`, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out' }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Brand</h1>
          <p className="page-subtitle">Manage your personal info and customize the dashboard banner</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          { key:'profile',  label:'Profile' },
          { key:'brand',    label:'Dashboard Banner' },
          { key:'language', label:'Language' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding:'8px 20px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            background: activeTab===t.key ? 'var(--bg-card)' : 'transparent',
            color:      activeTab===t.key ? 'var(--text-primary)' : 'var(--text-faint)',
            boxShadow:  activeTab===t.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:860 }}>

          {/* Avatar */}
          <div className="glass-card" style={{ padding:28, gridColumn:'1/-1' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 20px' }}>Profile Photo</h3>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ position:'relative', width:80, height:80, flexShrink:0 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--purple-primary)' }} />
                ) : (
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:'white' }}>
                    {name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <button onClick={() => avatarRef.current.click()} style={{ position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:'50%', background:'var(--purple-primary)', border:'2px solid var(--bg-page)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' }}>
                  <Edit size={12}/>
                </button>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>{name || authUser?.name}</div>
                <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:10 }}>{authUser?.email}</div>
                <button className="btn-secondary" onClick={() => avatarRef.current.click()} style={{ fontSize:12, padding:'6px 14px' }}>
                  Upload Photo
                </button>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
              const f = e.target.files[0];
              if (!f) return;
              setAvatarFile(f);
              setAvatarPreview(URL.createObjectURL(f));
            }} />
          </div>

          {/* Personal Info */}
          <div className="glass-card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px' }}>Personal Info</h3>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Phone (optional)</label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6xx xxx xxx" />
            </div>
            <div>
              <label className="form-label">Bio (optional)</label>
              <textarea className="form-input" value={bio} onChange={e => setBio(e.target.value)} placeholder="Short bio about yourself..." rows={3} style={{ resize:'vertical', lineHeight:1.6 }} />
            </div>
          </div>

          {/* Preferences */}
          <div className="glass-card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px' }}>Preferences</h3>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Currency</label>
              <select className="form-input" value={profile?.preferences?.currency || 'USD'} onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, currency: e.target.value } }))}>
                {['USD','EUR','GBP','XAF','CAD','AUD','NGN'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Timezone</label>
              <select className="form-input" value={profile?.preferences?.timezone || 'UTC'} onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, timezone: e.target.value } }))}>
                {['UTC','Africa/Douala','Europe/Paris','America/New_York','America/Los_Angeles','Asia/Tokyo'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
              <input type="checkbox" id="notifCheck" checked={profile?.preferences?.notifications ? true : false} onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, notifications: e.target.checked } }))} style={{ width:16, height:16, cursor:'pointer' }} />
              <label htmlFor="notifCheck" style={{ fontSize:13, color:'var(--text-primary)', cursor:'pointer', fontWeight:600 }}>
                Enable notifications
              </label>
            </div>
          </div>

          {/* Save button */}
          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ padding:'10px 32px', fontSize:14 }}>
              {saving ? '⏳ Saving...' : <><Check size={14}/> Save Profile</>}
            </button>
          </div>
        </div>
      )}

      {/* ── LANGUAGE TAB ── */}
      {activeTab === 'language' && (
        <div style={{ maxWidth:500 }}>
          <div className="glass-card" style={{ padding:28 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 6px', display:'flex', alignItems:'center', gap:8 }}>
              <Globe size={16}/> Interface Language
            </h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 22px', lineHeight:1.6 }}>
              Choose the language for the entire AdsPulse interface. Your preference is saved locally and applied immediately.
            </p>
            <LanguageToggleFull />
          </div>
        </div>
      )}

      {/* ── BRAND / BANNER TAB ── */}
      {activeTab === 'brand' && (
        <div style={{ maxWidth:860 }}>

          {/* Preview */}
          <div className="glass-card" style={{ padding:0, marginBottom:24, overflow:'hidden', border:'1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:8 }}>
              <Eye size={14}/>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Live Preview</span>
              <span style={{ fontSize:11, color:'var(--text-faint)' }}>— this is how it looks on the dashboard</span>
            </div>
            <div style={{ position:'relative', minHeight:140, background: coverPreview ? `url(${coverPreview}) center/cover` : 'linear-gradient(135deg,#1e0a3c,#3b0764,#7c3aed)', display:'flex', alignItems:'flex-end', padding:'20px 24px' }}>
              {coverPreview && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.38)' }}/>}
              <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16 }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" style={{ width:54, height:54, borderRadius:12, objectFit:'cover', border:'2px solid rgba(255,255,255,0.25)', background:'white' }} />
                ) : (
                  <div style={{ width:54, height:54, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid rgba(255,255,255,0.2)', color:'white' }}>
                    <Building size={22}/>
                  </div>
                )}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,255,255,0.5)' }} />
                    ) : (
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>
                        {name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color:'white', lineHeight:1.2 }}>
                        {welcomeMessage || `Welcome back, ${name || 'there'}!`}
                      </div>
                      {(companyName || tagline) && (
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:2 }}>
                          {companyName && <span style={{ fontWeight:700 }}>{companyName}</span>}
                          {companyName && tagline && ' · '}
                          {tagline}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 18px' }}>Brand Text</h3>
              <div style={{ marginBottom:14 }}>
                <label className="form-label">Company / Agency Name</label>
                <input className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Marketing Agency" />
              </div>
              <div style={{ marginBottom:14 }}>
                <label className="form-label">Welcome Message</label>
                <input className="form-input" value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} placeholder="e.g. Welcome back! Let's grow today." />
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Leave blank to show the default greeting</div>
              </div>
              <div>
                <label className="form-label">Tagline</label>
                <input className="form-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Performance Marketing, Simplified" />
              </div>
            </div>

            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:'0 0 18px' }}>Brand Images</h3>
              <div style={{ marginBottom:20 }}>
                <UploadZone
                  label="Company Logo"
                  preview={logoPreview}
                  aspect="1/1"
                  hint="Square image recommended · PNG or SVG"
                  onFile={async f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}
                  onRemove={() => handleRemoveBrandImage('companyLogo')}
                />
              </div>
              <UploadZone
                label="Cover / Hero Image"
                preview={coverPreview}
                aspect="16/5"
                hint="Wide banner image · 1400×400px recommended"
                onFile={async f => { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }}
                onRemove={() => handleRemoveBrandImage('coverImage')}
              />
            </div>

            {/* Tip */}
            <div style={{ gridColumn:'1/-1', padding:'12px 16px', borderRadius:10, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', fontSize:12, color:'var(--text-muted)', lineHeight:1.7, display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ flexShrink:0, marginTop:1 }}><Info size={14}/></span>
              <span><strong style={{ color:'var(--text-primary)' }}>Tip:</strong> The dashboard banner gives every user of this app your company's branding atmosphere. Upload a professional cover photo and your logo. Changes save immediately and appear instantly on the dashboard.</span>
            </div>

            {/* Save */}
            <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:12 }}>
              <button className="btn-secondary" onClick={() => {
                setCompanyName(profile?.brand?.companyName || '');
                setWelcomeMessage(profile?.brand?.welcomeMessage || '');
                setTagline(profile?.brand?.tagline || '');
                setLogoPreview(profile?.brand?.companyLogo || '');
                setCoverPreview(profile?.brand?.coverImage || '');
                setLogoFile(null); setCoverFile(null);
              }} style={{ fontSize:13 }}>
                Reset
              </button>
              <button className="btn-primary" onClick={handleSaveBrand} disabled={saving} style={{ padding:'10px 32px', fontSize:14 }}>
                {saving ? '⏳ Uploading...' : <><Check size={14}/> Save Banner</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
