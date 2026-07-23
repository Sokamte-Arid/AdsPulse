import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Check } from './Icons.js';

// ── Compact toggle for sidebar ────────────────────────────────────────────────
export function LanguageToggleSidebar({ collapsed = false }) {
  const { language, setLang } = useLanguage();

  if (collapsed) {
    return (
      <button
        onClick={() => setLang(language === 'en' ? 'fr' : 'en')}
        title={language === 'en' ? '🇫🇷 Passer en français' : '🇬🇧 Switch to English'}
        style={{ width:36, height:36, borderRadius:9, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontFamily:'DM Sans,sans-serif', transition:'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple-primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      >
        {language === 'en' ? '🇫🇷' : '🇬🇧'}
      </button>
    );
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 10px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
      {/* EN button */}
      <button
        onClick={() => setLang('en')}
        style={{
          flex:1, padding:'6px 0', borderRadius:7, border:'none', fontSize:12, fontWeight:700, cursor:'pointer',
          fontFamily:'DM Sans,sans-serif', transition:'all 0.18s',
          background: language === 'en' ? 'var(--purple-primary)' : 'transparent',
          color:       language === 'en' ? 'white'               : 'var(--text-faint)',
        }}
      >
        🇬🇧 EN
      </button>

      {/* Divider */}
      <div style={{ width:1, height:16, background:'var(--border-subtle)', flexShrink:0 }} />

      {/* FR button */}
      <button
        onClick={() => setLang('fr')}
        style={{
          flex:1, padding:'6px 0', borderRadius:7, border:'none', fontSize:12, fontWeight:700, cursor:'pointer',
          fontFamily:'DM Sans,sans-serif', transition:'all 0.18s',
          background: language === 'fr' ? 'var(--purple-primary)' : 'transparent',
          color:       language === 'fr' ? 'white'               : 'var(--text-faint)',
        }}
      >
        🇫🇷 FR
      </button>
    </div>
  );
}

// ── Full toggle for Profile/Settings page ─────────────────────────────────────
export function LanguageToggleFull() {
  const { language, setLang } = useLanguage();

  const options = [
    { code:'en', flag:'🇬🇧', label:'English', sublabel:'English' },
    { code:'fr', flag:'🇫🇷', label:'Français', sublabel:'French' },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {options.map(opt => {
        const selected = language === opt.code;
        return (
          <button
            key={opt.code}
            onClick={() => setLang(opt.code)}
            style={{
              padding:'14px 16px', borderRadius:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
              border:`2px solid ${selected ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
              background: selected ? 'rgba(124,58,237,0.08)' : 'var(--bg-elevated)',
              display:'flex', alignItems:'center', gap:12, transition:'all 0.2s',
              textAlign:'left',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <span style={{ fontSize:28, flexShrink:0 }}>{opt.flag}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: selected ? 'var(--purple-light)' : 'var(--text-primary)' }}>
                {opt.label}
                {selected && <span style={{ marginLeft:6, fontSize:11, color:'var(--purple-light)', fontWeight:600 }}><Check size={14}/> Active</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{opt.sublabel}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageToggleSidebar;
