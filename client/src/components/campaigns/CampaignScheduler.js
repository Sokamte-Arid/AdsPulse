import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const SCHEDULE_TYPES = [
  { id:'start',         icon:'▶️',  label:'Auto-Start',     desc:'Automatically start/resume the campaign' },
  { id:'pause',         icon:'⏸️', label:'Auto-Pause',      desc:'Automatically pause the campaign' },
  { id:'stop',          icon:'⏹️', label:'Auto-Stop',       desc:'Permanently stop the campaign' },
  { id:'budget_change', icon:'💰', label:'Change Budget',   desc:'Update campaign budget at a specific time' },
  { id:'recurring',     icon:'🔄', label:'Recurring',       desc:'Repeat an action on a schedule' },
];

const STATUS_COLORS = {
  pending:  { color:'#3b82f6', bg:'rgba(37,99,235,0.1)',   border:'rgba(37,99,235,0.25)'  },
  executed: { color:'#16a34a', bg:'rgba(22,163,74,0.1)',   border:'rgba(22,163,74,0.25)'  },
  failed:   { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.25)'  },
  cancelled:{ color:'#6b7280', bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.25)'},
};

// ── Format date for datetime-local input ──────────────────────────────────────
function toDatetimeLocal(date) {
  const d = date ? new Date(date) : new Date(Date.now() + 3600000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatScheduleDate(date) {
  return new Date(date).toLocaleString('en-US', {
    weekday:'short', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function timeUntil(date) {
  const diff = new Date(date) - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `in ${Math.floor(h/24)} days`;
  if (h > 0)  return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// ── Add/Edit Schedule Modal ───────────────────────────────────────────────────
function ScheduleModal({ campaignId, platforms, schedule, onSave, onClose }) {
  const isEdit = !!schedule;
  const [form, setForm] = useState({
    type:        schedule?.type        || 'start',
    scheduledAt: toDatetimeLocal(schedule?.scheduledAt || null),
    label:       schedule?.label       || '',
    notes:       schedule?.notes       || '',
    budget:      schedule?.action?.budget     || '',
    budgetType:  schedule?.action?.budgetType || 'daily',
    platform:    schedule?.action?.platform   || 'all',
    // Recurring
    frequency:   schedule?.recurrence?.frequency   || 'weekly',
    daysOfWeek:  schedule?.recurrence?.daysOfWeek  || [1], // Monday
    time:        schedule?.recurrence?.time        || '08:00',
    endDate:     schedule?.recurrence?.endDate ? toDatetimeLocal(schedule.recurrence.endDate).split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort()
    }));
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        campaignId,
        type:        form.type,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        label:       form.label || undefined,
        notes:       form.notes || undefined,
      };

      if (form.type === 'budget_change') {
        if (!form.budget || Number(form.budget) <= 0) {
          setError('Please enter a valid budget amount'); setSaving(false); return;
        }
        payload.action = {
          budget:     Number(form.budget),
          budgetType: form.budgetType,
          platform:   form.platform,
        };
      }

      if (form.type === 'recurring') {
        payload.recurrence = {
          frequency:  form.frequency,
          daysOfWeek: form.frequency === 'weekly' ? form.daysOfWeek : undefined,
          time:       form.time,
          endDate:    form.endDate ? new Date(form.endDate).toISOString() : undefined,
        };
      }

      if (isEdit) {
        await api.put(`/schedules/${schedule._id}`, payload);
      } else {
        await api.post('/schedules', payload);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const selectedType = SCHEDULE_TYPES.find(t => t.id === form.type);
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div className="glass-card" style={{ padding:32, maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
            {isEdit ? '✏️ Edit Schedule' : '⏰ Add Schedule'}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:22, padding:0 }}>✕</button>
        </div>

        {/* Schedule type selector */}
        <div style={{ marginBottom:20 }}>
          <label className="form-label">Action Type</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {SCHEDULE_TYPES.map(t => (
              <div key={t.id} onClick={() => update('type', t.id)}
                style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${form.type===t.id?'var(--purple-primary)':'var(--border-subtle)'}`,
                  background: form.type===t.id?'rgba(124,58,237,0.08)':'var(--bg-elevated)',
                  cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{t.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Date/time picker */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">
            {form.type === 'recurring' ? 'First Occurrence' : 'Scheduled Date & Time'}
          </label>
          <input className="form-input" type="datetime-local"
            value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)}
            min={toDatetimeLocal(new Date())}/>
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
            All times are in your local timezone
          </div>
        </div>

        {/* Budget change fields */}
        {form.type === 'budget_change' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label className="form-label">New Budget ($)</label>
              <input className="form-input" type="number" placeholder="500" min="1"
                value={form.budget} onChange={e => update('budget', e.target.value)}/>
            </div>
            <div>
              <label className="form-label">Budget Type</label>
              <select className="form-input" value={form.budgetType} onChange={e => update('budgetType', e.target.value)}>
                <option value="daily">Daily</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label className="form-label">Apply to Platform</label>
              <select className="form-input" value={form.platform} onChange={e => update('platform', e.target.value)}>
                <option value="all">All Platforms</option>
                {(platforms || []).map(p => (
                  <option key={p.platform} value={p.platform} style={{ textTransform:'capitalize' }}>
                    {p.platform}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Recurring fields */}
        {form.type === 'recurring' && (
          <div style={{ padding:'14px 16px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="form-label">Frequency</label>
                <select className="form-input" value={form.frequency} onChange={e => update('frequency', e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={form.time} onChange={e => update('time', e.target.value)}/>
              </div>
            </div>

            {form.frequency === 'weekly' && (
              <div style={{ marginBottom:12 }}>
                <label className="form-label">Days of Week</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {DAYS.map((day, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      style={{ padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                        border:`1px solid ${form.daysOfWeek.includes(i)?'var(--purple-primary)':'var(--border-subtle)'}`,
                        background: form.daysOfWeek.includes(i)?'rgba(124,58,237,0.15)':'var(--bg-input)',
                        color: form.daysOfWeek.includes(i)?'var(--purple-light)':'var(--text-faint)',
                        fontFamily:'DM Sans,sans-serif' }}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="form-label">End Date (optional)</label>
              <input className="form-input" type="date" value={form.endDate}
                onChange={e => update('endDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}/>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Leave empty to run indefinitely</div>
            </div>
          </div>
        )}

        {/* Label */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Label (optional)</label>
          <input className="form-input" placeholder={`e.g. Black Friday ${selectedType?.label}`}
            value={form.label} onChange={e => update('label', e.target.value)}/>
        </div>

        {/* Notes */}
        <div style={{ marginBottom:20 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-input" placeholder="Why this schedule is set up..."
            value={form.notes} onChange={e => update('notes', e.target.value)}
            rows={2} style={{ resize:'vertical' }}/>
        </div>

        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex:2, justifyContent:'center' }}>
            {saving ? '⏳ Saving...' : isEdit ? '✓ Update Schedule' : '✓ Add Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CampaignScheduler component ─────────────────────────────────────────
export default function CampaignScheduler({ campaignId, platforms }) {
  const [schedules,  setSchedules]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [toast,      setToast]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchSchedules = async () => {
    try {
      const res = await api.get(`/schedules/campaign/${campaignId}`);
      setSchedules(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedules(); }, [campaignId]);

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete schedule "${label}"?`)) return;
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
      fetchSchedules();
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
  };

  const pending   = schedules.filter(s => s.status === 'pending');
  const completed = schedules.filter(s => s.status !== 'pending');

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'13px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontSize:13, color:'var(--text-primary)', animation:'slideIn 0.3s ease-out', maxWidth:380 }}>
          {toast}
        </div>
      )}

      {(showModal || editSchedule) && (
        <ScheduleModal
          campaignId={campaignId}
          platforms={platforms}
          schedule={editSchedule}
          onSave={fetchSchedules}
          onClose={() => { setShowModal(false); setEditSchedule(null); }}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
            ⏰ Campaign Scheduling
          </h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
            Automate campaign actions — start, pause, stop or change budget at any time
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ fontSize:13 }}>
          + Add Schedule
        </button>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:10 }}/>)}
        </div>

      ) : schedules.length === 0 ? (
        /* Empty state */
        <div style={{ padding:'36px 20px', borderRadius:14, border:'2px dashed var(--border-subtle)', background:'var(--bg-elevated)', textAlign:'center' }}>
          <div style={{ fontSize:42, marginBottom:12 }}>⏰</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
            No Schedules Yet
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, maxWidth:380, margin:'0 auto 20px' }}>
            Automate this campaign — schedule it to start on Black Friday, pause over the weekend, change budget at month-end, and more.
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Create First Schedule
          </button>
        </div>

      ) : (
        <>
          {/* Pending / upcoming schedules */}
          {pending.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                Upcoming ({pending.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {pending.map(s => {
                  const typeInfo = SCHEDULE_TYPES.find(t => t.id === s.type);
                  const isPast = new Date(s.scheduledAt) < new Date();
                  return (
                    <div key={s._id} style={{ padding:'16px 18px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>
                      {/* Icon */}
                      <div style={{ width:40, height:40, borderRadius:10, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {typeInfo?.icon}
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                          {s.label || `${typeInfo?.label} scheduled`}
                        </div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, color:'var(--text-muted)' }}>
                          <span>📅 {formatScheduleDate(s.scheduledAt)}</span>
                          <span style={{ color: isPast ? '#ef4444' : '#3b82f6', fontWeight:600 }}>
                            {timeUntil(s.scheduledAt)}
                          </span>
                          {s.recurrence?.frequency && (
                            <span style={{ color:'var(--purple-light)' }}>🔄 {s.recurrence.frequency}</span>
                          )}
                          {s.action?.budget && (
                            <span>💰 → ${s.action.budget} {s.action.budgetType} ({s.action.platform || 'all'})</span>
                          )}
                        </div>
                        {s.notes && <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4, fontStyle:'italic' }}>{s.notes}</div>}
                      </div>
                      {/* Actions */}
                      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                        <button onClick={() => handleExecuteNow(s._id, s.label || typeInfo?.label)}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(22,163,74,0.3)', background:'rgba(22,163,74,0.1)', color:'#16a34a', cursor:'pointer', fontSize:11, fontWeight:600 }}
                          title="Execute now">
                          ▶ Now
                        </button>
                        <button onClick={() => { setEditSchedule(s); }}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(s._id, s.label || typeInfo?.label)}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Executed / past schedules */}
          {completed.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                History ({completed.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {completed.slice(0, 5).map(s => {
                  const typeInfo = SCHEDULE_TYPES.find(t => t.id === s.type);
                  const sc = STATUS_COLORS[s.status] || STATUS_COLORS.cancelled;
                  return (
                    <div key={s._id} style={{ padding:'12px 16px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', gap:12, alignItems:'center', opacity:0.8 }}>
                      <span style={{ fontSize:16 }}>{typeInfo?.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{s.label || typeInfo?.label}</div>
                        <div style={{ fontSize:11, color:'var(--text-faint)' }}>
                          {s.executedAt ? formatScheduleDate(s.executedAt) : formatScheduleDate(s.scheduledAt)}
                          {s.errorMessage && ` · ${s.errorMessage}`}
                        </div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, textTransform:'capitalize' }}>
                        {s.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
