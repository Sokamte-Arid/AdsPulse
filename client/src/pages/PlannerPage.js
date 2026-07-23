import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import { PlatformIcons, PLATFORMS } from '../utils/platforms';
import api from '../utils/api';
import { AlertTriangle, Campaigns, CheckCircle, Close, Edit, Eye, FileText, MessageSquare, Planner, Refresh, Repeat, Rocket, Save, Star, Trash, Video, XCircle } from '../components/shared/Icons.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HOURS      = Array.from({length:24}, (_,i) => i);

const STATUS_COLORS = {
  published:           { color:'#16a34a', bg:'rgba(22,163,74,0.15)',   border:'rgba(22,163,74,0.4)'   },
  scheduled:           { color:'#3b82f6', bg:'rgba(37,99,235,0.15)',   border:'rgba(37,99,235,0.4)'   },
  partially_published: { color:'#d97706', bg:'rgba(217,119,6,0.15)',   border:'rgba(217,119,6,0.4)'   },
  failed:              { color:'#ef4444', bg:'rgba(239,68,68,0.15)',   border:'rgba(239,68,68,0.4)'   },
  draft:               { color:'#6b7280', bg:'rgba(107,114,128,0.15)', border:'rgba(107,114,128,0.4)' },
  active:              { color:'#16a34a', bg:'rgba(22,163,74,0.15)',   border:'rgba(22,163,74,0.4)'   },
  paused:              { color:'#d97706', bg:'rgba(217,119,6,0.15)',   border:'rgba(217,119,6,0.4)'   },
};

const PLATFORM_COLORS = {
  meta:'#1877F2', instagram:'#E1306C', linkedin:'#0A66C2',
  twitter:'#000000', tiktok:'#010101', google:'#4285F4',
  youtube:'#FF0000', snapchat:'#FFFC00',
};

function toDatetimeLocal(date) {
  const d = date ? new Date(date) : new Date(Date.now() + 3600000);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatHour(h) {
  if (h===0)  return '12 AM';
  if (h<12)   return `${h} AM`;
  if (h===12) return '12 PM';
  return `${h-12} PM`;
}

function formatTime(date) {
  const d = new Date(date);
  const h = d.getHours(), m = d.getMinutes();
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
}

// ── Build all calendar events ─────────────────────────────────────────────────
function buildEvents(campaigns, posts) {
  const events = [];

  // Campaign events
  campaigns.forEach(c => {
    if (c.startDate) events.push({
      _id: c._id+'_start', _type:'campaign_start', _orig:c,
      date: new Date(c.startDate),
      label: c.name, sublabel:'▶ Campaign started',
      color:'#16a34a', bg:'rgba(22,163,74,0.15)', border:'rgba(22,163,74,0.4)',
      platforms: c.platforms?.map(p=>p.platform)||[],
    });
    if (c.endDate) events.push({
      _id: c._id+'_end', _type:'campaign_end', _orig:c,
      date: new Date(c.endDate),
      label: c.name, sublabel:'⏹ Campaign ended',
      color:'#ef4444', bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.4)',
      platforms: c.platforms?.map(p=>p.platform)||[],
    });
    if (!c.startDate && !c.endDate && c.createdAt) events.push({
      _id: c._id+'_created', _type:'campaign_created', _orig:c,
      date: new Date(c.createdAt),
      label: c.name, sublabel: 'Campaign created',
      color:'#7c3aed', bg:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.4)',
      platforms: c.platforms?.map(p=>p.platform)||[],
    });
  });

  // Post events
  posts.forEach(p => {
    const date     = p.publishedAt || p.scheduledAt || p.createdAt;
    const sc       = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
    const icon     = p.status==='published'?CheckCircle:p.status==='scheduled'?Planner:p.status==='failed'?XCircle:FileText;
    const imported = p.imported ? '↻ ' : '';
    events.push({
      _id:p._id, _type:'post', _orig:p,
      date: new Date(date),
      label: p.label || p.caption?.slice(0,35) || 'Post',
      sublabel: `${imported}${icon} ${p.status?.replace('_',' ')} · ${p.platforms?.map(pl=>pl.platform).join(', ')}`,
      color: sc.color, bg: sc.bg, border: sc.border,
      platforms: p.platforms?.map(pl=>pl.platform)||[],
      status: p.status,
      imported: p.imported,
    });
  });

  return events.sort((a,b) => a.date - b.date);
}

// ── Event Pill ────────────────────────────────────────────────────────────────
// Compact single-line pill — never expands the row height
function EventPill({ event, onClick }) {
  const Icon = PlatformIcons[event.platforms?.[0]];
  return (
    <div onClick={e=>{e.stopPropagation();onClick(event);}}
      title={`${formatTime(event.date)} · ${event.label}\n${event.sublabel}`}
      style={{
        padding:'2px 6px',
        borderRadius:5,
        background:event.bg,
        borderLeft:`3px solid ${event.color}`,
        cursor:'pointer',
        transition:'opacity 0.15s',
        /* Single line — never grows taller */
        display:'flex',
        alignItems:'center',
        gap:4,
        height:22,
        overflow:'hidden',
        flexShrink:0,
      }}
      onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
      {Icon&&<Icon size={10}/>}
      {event.imported && (
        <span style={{ fontSize:8, background:'rgba(37,99,235,0.2)', color:'#3b82f6', padding:'0 3px', borderRadius:3, fontWeight:700, flexShrink:0 }}><Refresh size={14}/></span>
      )}
      <span style={{ fontSize:10, fontWeight:700, color:event.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
        {formatTime(event.date)} · {event.label}
      </span>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ events, currentDate, onHourClick, onEventClick }) {
  useEffect(() => {
    const h = new Date().getHours();
    document.getElementById(`hour-${h}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, [currentDate]);

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate()-currentDate.getDay());
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); return d; });
  const today    = new Date();

  const getEventsForDayHour = (day,hour) => events.filter(e => e.date.toDateString()===day.toDateString() && e.date.getHours()===hour);
  const getEventsForDay     = (day)      => events.filter(e => e.date.toDateString()===day.toDateString());

  return (
    <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', borderBottom:'1px solid var(--border-subtle)', position:'sticky', top:0, background:'var(--bg-card)', zIndex:10 }}>
        <div style={{ padding:'10px 0', borderRight:'1px solid var(--border-subtle)' }}/>
        {weekDays.map((day,i) => {
          const isToday   = day.toDateString()===today.toDateString();
          const dayEvents = getEventsForDay(day);
          return (
            <div key={i} style={{ padding:'8px 6px', textAlign:'center', borderRight:'1px solid var(--border-subtle)', background:isToday?'rgba(124,58,237,0.06)':'transparent' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{DAYS_SHORT[i]}</div>
              <div style={{ fontSize:20, fontWeight:800, color:isToday?'var(--purple-light)':'var(--text-primary)', lineHeight:1.2, marginTop:2 }}>{day.getDate()}</div>
              {dayEvents.length>0&&<div style={{ fontSize:9, color:'var(--text-faint)', marginTop:2 }}>{dayEvents.length} event{dayEvents.length!==1?'s':''}</div>}
            </div>
          );
        })}
      </div>

      {/* Time grid — fixed row height, events overflow within column only */}
      <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 380px)', minHeight:400 }}>
        {HOURS.map(hour => {
          const isNow = today.getHours()===hour;
          return (
            <div key={hour} id={`hour-${hour}`}
              style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', height:64, borderBottom:'1px solid var(--border-subtle)', background:isNow?'rgba(124,58,237,0.03)':'transparent', overflow:'hidden' }}>
              <div style={{ padding:'5px 6px 0', borderRight:'1px solid var(--border-subtle)', fontSize:10, fontWeight:600, color:isNow?'var(--purple-light)':'var(--text-faint)', textAlign:'right', background:'var(--bg-card)', flexShrink:0 }}>
                {formatHour(hour)}
              </div>
              {weekDays.map((day,di) => {
                const hourEvents = getEventsForDayHour(day, hour);
                const isToday    = day.toDateString()===today.toDateString();
                return (
                  <div key={di}
                    onClick={()=>{ const d=new Date(day); d.setHours(hour,0,0,0); onHourClick(d); }}
                    style={{ borderRight:'1px solid var(--border-subtle)', background:isToday?'rgba(124,58,237,0.02)':'transparent', cursor:'pointer', position:'relative', overflow:'hidden' }}
                    onMouseEnter={e=>e.currentTarget.style.background=isToday?'rgba(124,58,237,0.05)':'rgba(124,58,237,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background=isToday?'rgba(124,58,237,0.02)':'transparent'}
                  >
                    {isToday&&isNow&&(
                      <div style={{ position:'absolute', top:`${(today.getMinutes()/60)*64}px`, left:0, right:0, height:2, background:'var(--purple-primary)', zIndex:5, pointerEvents:'none' }}>
                        <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--purple-primary)',position:'absolute',left:-4,top:-3 }}/>
                      </div>
                    )}
                    {/* Events stack inside column — row clips them, no row expansion */}
                    {hourEvents.length>0 && (
                      <div style={{ position:'absolute', top:2, left:2, right:2, display:'flex', flexDirection:'column', gap:2 }}
                        onClick={e=>e.stopPropagation()}>
                        {hourEvents.map((ev,ei)=><EventPill key={ei} event={ev} onClick={onEventClick}/>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ events, currentDate, onDayClick, onEventClick }) {
  const year=currentDate.getFullYear(), month=currentDate.getMonth(), today=new Date();
  const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate();
  const cells=Array.from({length:firstDay+daysInMonth},(_,i)=>i<firstDay?null:i-firstDay+1);
  while(cells.length%7!==0) cells.push(null);

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4 }}>
        {DAYS_SHORT.map(d=><div key={d} style={{ textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-faint)',textTransform:'uppercase',padding:'8px 0',letterSpacing:'0.05em' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3 }}>
        {cells.map((day,idx)=>{
          const target=day?new Date(year,month,day):null;
          const dayEvents=day?events.filter(e=>e.date.toDateString()===target.toDateString()):[];
          const isToday=day&&today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
          const isPast=day&&target<today;
          return(
            <div key={idx}
              onClick={()=>day&&onDayClick(new Date(year,month,day))}
              style={{
                /* Fixed height — cells never expand */
                height:110,
                padding:'6px 7px',
                borderRadius:10,
                opacity:day?1:0,
                background:day?(isPast&&!isToday?'rgba(0,0,0,0.02)':'var(--bg-elevated)'):'transparent',
                border:isToday?'2px solid var(--purple-primary)':'1px solid var(--border-subtle)',
                cursor:day?'pointer':'default',
                transition:'all 0.15s',
                overflow:'hidden',
                display:'flex',
                flexDirection:'column',
              }}
              onMouseEnter={e=>day&&(e.currentTarget.style.background='var(--bg-hover)')}
              onMouseLeave={e=>day&&(e.currentTarget.style.background=isPast&&!isToday?'rgba(0,0,0,0.02)':'var(--bg-elevated)')}
            >
              {day&&(
                <>
                  <div style={{ fontSize:12,fontWeight:isToday?800:600,color:isToday?'var(--purple-light)':isPast?'var(--text-faint)':'var(--text-primary)',marginBottom:4,flexShrink:0 }}>{day}</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:2,overflow:'hidden',flex:1 }}>
                    {dayEvents.slice(0,3).map((ev,i)=>{
                      const Icon=PlatformIcons[ev.platforms?.[0]];
                      return(
                        <div key={i} onClick={e=>{e.stopPropagation();onEventClick(ev);}}
                          title={`${formatTime(ev.date)} · ${ev.label}`}
                          style={{
                            padding:'2px 5px',
                            borderRadius:5,
                            background:ev.bg,
                            borderLeft:`3px solid ${ev.color}`,
                            fontSize:10,fontWeight:600,color:ev.color,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                            cursor:'pointer',
                            flexShrink:0,
                            height:20,
                            display:'flex',alignItems:'center',gap:3,
                          }}>
                          {ev.imported&&<span style={{ fontSize:8 }}><Refresh size={14}/></span>}
                          {Icon&&<Icon size={9}/>}
                          <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{formatTime(ev.date)} {ev.label}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length>3&&<div style={{ fontSize:10,color:'var(--purple-light)',fontWeight:700,paddingLeft:4 }}>+{dayEvents.length-3} more</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Event Detail Modal ────────────────────────────────────────────────────────
function EventDetail({ event, onClose, onEditPost, onDeletePost, onPublishPost }) {
  if (!event) return null;
  const orig=event._orig, isPost=event._type==='post';
  return(
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div className="glass-card" style={{ padding:32,maxWidth:500,width:'100%',maxHeight:'85vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
              <div style={{ fontSize:15,fontWeight:800,color:'var(--text-primary)' }}>{event.label}</div>
              {event.imported&&<span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(37,99,235,0.15)',color:'#3b82f6',fontWeight:700,border:'1px solid rgba(37,99,235,0.3)' }}>Imported</span>}
            </div>
            <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
              <span style={{ fontSize:11,padding:'2px 10px',borderRadius:20,background:event.bg,color:event.color,fontWeight:700,border:`1px solid ${event.border}`,textTransform:'capitalize' }}>
                {isPost?orig.status?.replace('_',' '):event._type?.replace('_',' ')}
              </span>
              <span style={{ fontSize:12,color:'var(--text-muted)',fontWeight:600 }}>
                <Planner size={14}/> {event.date.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:22,padding:0 }}><Close size={14}/></button>
        </div>

        {isPost&&(
          <>
            {orig.caption&&<div style={{ padding:'14px 16px',borderRadius:10,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',marginBottom:16,fontSize:14,color:'var(--text-primary)',lineHeight:1.7,whiteSpace:'pre-wrap' }}>{orig.caption}</div>}
            {orig.mediaUrls?.length>0&&<div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>{orig.mediaUrls.map((m,i)=><img key={i} src={m.url} alt="" style={{ height:80,borderRadius:8,objectFit:'cover' }}/>)}</div>}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Platform Status</div>
              {orig.platforms?.map(p=>{
                const Icon=PlatformIcons[p.platform];
                const si=p.status==='published'?CheckCircle:p.status==='failed'?XCircle:p.status==='scheduled'?Planner:'⏳';
                const metrics=[p.likes&&`${p.likes}`,p.comments&&`${p.comments}`,p.shares&&`${p.shares}`,p.reach&&`${p.reach}`].filter(Boolean).join('  ');
                return(
                  <div key={p.platform} style={{ padding:'10px 0',borderBottom:'1px solid var(--border-subtle)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
                      {Icon&&<Icon size={18}/>}
                      <span style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)',flex:1,textTransform:'capitalize' }}>{p.platform}</span>
                      <span>{si}</span>
                      <span style={{ fontSize:11,color:'var(--text-faint)',textTransform:'capitalize' }}>{p.status}</span>
                      {p.postUrl&&<a href={p.postUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:'var(--purple-light)' }}>View →</a>}
                    </div>
                    {metrics&&<div style={{ fontSize:11,color:'var(--text-faint)',paddingLeft:26 }}>{metrics}</div>}
                    {p.error&&<div style={{ fontSize:11,color:'#ef4444',paddingLeft:26 }}>{p.error.slice(0,80)}</div>}
                  </div>
                );
              })}
            </div>
            {!orig.imported&&(
              <div style={{ display:'flex',gap:10 }}>
                {['draft','scheduled','failed'].includes(orig.status)&&<button className="btn-secondary" onClick={()=>{onEditPost(orig);onClose();}} style={{ flex:1,justifyContent:'center' }}><Edit size={14}/>️ Edit</button>}
                {['draft','scheduled','failed'].includes(orig.status)&&<button className="btn-primary" onClick={()=>{onPublishPost(orig._id);onClose();}} style={{ flex:1,justifyContent:'center' }}><Rocket size={14}/> Publish Now</button>}
                <button onClick={()=>{onDeletePost(orig._id);onClose();}} style={{ padding:'10px 16px',borderRadius:10,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',cursor:'pointer',fontSize:13,fontWeight:600 }}><Trash size={14}/>️</button>
              </div>
            )}
          </>
        )}

        {!isPost&&(
          <>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
              {[{label:'Campaign',value:orig.name},{label:'Status',value:orig.status,cap:true},{label:'Budget',value:orig.totalBudget?`$${orig.totalBudget}`:'—'},{label:'Objective',value:orig.objective,cap:true}].map(item=>(
                <div key={item.label} style={{ padding:'10px 12px',borderRadius:8,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:3 }}>{item.label}</div>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)',textTransform:item.cap?'capitalize':'none' }}>{item.value||'—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:16 }}>
              {orig.platforms?.map(p=>{const Icon=PlatformIcons[p.platform];return Icon?<div key={p.platform} title={p.platform}><Icon size={22}/></div>:null;})}
            </div>
            <a href={`/campaigns/${orig._id}`} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 0',borderRadius:10,background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)',color:'var(--purple-light)',fontSize:13,fontWeight:600,textDecoration:'none' }}>
              View Campaign →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ── Post Composer Modal ───────────────────────────────────────────────────────
function PostComposer({ post, defaultDate, onSave, onClose }) {
  const isEdit = !!post;

  // Extract hashtags already in caption on edit
  const initialCaption   = post?.caption || '';
  const initialHashtags  = post?.hashtags || [];

  const [caption,     setCaption]    = useState(initialCaption);
  const [hashtags,    setHashtags]   = useState(initialHashtags);
  const [hashInput,   setHashInput]  = useState('');
  const [platforms,   setPlatforms]  = useState(post?.platforms?.map(p=>p.platform)||[]);
  const [scheduledAt, setScheduledAt]= useState(post?.scheduledAt?toDatetimeLocal(post.scheduledAt):defaultDate?toDatetimeLocal(defaultDate):'');
  const [publishNow,  setPublishNow] = useState(!post?.scheduledAt&&!defaultDate);
  const [label,       setLabel]      = useState(post?.label||'');
  const [mediaUrls,   setMediaUrls]  = useState(post?.mediaUrls||[]);
  const [uploading,   setUploading]  = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [publishing,  setPublishing] = useState(false);
  const [error,       setError]      = useState('');
  const fileRef    = useRef(null);
  const captionRef = useRef(null);

  const SUPPORTED  = ['meta','instagram','linkedin','twitter'];
  const limits     = {twitter:280,linkedin:3000,meta:63206,instagram:2200};

  // Full text = caption + hashtags appended
  const hashtagText  = hashtags.length > 0 ? '\n\n' + hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : '';
  const fullText     = caption + hashtagText;
  const minLimit     = platforms.length>0 ? Math.min(...platforms.map(p=>limits[p]||5000)) : 5000;
  const overLimit    = fullText.length > minLimit;

  const togglePlatform = id => setPlatforms(ps=>ps.includes(id)?ps.filter(p=>p!==id):[...ps,id]);

  // Add hashtag from input
  const addHashtag = (raw) => {
    const tags = raw.replace(/[^a-zA-Z0-9_\s#àáâãäåæçèéêëìíîïðñòóôõöùúûüý]/gi,'')
      .split(/[\s,]+/)
      .map(t => t.trim().replace(/^#+/, ''))
      .filter(t => t.length > 0);
    if (tags.length === 0) return;
    setHashtags(prev => {
      const existing = new Set(prev.map(h=>h.toLowerCase()));
      const newTags  = tags.filter(t => !existing.has(t.toLowerCase()));
      return [...prev, ...newTags];
    });
    setHashInput('');
  };

  const removeHashtag = (tag) => setHashtags(hs => hs.filter(h=>h!==tag));

  // Handle # typed directly in caption — extract to hashtag pills
  const handleCaptionChange = (e) => {
    const val = e.target.value;
    // Detect if user typed a complete hashtag (space or enter after #word)
    const hashtagRegex = /#(\w+)(?=\s|$)/g;
    let match;
    let cleanCaption = val;
    const found = [];
    while ((match = hashtagRegex.exec(val)) !== null) {
      // Only extract if followed by space (completed word)
      if (val[match.index + match[0].length] === ' ' || match.index + match[0].length === val.length - 0) {
        found.push(match[1]);
      }
    }
    setCaption(val);
  };

  // Handle Enter or comma or space in hashtag input
  const handleHashKeyDown = (e) => {
    if (['Enter',',' ,' '].includes(e.key)) {
      e.preventDefault();
      if (hashInput.trim()) addHashtag(hashInput);
    }
    if (e.key === 'Backspace' && !hashInput && hashtags.length > 0) {
      setHashtags(hs => hs.slice(0,-1));
    }
  };

  // Suggested popular hashtags per platform
  const SUGGESTIONS = {
    meta:      ['business','marketing','facebook','socialmedia'],
    instagram: ['instagood','photooftheday','reels','instagram'],
    linkedin:  ['linkedin','professional','business','networking'],
    twitter:   ['trending','twitter','news'],
  };
  const suggestions = [...new Set(platforms.flatMap(p => SUGGESTIONS[p]||[]))]
    .filter(s => !hashtags.includes(s))
    .slice(0,6);

  const handleUpload = async e => {
    const file=e.target.files[0]; if(!file)return; setUploading(true);
    try{
      const form=new FormData(); form.append('file',file);
      const res=await api.post('/posts/upload-media',form,{headers:{'Content-Type':'multipart/form-data'}});
      setMediaUrls(u=>[...u,res.data]);
    }catch(err){setError(err.response?.data?.message||err.message);}
    finally{setUploading(false);e.target.value='';}
  };

  const handleSave = async (publish=false) => {
    if(!caption.trim()){setError('Caption is required');return;}
    if(!platforms.length){setError('Select at least one platform');return;}
    if(!publishNow&&!publish&&!scheduledAt){setError('Set a date or choose Post Now');return;}
    publish?setPublishing(true):setSaving(true); setError('');
    try{
      // Append hashtags to caption before sending
      const finalCaption = caption + (hashtags.length>0 ? '\n\n'+hashtags.map(h=>h.startsWith('#')?h:`#${h}`).join(' ') : '');
      const payload = {
        caption:     finalCaption,
        hashtags,
        platforms, mediaUrls, label,
        scheduledAt: (!publishNow&&!publish) ? new Date(scheduledAt).toISOString() : undefined,
        publishNow:  publish||publishNow,
      };
      if(isEdit){await api.put(`/posts/${post._id}`,payload);if(publish)await api.post(`/posts/${post._id}/publish`);}
      else{await api.post('/posts',payload);}
      onSave(); onClose();
    }catch(err){setError(err.response?.data?.message||err.message);}
    finally{setSaving(false);setPublishing(false);}
  };

  return(
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div className="glass-card" style={{ padding:32,maxWidth:580,width:'100%',maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22 }}>
          <h3 style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)',margin:0 }}>{isEdit? <><Edit size={14}/> Edit Post</> : <><Edit size={14}/> Create Post</>}</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:22,padding:0 }}><Close size={14}/></button>
        </div>

        {/* Platform selector */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Publish to</label>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {SUPPORTED.map(id=>{const pl=PLATFORMS.find(p=>p.id===id);const Icon=PlatformIcons[id];const sel=platforms.includes(id);return(<button key={id} onClick={()=>togglePlatform(id)} type="button" style={{ padding:'8px 14px',borderRadius:10,border:`2px solid ${sel?PLATFORM_COLORS[id]:'var(--border-subtle)'}`,background:sel?`${PLATFORM_COLORS[id]}18`:'var(--bg-elevated)',cursor:'pointer',display:'flex',alignItems:'center',gap:7,transition:'all 0.15s',fontFamily:'DM Sans,sans-serif' }}>{Icon&&<Icon size={18}/>}<span style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)' }}>{pl?.name||id}</span></button>);})}
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
            <label className="form-label" style={{ margin:0 }}>Caption</label>
            <span style={{ fontSize:11,color:overLimit?'#ef4444':'var(--text-faint)',fontWeight:600 }}>{fullText.length}/{minLimit}</span>
          </div>
          <textarea ref={captionRef} className="form-input"
            placeholder="Write your post caption... (you can also type #hashtags here)"
            value={caption} onChange={handleCaptionChange} rows={5}
            style={{ resize:'vertical',borderColor:overLimit?'#ef4444':undefined }}/>
        </div>

        {/* Hashtags */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Hashtags</label>

          {/* Tag pills + input */}
          <div style={{ padding:'8px 10px',borderRadius:10,border:'1px solid var(--border-subtle)',background:'var(--bg-input)',display:'flex',flexWrap:'wrap',gap:6,minHeight:42,alignItems:'center',cursor:'text' }}
            onClick={()=>document.getElementById('hashtag-input')?.focus()}>
            {hashtags.map(tag=>(
              <span key={tag} style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.35)',color:'var(--purple-light)',fontSize:12,fontWeight:700 }}>
                #{tag}
                <button onClick={e=>{e.stopPropagation();removeHashtag(tag);}}
                  style={{ background:'none',border:'none',color:'var(--purple-light)',cursor:'pointer',padding:0,fontSize:14,lineHeight:1,display:'flex',alignItems:'center' }}>×</button>
              </span>
            ))}
            <input id="hashtag-input" type="text"
              value={hashInput} onChange={e=>setHashInput(e.target.value.replace(/\s/,''))}
              onKeyDown={handleHashKeyDown}
              onBlur={()=>{ if(hashInput.trim()) addHashtag(hashInput); }}
              placeholder={hashtags.length===0?'Add hashtags... (press Enter or Space to add)':''}
              style={{ border:'none',outline:'none',background:'transparent',fontSize:13,color:'var(--text-primary)',minWidth:160,flex:1,fontFamily:'DM Sans,sans-serif' }}/>
          </div>
          <div style={{ fontSize:11,color:'var(--text-faint)',marginTop:5,lineHeight:1.6 }}>
            Type a tag and press <strong>Enter</strong> or <strong>Space</strong> to add it. The # is added automatically.
          </div>

          {/* Suggestions */}
          {suggestions.length>0&&(
            <div style={{ marginTop:8,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
              <span style={{ fontSize:11,color:'var(--text-faint)' }}>Suggested:</span>
              {suggestions.map(s=>(
                <button key={s} onClick={()=>setHashtags(hs=>[...hs,s])} type="button"
                  style={{ padding:'2px 10px',borderRadius:20,border:'1px dashed var(--border-subtle)',background:'transparent',color:'var(--text-faint)',cursor:'pointer',fontSize:11,fontFamily:'DM Sans,sans-serif',transition:'all 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--purple-primary)';e.currentTarget.style.color='var(--purple-light)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-subtle)';e.currentTarget.style.color='var(--text-faint)';}}>
                  + #{s}
                </button>
              ))}
            </div>
          )}

          {/* Preview of final post text */}
          {hashtags.length>0&&(
            <div style={{ marginTop:10,padding:'10px 14px',borderRadius:8,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--text-faint)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Post Preview</div>
              <div style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
                {caption}
                {hashtags.length>0&&(
                  <span style={{ color:'var(--purple-light)',fontWeight:600 }}>
                    {'\n\n'}{hashtags.map(h=>h.startsWith('#')?h:`#${h}`).join(' ')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Media */}
        <div style={{ marginBottom:14 }}>
          <label className="form-label">Media (optional)</label>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            {mediaUrls.map((m,i)=>(
              <div key={i} style={{ position:'relative',width:72,height:72 }}>
                {m.type==='image'?<img src={m.url} alt="" style={{ width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid var(--border-subtle)' }}/>:<div style={{ width:72,height:72,borderRadius:8,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',justifyContent:'center' }}><Video size={24}/></div>}
                <button onClick={()=>setMediaUrls(u=>u.filter((_,j)=>j!==i))} style={{ position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef4444',border:'none',color:'white',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center' }}><Close size={14}/></button>
              </div>
            ))}
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{ width:72,height:72,borderRadius:8,border:'2px dashed var(--border-subtle)',background:'var(--bg-elevated)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4 }}>
              {uploading?<div style={{ width:20,height:20,border:'2px solid var(--border-subtle)',borderTopColor:'var(--purple-primary)',borderRadius:'50%',animation:'spin 0.6s linear infinite' }}/>:<span style={{ fontSize:22 }}>+</span>}
              <span style={{ fontSize:10,color:'var(--text-faint)' }}>Add</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display:'none' }}/>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="form-label">Label (optional)</label>
          <input className="form-input" placeholder="e.g. Product launch" value={label} onChange={e=>setLabel(e.target.value)}/>
        </div>

        <div style={{ marginBottom:20,padding:16,borderRadius:12,background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)' }}>
          <label className="form-label">When to post</label>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }}>
              <input type="radio" checked={publishNow} onChange={()=>setPublishNow(true)} style={{ accentColor:'var(--purple-primary)',width:16,height:16 }}/>
              <div><div style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>Post Now</div><div style={{ fontSize:11,color:'var(--text-faint)' }}>Publish immediately</div></div>
            </label>
            <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }}>
              <input type="radio" checked={!publishNow} onChange={()=>setPublishNow(false)} style={{ accentColor:'var(--purple-primary)',width:16,height:16 }}/>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>Schedule for Later</div><div style={{ fontSize:11,color:'var(--text-faint)' }}>Pick a date and time</div></div>
            </label>
            {!publishNow&&<input className="form-input" type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} min={toDatetimeLocal(new Date())} style={{ marginLeft:26,marginTop:4 }}/>}
          </div>
        </div>

        {error&&<div style={{ padding:'10px 14px',borderRadius:8,marginBottom:14,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:13 }}><AlertTriangle size={14}/>️ {error}</div>}

        <div style={{ display:'flex',gap:10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex:1,justifyContent:'center' }}>Cancel</button>
          {!publishNow&&<button className="btn-secondary" onClick={()=>handleSave(false)} disabled={saving} style={{ flex:1,justifyContent:'center' }}>{saving? '⏳ Saving...' : <><Save size={14}/> Draft</>}</button>}
          <button className="btn-primary" onClick={()=>handleSave(publishNow)} disabled={saving||publishing||overLimit} style={{ flex:2,justifyContent:'center',background:publishNow?undefined:'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
            {publishing?'⏳ Publishing...':saving?'⏳ Scheduling...':publishNow?<><Rocket size={14}/> Post Now</>:<><Planner size={14}/> Schedule</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PLANNER PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function PlannerPage() {
  useSetPageTitle("Planner", "Plan content, manage campaigns and schedules");
  const [view,           setView]          = useState('week');
  const [currentDate,    setCurrentDate]   = useState(new Date());
  const [posts,          setPosts]         = useState([]);
  const [campaigns,      setCampaigns]     = useState([]);
  const [allEvents,      setAllEvents]     = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [syncing,        setSyncing]       = useState(false);
  const [syncResult,     setSyncResult]    = useState(null);
  const [showComposer,   setShowComposer]  = useState(false);
  const [editPost,       setEditPost]      = useState(null);
  const [selectedEvent,  setSelectedEvent] = useState(null);
  const [defaultDate,    setDefaultDate]   = useState(null);
  const [filterPlatform, setFilterPlatform]= useState('all');
  const [filterType,     setFilterType]    = useState('all');
  const [toast,          setToast]         = useState('');

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),5000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, campaignsRes] = await Promise.all([
        api.get('/posts'),
        api.get('/campaigns', { params:{limit:200} }),
      ]);
      const fp=postsRes.data||[], fc=campaignsRes.data?.campaigns||[];
      setPosts(fp); setCampaigns(fc);
      setAllEvents(buildEvents(fc, fp));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync historical posts from all platforms
  const handleSyncHistory = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await api.post('/post-history/sync-history');
      setSyncResult(res.data);
      showToast(`${res.data.message}`);
      fetchData(); // reload calendar with new posts
    } catch (err) {
      showToast('' + (err.response?.data?.message || err.message));
    } finally { setSyncing(false); }
  };

  const filteredEvents = allEvents.filter(e => {
    if (filterType==='post'&&!e._type.includes('post'))         return false;
    if (filterType==='campaign'&&!e._type.includes('campaign')) return false;
    if (filterPlatform!=='all'&&!e.platforms.includes(filterPlatform)) return false;
    return true;
  });

  const handleDeletePost = async id => {
    if(!window.confirm('Delete this post?'))return;
    try{await api.delete(`/posts/${id}`);showToast('Post deleted');fetchData();}
    catch(err){showToast(''+err.message);}
  };

  const handlePublishNow = async id => {
    try{await api.post(`/posts/${id}/publish`);showToast('Post published!');fetchData();}
    catch(err){showToast(''+(err.response?.data?.message||err.message));}
  };

  const nav = dir => {
    const d=new Date(currentDate);
    if(view==='week') d.setDate(d.getDate()+dir*7);
    if(view==='month') d.setMonth(d.getMonth()+dir);
    setCurrentDate(d);
  };

  const startOfWeek=new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate()-currentDate.getDay());
  const endOfWeek=new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate()+6);
  const title=view==='week'
    ?`${startOfWeek.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${endOfWeek.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`
    :`${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const totalImported   = posts.filter(p=>p.imported).length;
  const totalPublished  = posts.filter(p=>p.status==='published').length;
  const totalScheduled  = posts.filter(p=>p.status==='scheduled').length;
  const activeCampaigns = campaigns.filter(c=>c.status==='active').length;

  return (
    <Layout>
      {toast&&<div style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'13px 18px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',boxShadow:'0 8px 32px rgba(0,0,0,0.2)',fontSize:13,color:'var(--text-primary)',animation:'slideIn 0.3s ease-out',maxWidth:420 }}>{toast}</div>}

      {(showComposer||editPost)&&<PostComposer post={editPost} defaultDate={defaultDate} onSave={()=>{fetchData();showToast(editPost?'Post updated':'Post created!');}} onClose={()=>{setShowComposer(false);setEditPost(null);setDefaultDate(null);}}/>}
      {selectedEvent&&<EventDetail event={selectedEvent} onClose={()=>setSelectedEvent(null)} onEditPost={p=>{setEditPost(p);setSelectedEvent(null);}} onDeletePost={handleDeletePost} onPublishPost={handlePublishNow}/>}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Planner</h1>
          <p className="page-subtitle">All campaigns and posts — created in AdsPulse or imported from your platforms</p>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button className="btn-secondary" onClick={handleSyncHistory} disabled={syncing} style={{ fontSize:13 }}>
            {syncing? '⏳ Importing...' : <><Refresh size={14}/> Import from Platforms</>}
          </button>
          <button className="btn-primary" onClick={()=>{setDefaultDate(null);setShowComposer(true);}} style={{ fontSize:13 }}>
            <Edit size={14}/>️ New Post
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div style={{ padding:'14px 20px',borderRadius:12,marginBottom:16,background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.25)',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap' }}>
          <span style={{ fontSize:20 }}><CheckCircle size={14}/></span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:6 }}>{syncResult.message}</div>
            <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              {Object.entries(syncResult.results||{}).map(([platform,r])=>(
                <div key={platform} style={{ fontSize:12,color:'var(--text-muted)',display:'flex',gap:5,alignItems:'center' }}>
                  {PlatformIcons[platform]&&React.createElement(PlatformIcons[platform],{size:14})}
                  <span style={{ textTransform:'capitalize',fontWeight:600 }}>{platform}:</span>
                  {r.imported>0&&<span style={{ color:'#16a34a' }}>{r.imported} imported</span>}
                  {r.updated>0&&<span style={{ color:'#d97706' }}>{r.updated} updated</span>}
                </div>
              ))}
            </div>
            {Object.keys(syncResult.errors||{}).length>0&&(
              <div style={{ marginTop:8,fontSize:12,color:'#d97706' }}>
                <AlertTriangle size={14}/>️ Some platforms had issues: {Object.keys(syncResult.errors).join(', ')}. Check that they have the right permissions.
              </div>
            )}
          </div>
          <button onClick={()=>setSyncResult(null)} style={{ background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:18,padding:0 }}><Close size={14}/></button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:12,marginBottom:20 }}>
        {[
          {label:'Active Campaigns',value:activeCampaigns,icon:Campaigns,color:'#16a34a'},
          {label:'Published Posts', value:totalPublished, icon:CheckCircle,color:'#3b82f6'},
          {label:'Scheduled Posts', value:totalScheduled, icon:Planner,color:'#d97706'},
          {label:'Imported Posts',  value:totalImported,  icon:Refresh,color:'#7c3aed'},
        ].map(s=>(
          <div key={s.label} className="glass-card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:18,marginBottom:4 }}>{s.icon && React.createElement(s.icon, { size:18 })}</div>
            <div style={{ fontSize:20,fontWeight:800,color:s.color,marginBottom:2 }}>{s.value}</div>
            <div style={{ fontSize:11,color:'var(--text-muted)',fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,background:'var(--bg-card)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button onClick={()=>nav(-1)} style={{ padding:'7px 13px',borderRadius:8,border:'1px solid var(--border-subtle)',background:'var(--bg-elevated)',color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:700 }}>‹</button>
            <button onClick={()=>nav(1)}  style={{ padding:'7px 13px',borderRadius:8,border:'1px solid var(--border-subtle)',background:'var(--bg-elevated)',color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:700 }}>›</button>
            <button onClick={()=>setCurrentDate(new Date())} style={{ padding:'6px 14px',borderRadius:8,border:'1px solid var(--border-subtle)',background:'var(--bg-elevated)',color:'var(--text-muted)',cursor:'pointer',fontSize:12,fontWeight:600 }}>Today</button>
            <h3 style={{ fontSize:15,fontWeight:800,color:'var(--text-primary)',margin:0 }}>{title}</h3>
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
            <select className="form-input" value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ width:'auto',fontSize:12 }}>
              <option value="all">All Activity</option>
              <option value="post">Posts Only</option>
              <option value="campaign">Campaigns Only</option>
            </select>
            <select className="form-input" value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{ width:'auto',fontSize:12 }}>
              <option value="all">All Platforms</option>
              {PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ display:'flex',background:'var(--bg-elevated)',borderRadius:9,padding:3,border:'1px solid var(--border-subtle)' }}>
              {[{v:'week',label:'Week'},{v:'month',label:'Month'}].map(({v,label})=>(
                <button key={v} onClick={()=>setView(v)} style={{ padding:'6px 18px',borderRadius:7,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif',background:view===v?'var(--purple-primary)':'transparent',color:view===v?'white':'var(--text-faint)',transition:'all 0.2s' }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding:'8px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',gap:14,flexWrap:'wrap',background:'var(--bg-elevated)',alignItems:'center' }}>
          {[
            {color:'#16a34a',label:'Published / Active'},
            {color:'#3b82f6',label:'Scheduled'},
            {color:'#7c3aed',label:'Campaign'},
            {color:'#ef4444',label:'Ended / Failed'},
            {color:'#d97706',label:'Paused'},
          ].map(l=>(
            <div key={l.label} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-faint)' }}>
              <div style={{ width:10,height:10,borderRadius:3,background:l.color }}/>
              {l.label}
            </div>
          ))}
          <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#3b82f6' }}>
            <span style={{ fontSize:9,background:'rgba(37,99,235,0.2)',color:'#3b82f6',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>imported</span>
            Imported from platform
          </div>
          <span style={{ marginLeft:'auto',fontSize:11,color:'var(--text-muted)' }}>
            {view==='week'?'Click any time slot to schedule a post':'Click any day to schedule a post'}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding:view==='month'?20:0 }}>
          {loading ? (
            <div style={{ padding:40,textAlign:'center' }}>
              <div style={{ width:32,height:32,border:'3px solid var(--border-subtle)',borderTopColor:'var(--purple-primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px' }}/>
              <div style={{ fontSize:13,color:'var(--text-muted)' }}>Loading your content history...</div>
            </div>
          ) : view==='week' ? (
            <WeekView
              events={filteredEvents}
              currentDate={currentDate}
              onHourClick={date=>{setDefaultDate(date);setShowComposer(true);}}
              onEventClick={setSelectedEvent}
            />
          ) : (
            <MonthView
              events={filteredEvents}
              currentDate={currentDate}
              onDayClick={date=>{setDefaultDate(date);setShowComposer(true);}}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}