import React from 'react';
import { CAMPAIGN_OBJECTIVES } from '../../utils/platforms';

const CATEGORIES = ['Awareness', 'Consideration', 'Conversion'];

export default function ObjectiveStep({ data, onChange }) {
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = CAMPAIGN_OBJECTIVES.filter(o => o.category === cat);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: '#e8e0f5', margin: '0 0 8px' }}>
          What's your campaign objective?
        </h2>
        <p style={{ color: '#8b7baa', fontSize: 14, margin: 0 }}>
          Choose an objective that reflects your goal. This will determine the objective mapped to each platform.
        </p>
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14
          }}>
            <div style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: cat === 'Awareness' ? 'rgba(59,130,246,0.15)' : cat === 'Consideration' ? 'rgba(245,158,11,0.15)' : 'rgba(74,222,128,0.15)',
              color: cat === 'Awareness' ? '#60a5fa' : cat === 'Consideration' ? '#fbbf24' : '#4ade80',
              border: `1px solid ${cat === 'Awareness' ? 'rgba(59,130,246,0.3)' : cat === 'Consideration' ? 'rgba(245,158,11,0.3)' : 'rgba(74,222,128,0.3)'}`
            }}>
              {cat}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {grouped[cat].map(obj => (
              <div
                key={obj.id}
                onClick={() => onChange('objective', obj.id)}
                style={{
                  padding: '18px 20px',
                  borderRadius: 12,
                  border: `2px solid ${data.objective === obj.id ? '#7c3aed' : 'rgba(139,92,246,0.15)'}`,
                  background: data.objective === obj.id ? 'rgba(124,58,237,0.1)' : 'rgba(26,16,51,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: data.objective === obj.id ? '0 0 0 1px rgba(124,58,237,0.3), 0 8px 24px rgba(124,58,237,0.15)' : 'none'
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>{obj.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: data.objective === obj.id ? '#c084fc' : '#e8e0f5', marginBottom: 6 }}>
                  {obj.label}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{obj.description}</div>
                {data.objective === obj.id && (
                  <div style={{
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 700, color: '#7c3aed'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Selected
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
