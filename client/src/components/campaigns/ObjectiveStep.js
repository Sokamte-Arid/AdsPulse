import React from 'react';

const OBJECTIVES = [
  {
    group: 'AWARENESS',
    color: '#7c3aed',
    items: [
      { id:'awareness', icon:'🎯', label:'Brand Awareness', desc:'Reach people likely to remember your ad' },
      { id:'reach',     icon:'📡', label:'Reach',           desc:'Show your ad to the maximum number of people' },
    ]
  },
  {
    group: 'CONSIDERATION',
    color: '#3b82f6',
    items: [
      { id:'traffic',        icon:'🌐', label:'Traffic',         desc:'Send people to a destination on or off Facebook' },
      { id:'engagement',     icon:'💬', label:'Engagement',      desc:'Get more likes, comments, shares and followers' },
      { id:'app_installs',   icon:'📱', label:'App Installs',    desc:'Send people to the store to download your app' },
      { id:'video_views',    icon:'▶️',  label:'Video Views',     desc:'Get more people to watch your videos' },
      { id:'lead_generation',icon:'📋', label:'Lead Generation', desc:'Collect leads for your business' },
      { id:'messages',       icon:'💌', label:'Messages',        desc:'Get people to send messages to your business' },
    ]
  },
  {
    group: 'CONVERSION',
    color: '#16a34a',
    items: [
      { id:'conversions',   icon:'💰', label:'Conversions',    desc:'Get valuable actions on your website or app' },
      { id:'catalog_sales', icon:'🛍️', label:'Catalog Sales',  desc:'Show products from your catalog to your audience' },
      { id:'store_traffic', icon:'🏪', label:'Store Traffic',   desc:'Drive visits to your physical store locations' },
    ]
  },
];

export default function ObjectiveStep({ data, onChange }) {
  const selected = data.objective || '';

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>
          What's your campaign objective?
        </h2>
        <p style={{ fontSize:14, color:'var(--text-muted)', margin:0, lineHeight:1.6 }}>
          Choose an objective that reflects your goal. This will determine how your campaign is optimized.
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        {OBJECTIVES.map(group => (
          <div key={group.group}>
            {/* Group label */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ height:2, width:20, background:group.color, borderRadius:2 }}/>
              <span style={{ fontSize:11, fontWeight:800, color:group.color, letterSpacing:'0.1em' }}>
                {group.group}
              </span>
              <div style={{ flex:1, height:1, background:'var(--border-subtle)' }}/>
            </div>

            {/* Objective cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
              {group.items.map(obj => {
                const isSelected = selected === obj.id;
                return (
                  <button key={obj.id} type="button"
                    onClick={() => onChange({ ...data, objective: obj.id })}
                    style={{
                      padding:'16px',
                      borderRadius:12,
                      border:`2px solid ${isSelected ? group.color : 'var(--border-subtle)'}`,
                      background: isSelected ? `${group.color}15` : 'var(--bg-elevated)',
                      cursor:'pointer',
                      textAlign:'left',
                      display:'flex',
                      alignItems:'flex-start',
                      gap:12,
                      transition:'all 0.15s',
                      fontFamily:'DM Sans, sans-serif',
                      position:'relative',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = `${group.color}60`; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    <span style={{ fontSize:22, flexShrink:0 }}>{obj.icon}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: isSelected ? group.color : 'var(--text-primary)', marginBottom:3 }}>
                        {obj.label}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-faint)', lineHeight:1.5 }}>
                        {obj.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderRadius:'50%', background:group.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}