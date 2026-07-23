import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { Building, Check, Close, Globe, MapPin, Search, Tag, Target } from '../shared/Icons.js';

// ── Suggested tags ────────────────────────────────────────────────────────────
const SUGGESTED_TAGS = [
  'retargeting','awareness','conversion','traffic','engagement','leads',
  'seasonal','promo','sale','discount','launch','branding','remarketing',
  'lookalike','cold-audience','warm-audience','video','carousel','stories',
  'q1','q2','q3','q4','holiday','blackfriday','summer','winter',
];

// ── Location Tag ──────────────────────────────────────────────────────────────
function LocationTag({ loc, onRemove }) {
  const icons = { country: Globe, city: Building, region: MapPin };
  const Icon  = icons[loc.type] || MapPin;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.3)', fontSize:12, fontWeight:600, color:'var(--purple-light)' }}>
      <Icon size={11}/>
      <span style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{loc.label}</span>
      {loc.type && <span style={{ fontSize:10, opacity:0.7, textTransform:'capitalize' }}>({loc.type})</span>}
      <button onClick={() => onRemove(loc.id)} style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', padding:'0 2px', fontSize:14, lineHeight:1, display:'flex', alignItems:'center' }}>
        <Close size={11}/>
      </button>
    </div>
  );
}

// ── Location Picker ───────────────────────────────────────────────────────────
function LocationPicker({ value = [], onChange, maxLocations = 10 }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [mapCoords,   setMapCoords]   = useState(null); // { lat, lon, label }
  const [mapLoading,  setMapLoading]  = useState(false);
  const inputRef    = useRef();
  const dropRef     = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/locations/search?q=${encodeURIComponent(query)}`);
        const selectedIds = new Set(value.map(v => v.id));
        setSuggestions(res.data.filter(s => !selectedIds.has(s.id)));
        setOpen(true); setActiveIdx(-1);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 280);
  }, [query, value]);

  // Fetch coordinates from Nominatim when a location is selected
  const fetchCoordinates = useCallback(async (loc) => {
    setMapLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.label)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: loc.label, displayName: data[0].display_name });
      }
    } catch {}
    finally { setMapLoading(false); }
  }, []);

  const selectLocation = useCallback((loc) => {
    if (value.length >= maxLocations) return;
    onChange([...value, loc]);
    setQuery(''); setSuggestions([]); setOpen(false);
    fetchCoordinates(loc);
    inputRef.current?.focus();
  }, [value, onChange, maxLocations, fetchCoordinates]);

  const removeLocation = useCallback((id) => {
    const newVal = value.filter(v => v.id !== id);
    onChange(newVal);
    // Show map for last remaining location
    if (newVal.length > 0) fetchCoordinates(newVal[newVal.length - 1]);
    else setMapCoords(null);
  }, [value, onChange, fetchCoordinates]);

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, suggestions.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i-1, -1)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectLocation(suggestions[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Backspace' && query === '' && value.length > 0) removeLocation(value[value.length-1].id);
  };

  // Group suggestions by region
  const grouped = suggestions.reduce((acc, s) => {
    const k = s.region || s.country || 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  // Build static map tile URL using OpenStreetMap tiles
  const getMapTileUrl = (lat, lon, zoom = 10) => {
    // Returns a URL for a map centered on the location
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-2},${lat-2},${lon+2},${lat+2}&layer=mapnik&marker=${lat},${lon}`;
  };

  return (
    <div>
      <div ref={dropRef} style={{ position:'relative', width:'100%' }}>
        {/* Tags + input */}
        <div onClick={() => inputRef.current?.focus()}
          style={{ minHeight:44, padding:'6px 10px', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:10, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', cursor:'text', transition:'border 0.15s', ...(open?{borderColor:'var(--purple-primary)',boxShadow:'0 0 0 2px rgba(124,58,237,0.15)'}:{}) }}>
          {value.map(loc => <LocationTag key={loc.id} loc={loc} onRemove={removeLocation}/>)}
          {value.length < maxLocations && (
            <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:160 }}>
              {searching
                ? <div style={{ width:14, height:14, border:'2px solid rgba(124,58,237,0.3)', borderTop:'2px solid #7c3aed', borderRadius:'50%', animation:'spin 0.6s linear infinite' }}/>
                : <Search size={13} style={{ color:'var(--text-faint)', flexShrink:0 }}/>
              }
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 2 && setOpen(true)}
                placeholder={value.length === 0 ? 'Search country, city, or region...' : 'Add more locations...'}
                style={{ border:'none', outline:'none', background:'transparent', color:'var(--text-primary)', fontSize:13, fontFamily:'DM Sans,sans-serif', flex:1, minWidth:120 }}
              />
            </div>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Dropdown suggestions */}
        {open && suggestions.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', maxHeight:280, overflowY:'auto' }}>
            {Object.entries(grouped).map(([region, locs]) => (
              <div key={region}>
                <div style={{ padding:'6px 14px 4px', fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', background:'var(--bg-elevated)' }}>
                  🌍 {region}
                </div>
                {locs.map((loc) => {
                  const globalIdx = suggestions.indexOf(loc);
                  const icons = { country: Globe, city: Building, region: MapPin };
                  const Icon  = icons[loc.type] || MapPin;
                  return (
                    <div key={loc.id}
                      onMouseDown={(e) => { e.preventDefault(); selectLocation(loc); }}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      style={{ padding:'9px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, background: activeIdx===globalIdx ? 'rgba(124,58,237,0.08)' : 'transparent', transition:'background 0.1s' }}>
                      <Icon size={14} style={{ color:'var(--purple-light)', flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{loc.label}</div>
                        <div style={{ fontSize:11, color:'var(--text-faint)', textTransform:'capitalize' }}>{loc.type}{loc.country ? ` · ${loc.country}` : ''}</div>
                      </div>
                      {activeIdx === globalIdx && <Check size={13} style={{ color:'var(--purple-light)' }}/>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {open && suggestions.length === 0 && query.length >= 2 && !searching && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', padding:'16px', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>
            No locations found for "{query}"
          </div>
        )}
      </div>

      {/* Map preview */}
      {value.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:8 }}>
            {value.length} location{value.length > 1 ? 's' : ''} selected
          </div>

          {/* Map */}
          <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border-subtle)', position:'relative', background:'var(--bg-elevated)' }}>
            {mapLoading && (
              <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
                <div style={{ width:24, height:24, border:'3px solid rgba(124,58,237,0.2)', borderTop:'3px solid #7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>Loading map...</div>
              </div>
            )}
            {!mapLoading && mapCoords && (
              <>
                <iframe
                  key={`${mapCoords.lat},${mapCoords.lon}`}
                  title="Location map"
                  width="100%"
                  height="180"
                  frameBorder="0"
                  scrolling="no"
                  src={getMapTileUrl(mapCoords.lat, mapCoords.lon)}
                  style={{ border:'none', width:'100%', display:'block' }}
                />
                <div style={{ padding:'8px 12px', background:'var(--bg-card)', borderTop:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:6 }}>
                  <MapPin size={12} style={{ color:'var(--purple-light)', flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>
                    {mapCoords.displayName || mapCoords.label}
                  </span>
                </div>
              </>
            )}
            {!mapLoading && !mapCoords && value.length > 0 && (
              <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:12, flexDirection:'column', gap:6 }}>
                <MapPin size={24}/>
                <span>Select a location to see the map</span>
              </div>
            )}
          </div>

          {/* Platform compat note */}
          <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)', fontSize:11, color:'var(--text-faint)' }}>
            ✅ Locations are automatically mapped to the correct targeting ID for each platform (Meta, Google, TikTok, LinkedIn, etc.)
          </div>
        </div>
      )}
    </div>
  );
}

// ── Interest Picker ───────────────────────────────────────────────────────────
function InterestPicker({ value = [], onChange }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const INTEREST_SUGGESTIONS = [
    'Technology','Fashion','Sports','Music','Travel','Food & Dining','Health & Fitness',
    'Business','Finance','Education','Gaming','Movies & TV','Automotive','Real Estate',
    'Parenting','Beauty','Photography','Art & Design','Politics','Science',
    'E-commerce','Online Shopping','Entrepreneurship','Marketing','Social Media',
  ];

  const filtered = INTEREST_SUGGESTIONS.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  const addInterest = (interest) => {
    const trimmed = interest.trim();
    if (trimmed && !value.includes(trimmed)) { onChange([...value, trimmed]); setInput(''); setShowSuggestions(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addInterest(input); }
    if (e.key === ',' && input.trim()) { e.preventDefault(); addInterest(input.replace(',','')); }
  };

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
        {value.map(interest => (
          <span key={interest} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'rgba(16,163,74,0.1)', border:'1px solid rgba(16,163,74,0.3)', fontSize:12, fontWeight:600, color:'#16a34a' }}>
            {interest}
            <button onClick={() => onChange(value.filter(v => v !== interest))} style={{ background:'none', border:'none', color:'#16a34a', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
              <Close size={11}/>
            </button>
          </span>
        ))}
      </div>
      <div style={{ position:'relative' }}>
        <input className="form-input"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Type an interest and press Enter..."
          style={{ fontSize:13 }}
        />
        {showSuggestions && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:100, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', maxHeight:200, overflowY:'auto' }}>
            {filtered.slice(0, 8).map(s => (
              <div key={s} onMouseDown={() => addInterest(s)}
                style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, color:'var(--text-primary)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(124,58,237,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Press Enter or comma to add. Type to search suggestions.</div>
    </div>
  );
}

// ── Tags Input with suggestions ───────────────────────────────────────────────
function TagsInput({ value = [], onChange }) {
  const [input, setInput] = useState('');
  const [showSugs, setShowSugs] = useState(false);

  const filtered = SUGGESTED_TAGS.filter(
    t => t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t)
  );

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g,'-');
    if (t && !value.includes(t)) { onChange([...value, t]); setInput(''); setShowSugs(false); }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); addTag(input.replace(',','')); }
    if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0,-1));
  };

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
        {value.map(tag => (
          <span key={tag} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', fontSize:12, fontWeight:600, color:'#f59e0b' }}>
            #{tag}
            <button onClick={() => onChange(value.filter(v => v !== tag))} style={{ background:'none', border:'none', color:'#f59e0b', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
              <Close size={11}/>
            </button>
          </span>
        ))}
      </div>
      <div style={{ position:'relative' }}>
        <input className="form-input"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSugs(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSugs(true)}
          onBlur={() => setTimeout(() => setShowSugs(false), 150)}
          placeholder="Type a tag and press Enter..."
          style={{ fontSize:13 }}
        />
        {showSugs && (input || value.length === 0) && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:100, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', maxHeight:200, overflowY:'auto', padding:'8px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', padding:'4px 6px 8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Suggested Tags</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(input ? filtered : SUGGESTED_TAGS.filter(t => !value.includes(t))).slice(0, 15).map(t => (
                <button key={t} onMouseDown={() => addTag(t)}
                  style={{ padding:'4px 10px', borderRadius:20, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#f59e0b'; e.currentTarget.style.color='#f59e0b'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Press Enter or comma to add. Click suggestions to insert quickly.</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampaignDetailsStep({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  const targeting = data.targeting || {};
  const updateTargeting = (field, value) => onChange({ ...data, targeting: { ...targeting, [field]: value } });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

      {/* Campaign name */}
      <div>
        <label className="form-label">Campaign Name <span style={{ color:'#ef4444' }}>*</span></label>
        <input className="form-input" value={data.name || ''} onChange={e => update('name', e.target.value)}
          placeholder="e.g. Summer Sale 2025 — Meta + TikTok" />
      </div>

      {/* Date range */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" value={data.startDate || ''} onChange={e => update('startDate', e.target.value)} />
        </div>
        <div>
          <label className="form-label">End Date (optional)</label>
          <input className="form-input" type="date" value={data.endDate || ''} onChange={e => update('endDate', e.target.value)} />
        </div>
      </div>

      {/* ── AUDIENCE TARGETING ──────────────────────────────────────────── */}
      <div style={{ padding:'20px', borderRadius:12, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
          <Target size={15}/> Audience Targeting
        </div>

        {/* Age range */}
        <div style={{ marginBottom:18 }}>
          <label className="form-label">Age Range</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--text-faint)', display:'block', marginBottom:4 }}>Minimum age</label>
              <select className="form-input" value={targeting.ageMin || 18} onChange={e => updateTargeting('ageMin', parseInt(e.target.value))}>
                {[13,18,21,25,30,35,40,45,50,55,60,65].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--text-faint)', display:'block', marginBottom:4 }}>Maximum age</label>
              <select className="form-input" value={targeting.ageMax || 65} onChange={e => updateTargeting('ageMax', parseInt(e.target.value))}>
                {[18,21,25,30,35,40,45,50,55,60,65,100].map(a => <option key={a} value={a}>{a === 100 ? '65+' : a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div style={{ marginBottom:18 }}>
          <label className="form-label">Gender</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[{ value:'all', label:'All Genders' },{ value:'male', label:'Male' },{ value:'female', label:'Female' }].map(opt => {
              const selected = (targeting.gender || 'all') === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => updateTargeting('gender', opt.value)}
                  style={{ padding:'8px 18px', borderRadius:9, border:`1px solid ${selected ? 'var(--purple-primary)' : 'var(--border-subtle)'}`, background:selected?'rgba(124,58,237,0.12)':'var(--bg-card)', color:selected?'var(--purple-light)':'var(--text-muted)', fontWeight:selected?700:500, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom:18 }}>
          <label className="form-label">
            Locations
            <span style={{ fontSize:11, color:'var(--text-faint)', fontWeight:400, marginLeft:8 }}>— search country, city, or region</span>
          </label>
          <LocationPicker value={targeting.locations || []} onChange={locs => updateTargeting('locations', locs)}/>
        </div>

        {/* Interests */}
        <div>
          <label className="form-label">
            Interests
            <span style={{ fontSize:11, color:'var(--text-faint)', fontWeight:400, marginLeft:8 }}>— optional</span>
          </label>
          <InterestPicker value={targeting.interests || []} onChange={interests => updateTargeting('interests', interests)}/>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Description / Notes (optional)</label>
        <textarea className="form-input" rows={3} value={data.description || ''} onChange={e => update('description', e.target.value)}
          placeholder="Internal notes about this campaign..." style={{ resize:'vertical', lineHeight:1.6 }} />
      </div>

      {/* Tags with suggestions */}
      <div>
        <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Tag size={13}/> Tags (optional)
        </label>
        <TagsInput value={data.tags || []} onChange={tags => update('tags', tags)}/>
      </div>

    </div>
  );
}