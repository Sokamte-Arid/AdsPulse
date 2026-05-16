import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import api from '../utils/api';

const TYPE_CONFIG = {
  start:         { icon:'▶️',  label:'Auto-Start',   color:'#16a34a' },
  pause:         { icon:'⏸️', label:'Auto-Pause',    color:'#d97706' },
  stop:          { icon:'⏹️', label:'Auto-Stop',     color:'#ef4444' },
  budget_change: { icon:'💰', label:'Budget Change', color:'#7c3aed' },
  recurring:     { icon:'🔄', label:'Recurring',     color:'#3b82f6' },
};

const STATUS_STYLES = {
  pending:  { color:'#3b82f6', bg:'rgba(37,99,235,0.1)'  },
  executed: { color:'#16a34a', bg:'rgba(22,163,74,0.1)'  },
  failed:   { color:'#ef4444', bg:'rgba(239,68,68,0.1)'  },
  cancelled:{ color:'#6b7280', bg:'rgba(107,114,128,0.1)'},
};

function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function timeUntil(date) {
  const diff = new Date(date) - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `in ${Math.floor(h/24)}d`;
  if (h > 0)  return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export default function SchedulesPage() {
  const navigate  = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('pending');
  const [toast,     setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  useEffect(() => {
    api.get('/schedules?status=all&limit=100')
      .then(res => setSchedules(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules(ss => ss.filter(s => s._id !== id));
      showToast('Schedule deleted');
    } catch (err) { showToast('❌ ' + err.message); }
  };

  const handleExecuteNow = async (id, label) => {
    if (!window.confirm(`Execute "${label}" right now?`)) return;
    try {
      await api.post(`/schedules/${id}/execute`);
      showToast(`✅ "${label}" executed`);
      const res = await api.get('/schedules?status=all&limit=100');
      setSchedules(res.data || []);
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
  };

  const filtered = schedules.filter(s =>
    filter === 'all' ? true : s.status === filter
  );

  const pending   = schedules.filter(s => s.status === 'pending').length;
  const executed  = schedules.filter(s => s.status === 'executed').length;
  const failed    = schedules.filter(s => s.status === 'failed').length;

  // Group pending by date
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate()+7);

  const groupByDate = (schedules) => {
    const groups = { 'Overdue':[], 'Today':[], 'Tomorrow':[], 'This Week':[], 'Later':[] };
    schedules.forEach(s => {
      const d = new Date(s.scheduledAt);
      if (d < today)     groups['Overdue'].push(s);
      else if (d < tomorrow) groups['Today'].push(s);
      else if (d < new Date(tomorrow.getTime()+86400000)) groups['Tomorrow'].push(s);
      else if (d < nextWeek) groups['This Week'].push(s);
      else groups['Later'].push(s);
    });
    return groups;
  };

  const groups = filter === 'pending' ? groupByDate(filtered) : null;

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out' }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Scheduling</h1>
          <p className="page-subtitle">Automate your campaign actions across all platforms</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/campaigns')} style={{ fontSize:13 }}>
          + Schedule a Campaign
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { label:'Pending',  value:pending,  icon:'⏳', color:'#3b82f6' },
          { label:'Executed', value:executed, icon:'✅', color:'#16a34a' },
          { label:'Failed',   value:failed,   icon:'❌', color:'#ef4444' },
          { label:'Total',    value:schedules.length, icon:'📋', color:'#7c3aed' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding:'18px 20px' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:24, display:'flex', gap:14 }}>
        <span style={{ fontSize:22, flexShrink:0 }}>⚙️</span>
        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--text-primary)' }}>How scheduling works:</strong> The system checks for due schedules every minute.
          Actions are pushed to real platform APIs (Meta, TikTok, etc.) automatically.
          To add a schedule, open any campaign → scroll to the Scheduling section.
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-elevated)', borderRadius:12, padding:4, width:'fit-content' }}>
        {['pending','executed','failed','all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 16px', borderRadius:9, border:'none', fontSize:13, fontWeight:600,
            cursor:'pointer', textTransform:'capitalize', fontFamily:'DM Sans,sans-serif',
            background: filter===f?'var(--bg-card)':'transparent',
            color: filter===f?'var(--text-primary)':'var(--text-faint)',
            boxShadow: filter===f?'0 2px 8px rgba(0,0,0,0.1)':'none',
            transition:'all 0.2s'
          }}>
            {f} {f!=='all' && schedules.filter(s=>s.status===f).length > 0 && `(${schedules.filter(s=>s.status===f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)}
        </div>

      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⏰</div>
          <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>
            No {filter !== 'all' ? filter : ''} Schedules
          </h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7, maxWidth:380, marginInline:'auto' }}>
            {filter === 'pending'
              ? 'No upcoming scheduled actions. Open a campaign and add a schedule to automate it.'
              : `No ${filter} schedules found.`}
          </p>
          <button className="btn-primary" onClick={() => navigate('/campaigns')}>
            Go to Campaigns →
          </button>
        </div>

      ) : groups ? (
        // Grouped by date for pending
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {Object.entries(groups).filter(([,items]) => items.length > 0).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize:12, fontWeight:700, color: group==='Overdue'?'#ef4444':'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                {group==='Overdue' && '⚠️ '}{group} ({items.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {items.map(s => <ScheduleRow key={s._id} schedule={s} onDelete={handleDelete} onExecute={handleExecuteNow} navigate={navigate}/>)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view for other statuses
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(s => <ScheduleRow key={s._id} schedule={s} onDelete={handleDelete} onExecute={handleExecuteNow} navigate={navigate}/>)}
        </div>
      )}
    </Layout>
  );
}

function ScheduleRow({ schedule: s, onDelete, onExecute, navigate }) {
  const typeInfo = TYPE_CONFIG[s.type] || TYPE_CONFIG.start;
  const statusStyle = STATUS_STYLES[s.status] || STATUS_STYLES.cancelled;
  const campaign = s.campaignId;
  const isPast = s.status === 'pending' && new Date(s.scheduledAt) < new Date();

  return (
    <div className="glass-card" style={{ padding:'16px 20px', display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap',
      borderLeft: isPast ? '3px solid #ef4444' : `3px solid ${typeInfo.color}` }}>
      {/* Icon */}
      <div style={{ width:38, height:38, borderRadius:10, background:`${typeInfo.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {typeInfo.icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
            {s.label || typeInfo.label}
          </span>
          <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:statusStyle.bg, color:statusStyle.color, textTransform:'capitalize' }}>
            {s.status}
          </span>
          {isPast && <span style={{ fontSize:11, fontWeight:700, color:'#ef4444' }}>⚠️ Overdue</span>}
        </div>

        <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'var(--text-muted)' }}>
          {campaign?.name && (
            <button onClick={() => navigate(`/campaigns/${campaign._id || campaign}`)}
              style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:12, fontWeight:600, padding:0 }}>
              📣 {campaign.name}
            </button>
          )}
          <span>📅 {formatDate(s.scheduledAt)}</span>
          {s.status === 'pending' && (
            <span style={{ color: isPast?'#ef4444':'#3b82f6', fontWeight:600 }}>
              {timeUntil(s.scheduledAt)}
            </span>
          )}
          {s.recurrence?.frequency && <span style={{ color:'var(--purple-light)' }}>🔄 {s.recurrence.frequency}</span>}
          {s.action?.budget && <span>💰 → ${s.action.budget} {s.action.budgetType}</span>}
          {s.executedAt && <span>✅ Ran {formatDate(s.executedAt)}</span>}
          {s.errorMessage && <span style={{ color:'#ef4444' }}>⚠️ {s.errorMessage}</span>}
        </div>

        {s.notes && <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4, fontStyle:'italic' }}>{s.notes}</div>}
      </div>

      {/* Actions */}
      {s.status === 'pending' && (
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={() => onExecute(s._id, s.label || typeInfo.label)}
            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(22,163,74,0.3)', background:'rgba(22,163,74,0.1)', color:'#16a34a', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            ▶ Now
          </button>
          <button onClick={() => onDelete(s._id, s.label || typeInfo.label)}
            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11 }}>
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
