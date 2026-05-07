import React from 'react';
import { PlatformIcons, PLATFORMS } from '../../utils/platforms';

export default function PlatformBudgetStep({ data, onChange }) {
  const togglePlatform = (platformId) => {
    const existing = data.platforms || [];
    const idx = existing.findIndex(p => p.platform === platformId);
    if (idx >= 0) {
      onChange('platforms', existing.filter((_, i) => i !== idx));
    } else {
      onChange('platforms', [...existing, {
        platform: platformId,
        status: 'draft',
        budget: 0,
        budgetType: 'daily',
        objective: data.objective,
        targeting: { ageMin: 18, ageMax: 65, genders: [], locations: [], interests: [] },
        metrics: { amountSpent: 0, impressions: 0, cpm: 0, totalClicks: 0, ctr: 0, cpc: 0, conversions: 0, totalReach: 0, addToCart: 0 }
      }]);
    }
  };

  const updatePlatformBudget = (platformId, field, value) => {
    const platforms = (data.platforms || []).map(p =>
      p.platform === platformId ? { ...p, [field]: value } : p
    );
    onChange('platforms', platforms);
  };

  const selectedPlatforms = data.platforms || [];
  const totalBudget = selectedPlatforms.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: '#e8e0f5', margin: '0 0 8px' }}>
          Choose platforms & allocate budget
        </h2>
        <p style={{ color: '#8b7baa', fontSize: 14, margin: 0 }}>
          Select where you want to run your ads and set the budget for each platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {PLATFORMS.map(pl => {
          const Icon = PlatformIcons[pl.id];
          const selected = selectedPlatforms.some(p => p.platform === pl.id);
          return (
            <div
              key={pl.id}
              onClick={() => togglePlatform(pl.id)}
              style={{
                padding: '20px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${selected ? pl.color : 'rgba(139,92,246,0.15)'}`,
                background: selected ? `${pl.color}15` : 'rgba(26,16,51,0.5)',
                transition: 'all 0.2s',
                boxShadow: selected ? `0 0 0 1px ${pl.color}44, 0 8px 24px ${pl.color}22` : 'none',
                position: 'relative'
              }}
            >
              {selected && (
                <div style={{
                  position: 'absolute', top: 10, right: 10, width: 20, height: 20,
                  borderRadius: '50%', background: pl.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                {Icon && <Icon size={32} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: selected ? '#e8e0f5' : '#8b7baa' }}>{pl.name}</div>
            </div>
          );
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <>
          <div style={{
            padding: '16px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)', marginBottom: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: 14, color: '#c084fc', fontWeight: 600 }}>
              Total Budget Allocated
            </div>
            <div style={{ fontSize: 24, fontFamily: 'Syne', fontWeight: 800, color: '#e8e0f5' }}>
              ${totalBudget.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedPlatforms.map(platformData => {
              const pl = PLATFORMS.find(p => p.id === platformData.platform);
              const Icon = PlatformIcons[platformData.platform];
              return (
                <div
                  key={platformData.platform}
                  style={{
                    padding: '20px 24px', borderRadius: 12,
                    background: 'rgba(26,16,51,0.7)',
                    border: `1px solid ${pl?.color}33`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    {Icon && <Icon size={24} />}
                    <span style={{ fontWeight: 700, color: '#e8e0f5', fontSize: 15 }}>{pl?.name}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'end' }}>
                    <div>
                      <label className="form-label">Budget Amount ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={platformData.budget || ''}
                        onChange={e => updatePlatformBudget(platformData.platform, 'budget', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label className="form-label">Budget Type</label>
                      <select
                        className="form-input"
                        value={platformData.budgetType}
                        onChange={e => updatePlatformBudget(platformData.platform, 'budgetType', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="daily">Daily Budget</option>
                        <option value="lifetime">Lifetime Budget</option>
                      </select>
                    </div>
                    <div style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: `${pl?.color}15`, color: pl?.color,
                      border: `1px solid ${pl?.color}33`, whiteSpace: 'nowrap'
                    }}>
                      {platformData.budgetType === 'daily' ? '/day' : 'total'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedPlatforms.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px', borderRadius: 12,
          border: '1px dashed rgba(139,92,246,0.2)', color: '#6b7280', fontSize: 14
        }}>
          Select at least one platform to continue
        </div>
      )}
    </div>
  );
}
