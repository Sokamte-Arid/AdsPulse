import React from 'react';

const INTERESTS = ['Technology', 'Sports', 'Fashion', 'Travel', 'Food & Drink', 'Health & Fitness', 'Business', 'Entertainment', 'Education', 'Gaming', 'Beauty', 'Automotive', 'Finance', 'Home & Garden'];

export default function CampaignDetailsStep({ data, onChange }) {
  const targeting = data.platformTargeting || { ageMin: 18, ageMax: 65, genders: [], locations: [], interests: [] };

  const updateTargeting = (field, value) => {
    onChange('platformTargeting', { ...targeting, [field]: value });
  };

  const toggleInterest = (interest) => {
    const curr = targeting.interests || [];
    updateTargeting('interests', curr.includes(interest) ? curr.filter(i => i !== interest) : [...curr, interest]);
  };

  const toggleGender = (g) => {
    const curr = targeting.genders || [];
    updateTargeting('genders', curr.includes(g) ? curr.filter(x => x !== g) : [...curr, g]);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: '#e8e0f5', margin: '0 0 8px' }}>
          Campaign Details & Targeting
        </h2>
        <p style={{ color: '#8b7baa', fontSize: 14, margin: 0 }}>
          Define your campaign details and who you want to reach.
        </p>
      </div>

      {/* Basic details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Campaign Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Summer Sale 2024 - Awareness"
            value={data.name || ''}
            onChange={e => onChange('name', e.target.value)}
            style={{ fontSize: 15 }}
          />
        </div>
        <div>
          <label className="form-label">Start Date</label>
          <input type="date" className="form-input" value={data.startDate || ''} onChange={e => onChange('startDate', e.target.value)} />
        </div>
        <div>
          <label className="form-label">End Date</label>
          <input type="date" className="form-input" value={data.endDate || ''} onChange={e => onChange('endDate', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Currency</label>
          <select className="form-input" value={data.currency || 'USD'} onChange={e => onChange('currency', e.target.value)}>
            {['USD', 'EUR', 'GBP', 'XAF', 'NGN', 'GHS', 'ZAR', 'KES'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Tags (comma separated)</label>
          <input
            className="form-input"
            placeholder="summer, sale, retargeting"
            value={(data.tags || []).join(', ')}
            onChange={e => onChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          />
        </div>
      </div>

      {/* Audience Targeting */}
      <div style={{ padding: 24, borderRadius: 12, background: 'rgba(26,16,51,0.6)', border: '1px solid rgba(139,92,246,0.15)', marginBottom: 20 }}>
        <h4 style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#e8e0f5', margin: '0 0 20px' }}>
          🎯 Audience Targeting
        </h4>

        {/* Age Range */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Age Range: {targeting.ageMin} – {targeting.ageMax}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Min Age</label>
              <input
                type="range" min="13" max="65" value={targeting.ageMin}
                onChange={e => updateTargeting('ageMin', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#7c3aed' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Max Age</label>
              <input
                type="range" min="13" max="65" value={targeting.ageMax}
                onChange={e => updateTargeting('ageMax', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#7c3aed' }}
              />
            </div>
          </div>
        </div>

        {/* Gender */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Gender</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Male', 'Female', 'All'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGender(g)}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: targeting.genders?.includes(g) ? 'rgba(124,58,237,0.2)' : 'transparent',
                  border: `1px solid ${targeting.genders?.includes(g) ? 'rgba(124,58,237,0.5)' : 'rgba(139,92,246,0.2)'}`,
                  color: targeting.genders?.includes(g) ? '#c084fc' : '#6b7280', transition: 'all 0.2s'
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Locations</label>
          <input
            className="form-input"
            placeholder="Add locations e.g. Cameroon, Nigeria, France..."
            value={(targeting.locations || []).join(', ')}
            onChange={e => updateTargeting('locations', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
          />
        </div>

        {/* Interests */}
        <div>
          <label className="form-label">Interests</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTERESTS.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: targeting.interests?.includes(interest) ? 'rgba(124,58,237,0.2)' : 'rgba(26,16,51,0.8)',
                  border: `1px solid ${targeting.interests?.includes(interest) ? 'rgba(124,58,237,0.5)' : 'rgba(139,92,246,0.15)'}`,
                  color: targeting.interests?.includes(interest) ? '#c084fc' : '#6b7280', transition: 'all 0.2s'
                }}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Internal Notes</label>
        <textarea
          className="form-input"
          placeholder="Add any internal notes about this campaign..."
          rows={3}
          value={data.notes || ''}
          onChange={e => onChange('notes', e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
