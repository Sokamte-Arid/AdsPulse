import React from 'react';
import { KPI_DEFINITIONS, formatKPI } from '../../utils/platforms';
import { DynIcon, TrendingDown } from '../shared/Icons.js';

export default function KPICards({ data, selectedKPI, onSelectKPI }) {
  return (
    <div className="kpi-grid">
      {KPI_DEFINITIONS.map(kpi => {
        const value = data?.[kpi.id] ?? 0;
        const isSelected = selectedKPI === kpi.id;
        return (
          <div
            key={kpi.id}
            className={`glass-card kpi-card ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectKPI(kpi.id)}
            style={{ padding:'16px 18px' }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{
                width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center',
                background: isSelected ? `${kpi.color}22` : 'var(--bg-elevated)',
                fontSize:16, transition:'all 0.2s', flexShrink:0
              }}>
                <DynIcon icon={kpi.icon} size={14}/>
              </div>
              {isSelected && (
                <div style={{ width:8,height:8,borderRadius:'50%',background:kpi.color,boxShadow:`0 0 8px ${kpi.color}`,marginTop:4 }}/>
              )}
            </div>
            <div className="kpi-value" style={{
              fontSize:'clamp(18px,2.5vw,22px)', fontWeight:800,
              color: kpi.format === 'roi'
                ? (Number(value) >= 0 ? '#16a34a' : '#ef4444')
                : isSelected ? kpi.color : 'var(--text-primary)',
              marginBottom:4, lineHeight:1.2, transition:'color 0.2s'
            }}>
              {formatKPI(value, kpi.format)}
            </div>
            <div className="kpi-label" style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.02em' }}>
              {kpi.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}