import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../../utils/api';
import { PlatformIcons, PLATFORMS, formatKPI } from '../../utils/platforms';

const STATUS_COLORS = {
  active:    { color:'#16a34a', bg:'rgba(22,163,74,0.1)'  },
  paused:    { color:'#d97706', bg:'rgba(217,119,6,0.1)'  },
  draft:     { color:'#6b7280', bg:'rgba(107,114,128,0.1)'},
  completed: { color:'#3b82f6', bg:'rgba(37,99,235,0.1)'  },
};

export default function CampaignSearch() {
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef  = useRef(null);
  const dropRef   = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await campaignAPI.getAll({ search: q, limit: 8 });
      setResults(res.data.campaigns || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length >= 1) {
      debounceRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults([]);
      setOpen(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) {
      navigate(`/campaigns/${results[activeIdx]._id}`);
      setQuery(''); setOpen(false);
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const handleSelect = (campaign) => {
    navigate(`/campaigns/${campaign._id}`);
    setQuery('');
    setOpen(false);
    setActiveIdx(-1);
  };

  return (
    <div style={{ position:'relative', flex:1, maxWidth:400 }} ref={dropRef}>
      {/* Search input */}
      <div style={{ position:'relative' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', pointerEvents:'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search campaigns..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (query) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            width:'100%', padding:'9px 36px 9px 38px',
            borderRadius:10, border:`1px solid ${focused ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
            background:'var(--bg-elevated)', color:'var(--text-primary)',
            fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none', transition:'border-color 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none'
          }}
        />
        {/* Loading / clear */}
        {(loading || query) && (
          <div style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)' }}>
            {loading ? (
              <div style={{ width:14, height:14, border:'2px solid var(--border-subtle)', borderTopColor:'var(--purple-primary)', borderRadius:'50%', animation:'spin 0.6s linear infinite' }}/>
            ) : (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
                style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', padding:2, fontSize:14 }}>✕</button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:1000,
          background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
          borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.2)',
          overflow:'hidden', animation:'slideUp 0.15s ease-out'
        }}>
          {results.length === 0 && !loading ? (
            <div style={{ padding:'20px 16px', textAlign:'center', fontSize:13, color:'var(--text-faint)' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
              No campaigns found for "<strong>{query}</strong>"
            </div>
          ) : (
            <>
              <div style={{ padding:'8px 14px 4px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((c, idx) => {
                const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
                const totalSpent = (c.platforms || []).reduce((s, p) => s + (p.metrics?.amountSpent || 0), 0);
                const totalImpressions = (c.platforms || []).reduce((s, p) => s + (p.metrics?.impressions || 0), 0);
                const isActive = idx === activeIdx;

                return (
                  <div
                    key={c._id}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      padding:'11px 14px', cursor:'pointer',
                      background: isActive ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: idx < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition:'background 0.1s', display:'flex', gap:12, alignItems:'center'
                    }}
                  >
                    {/* Status dot */}
                    <div style={{ width:8, height:8, borderRadius:'50%', background:statusStyle.color, flexShrink:0 }}/>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>
                        {c.name}
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        {/* Platform icons */}
                        <div style={{ display:'flex', gap:3 }}>
                          {(c.platforms || []).slice(0, 4).map(p => {
                            const Icon = PlatformIcons[p.platform];
                            return Icon ? <Icon key={p.platform} size={13}/> : null;
                          })}
                        </div>
                        <span style={{ fontSize:11, color:'var(--text-faint)' }}>
                          {totalImpressions > 0 && `${formatKPI(totalImpressions, 'number')} imp · `}
                          {totalSpent > 0 && `${formatKPI(totalSpent, 'currency')} spent`}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', background:statusStyle.bg, color:statusStyle.color, flexShrink:0 }}>
                      {c.status}
                    </span>
                  </div>
                );
              })}

              {/* View all link */}
              <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border-subtle)' }}>
                <button onClick={() => { navigate(`/campaigns?search=${encodeURIComponent(query)}`); setOpen(false); setQuery(''); }}
                  style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:12, fontWeight:600, padding:0 }}>
                  View all results for "{query}" →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
