import React, { useState } from 'react';
import { PLATFORMS, PlatformIcons } from '../../utils/platforms';
import { Check } from '../shared/Icons';

export default function PlatformBudgetStep({ data, onChange }) {
  const selected = data.platforms || [];

  const togglePlatform = (platformId) => {
    const exists = selected.find(p => p.platform === platformId);
    if (exists) {
      onChange({ ...data, platforms: selected.filter(p => p.platform !== platformId) });
    } else {
      onChange({
        ...data,
        platforms: [...selected, {
          platform:   platformId,
          budget:     data.totalBudget ? Math.floor(data.totalBudget / (selected.length + 1)) : 0,
          budgetType: 'daily',
        }]
      });
    }
  };

  const updateBudget = (platformId, budget) => {
    onChange({
      ...data,
      platforms: selected.map(p =>
        p.platform === platformId ? { ...p, budget: parseFloat(budget) || 0 } : p
      )
    });
  };

  const updateBudgetType = (platformId, budgetType) => {
    onChange({
      ...data,
      platforms: selected.map(p =>
        p.platform === platformId ? { ...p, budgetType } : p
      )
    });
  };

  const totalAllocated = selected.reduce((s, p) => s + (p.budget || 0), 0);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px' }}>
          Choose platforms & allocate budget
        </h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
          Select where you want to run your ads and set the budget for each platform.
        </p>
      </div>

      {/* Platform grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12, marginBottom:28 }}>
        {PLATFORMS.map(pl => {
          const Icon       = PlatformIcons[pl.id];
          const isSelected = selected.some(p => p.platform === pl.id);
          return (
            <button key={pl.id} type="button" onClick={() => togglePlatform(pl.id)}
              style={{
                padding:'18px 12px',
                borderRadius:12,
                border:`2px solid ${isSelected ? pl.color : 'var(--border-subtle)'}`,
                background: isSelected ? `${pl.color}18` : 'var(--bg-elevated)',
                cursor:'pointer',
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                gap:10,
                transition:'all 0.15s',
                fontFamily:'DM Sans, sans-serif',
                position:'relative',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = `${pl.color}60`; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              {isSelected && (
                <div style={{ position:'absolute', top:8, right:8, width:18, height:18, borderRadius:'50%', background:pl.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Check size={11} color="white"/>
                </div>
              )}
              {Icon && <Icon size={32}/>}
              <span style={{ fontSize:13, fontWeight:700, color: isSelected ? pl.color : 'var(--text-primary)' }}>
                {pl.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Budget inputs for selected platforms */}
      {selected.length > 0 && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            💰 Budget Allocation
            {totalAllocated > 0 && (
              <span style={{ fontSize:12, color:'var(--text-faint)', fontWeight:400 }}>
                — Total: ${totalAllocated.toLocaleString()}
              </span>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {selected.map(p => {
              const pl   = PLATFORMS.find(pl => pl.id === p.platform);
              const Icon = PlatformIcons[p.platform];
              return (
                <div key={p.platform} style={{ padding:'14px 16px', borderRadius:12, border:`1px solid ${pl?.color||'var(--border-subtle)'}40`, background:'var(--bg-elevated)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:120 }}>
                    {Icon && <Icon size={20}/>}
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{pl?.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:8, flex:1, minWidth:200 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:11, color:'var(--text-faint)', display:'block', marginBottom:4, fontWeight:600 }}>Budget ($)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={p.budget || ''}
                        onChange={e => updateBudget(p.platform, e.target.value)}
                        placeholder="0.00"
                        style={{ fontSize:13 }}
                      />
                    </div>
                    <div style={{ minWidth:110 }}>
                      <label style={{ fontSize:11, color:'var(--text-faint)', display:'block', marginBottom:4, fontWeight:600 }}>Type</label>
                      <select
                        className="form-input"
                        value={p.budgetType || 'daily'}
                        onChange={e => updateBudgetType(p.platform, e.target.value)}
                        style={{ fontSize:13 }}
                      >
                        <option value="daily">Daily</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Currency */}
          <div style={{ marginTop:16 }}>
            <label className="form-label">Currency</label>
            <select className="form-input" value={data.currency||'USD'}
              onChange={e => onChange({ ...data, currency: e.target.value })}
              style={{ fontSize:13, maxWidth:200 }}>
              {['USD','EUR','GBP','XAF','CAD','AUD','NGN','GHS','KES'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div style={{ padding:'20px', borderRadius:10, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)', fontSize:13, color:'var(--text-faint)', textAlign:'center' }}>
          Select at least one platform above to continue
        </div>
      )}
    </div>
  );
}