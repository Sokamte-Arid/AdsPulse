import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useSetPageTitle } from '../context/PageContext';
import api from '../utils/api';
import { PlatformIcons } from '../utils/platforms';
import {
  AlertCircle, Bell, Check, CheckCircle,
  Close, MessageSquare, Refresh, Search, Send, Bolt, Tag,
  Trash, Lock, Globe
} from '../components/shared/Icons';

const SENTIMENT_STYLES = {
  positive: { color:'#16a34a', bg:'rgba(22,163,74,0.1)',  label:'Positive' },
  neutral:  { color:'#6b7280', bg:'rgba(107,114,128,0.1)', label:'Neutral'  },
  negative: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   label:'Negative' },
};

const STATUS_STYLES = {
  unread:   { color:'#3b82f6', bg:'rgba(59,130,246,0.1)',  label:'Unread'   },
  read:     { color:'#6b7280', bg:'rgba(107,114,128,0.1)', label:'Read'     },
  replied:  { color:'#16a34a', bg:'rgba(22,163,74,0.1)',   label:'Replied'  },
  archived: { color:'#9ca3af', bg:'rgba(156,163,175,0.1)', label:'Archived' },
};

const PLATFORM_COLORS = {
  meta:'#1877F2', instagram:'#E1306C', twitter:'#000000',
  linkedin:'#0A66C2', youtube:'#FF0000', tiktok:'#69C9D0', whatsapp:'#25D366',
};

// Platforms that support DM from comment
const DM_SUPPORTED = ['meta', 'instagram'];

function MessageCard({ msg, selected, onClick }) {
  const Icon      = PlatformIcons[msg.platform];
  const sentiment = SENTIMENT_STYLES[msg.sentiment] || SENTIMENT_STYLES.neutral;
  const isUnread  = msg.status === 'unread';

  return (
    <div onClick={onClick} style={{
      padding:'14px 16px', cursor:'pointer', borderBottom:'1px solid var(--border-subtle)',
      background: selected ? 'rgba(124,58,237,0.08)' : isUnread ? 'rgba(59,130,246,0.04)' : 'transparent',
      borderLeft: selected ? '3px solid var(--purple-primary)' : '3px solid transparent',
      transition:'all 0.15s',
    }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:`${PLATFORM_COLORS[msg.platform] || '#7c3aed'}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:700, color:PLATFORM_COLORS[msg.platform] || '#7c3aed' }}>
          {msg.senderName?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
            <span style={{ fontSize:13, fontWeight: isUnread ? 700 : 600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>
              {msg.senderName || 'Unknown'}
            </span>
            <span style={{ fontSize:10, color:'var(--text-faint)', whiteSpace:'nowrap', marginLeft:6 }}>
              {new Date(msg.platformCreatedAt || msg.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>
            {msg.message}
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {Icon && <Icon size={10}/>}
            <span style={{ fontSize:10, color:'var(--text-faint)', textTransform:'capitalize' }}>{msg.platform}</span>
            <span style={{ fontSize:10, color:'var(--text-faint)' }}>·</span>
            <span style={{ fontSize:10, textTransform:'capitalize', color:'var(--text-faint)' }}>{msg.type}</span>
            {msg.dmSent && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:'rgba(124,58,237,0.1)', color:'var(--purple-light)', fontWeight:600 }}>DM sent</span>}
            <span style={{ marginLeft:'auto', fontSize:10, padding:'1px 6px', borderRadius:20, background:sentiment.bg, color:sentiment.color, fontWeight:600 }}>
              {sentiment.label}
            </span>
          </div>
        </div>
        {isUnread && <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6', flexShrink:0, marginTop:4 }}/>}
      </div>
    </div>
  );
}

export default function InboxPage() {
  useSetPageTitle('Unified Inbox', 'Manage all your social media messages and comments in one place');

  const [messages,    setMessages]    = useState([]);
  const [stats,       setStats]       = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [replying,    setReplying]    = useState(false);
  const [sendingDM,   setSendingDM]   = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [replyText,   setReplyText]   = useState('');
  const [replyMode,   setReplyMode]   = useState('public'); // 'public' | 'dm'
  const [toast,       setToast]       = useState({ msg:'', type:'info' });
  const [total,       setTotal]       = useState(0);
  const [filters,     setFilters]     = useState({ platform:'all', status:'all', type:'all', sentiment:'all', search:'' });
  const [searchInput, setSearchInput] = useState('');
  const replyRef = useRef();

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg:'', type:'info' }), 4000); };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v && v !== 'all'));
      const [msgRes, statsRes] = await Promise.all([
        api.get('/inbox', { params }),
        api.get('/inbox/stats'),
      ]);
      setMessages(msgRes.data.messages || []);
      setTotal(msgRes.data.total || 0);
      setStats(statsRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMessages(); }, [filters]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/inbox/sync');
      showToast(`Synced ${res.data.synced} new messages`);
      loadMessages();
    } catch (err) {
      showToast(err.response?.data?.message || 'Sync failed', 'error');
    } finally { setSyncing(false); }
  };

  const handleSelect = async (msg) => {
    setSelected(msg);
    setReplyText('');
    // Default to public for comments, dm mode for messages
    setReplyMode(msg.type === 'message' ? 'dm' : 'public');
    if (msg.status === 'unread') {
      await api.put(`/inbox/${msg._id}/status`, { status: 'read' }).catch(() => {});
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, status:'read' } : m));
      setStats(prev => prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : prev);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;

    if (replyMode === 'dm') {
      // Send private DM
      setSendingDM(true);
      try {
        await api.post(`/inbox/${selected._id}/send-dm`, { message: replyText });
        setSelected(prev => ({ ...prev, dmSent: true, dmText: replyText }));
        setMessages(prev => prev.map(m => m._id === selected._id ? { ...m, dmSent: true } : m));
        setReplyText('');
        showToast('Private DM sent successfully!');
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to send DM', 'error');
      } finally { setSendingDM(false); }
    } else {
      // Public reply
      setReplying(true);
      try {
        const endpoint = selected.platform === 'whatsapp'
          ? `/whatsapp/reply/${selected._id}`
          : `/inbox/${selected._id}/reply`;
        const res = await api.post(endpoint, { message: replyText });
        setSelected(res.data);
        setMessages(prev => prev.map(m => m._id === res.data._id ? res.data : m));
        setReplyText('');
        showToast(selected.type === 'comment' ? 'Public reply posted!' : 'Reply sent!');
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to send reply', 'error');
      } finally { setReplying(false); }
    }
  };

  const handleAiReply = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/inbox/${selected._id}/ai-reply`);
      setReplyText(res.data.suggestion);
      replyRef.current?.focus();
    } catch (err) {
      showToast(err.response?.data?.message || 'AI reply failed', 'error');
    } finally { setAiLoading(false); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/inbox/${id}`);
    setMessages(prev => prev.filter(m => m._id !== id));
    if (selected?._id === id) setSelected(null);
    showToast('Message deleted');
  };

  const canSendDM = selected && DM_SUPPORTED.includes(selected.platform) && selected.type === 'comment' && selected.senderId;
  const isComment = selected?.type === 'comment';

  const toastColors = {
    success: { bg:'rgba(22,163,74,0.15)', border:'rgba(22,163,74,0.3)' },
    error:   { bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.3)' },
    info:    { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.3)' },
  };

  return (
    <Layout>
      {toast.msg && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 18px', borderRadius:12, background:toastColors[toast.type]?.bg, border:`1px solid ${toastColors[toast.type]?.border}`, color:'var(--text-primary)', fontSize:13, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={() => setToast({ msg:'', type:'info' })} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex' }}><Close size={14}/></button>
        </div>
      )}

      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'flex-end', width:'100%' }}>
          <button className="btn-primary" onClick={handleSync} disabled={syncing} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <Refresh size={14}/> {syncing ? 'Syncing...' : 'Sync Messages'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Total',    value:stats.total,    icon:MessageSquare, color:'var(--purple-light)' },
            { label:'Unread',   value:stats.unread,   icon:Bell,          color:'#3b82f6' },
            { label:'Replied',  value:stats.replied,  icon:CheckCircle,   color:'#16a34a' },
            { label:'Positive', value:stats.positive, icon:Check,         color:'#16a34a' },
            { label:'Negative', value:stats.negative, icon:AlertCircle,   color:'#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border-subtle)' }}>
              <s.icon size={14} style={{ color:s.color }}/>
              <span style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</span>
              <span style={{ fontSize:12, color:'var(--text-faint)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="inbox-layout" style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:0, height:'calc(100vh - 320px)', minHeight:500, borderRadius:16, border:'1px solid var(--border-subtle)', overflow:'hidden', background:'var(--bg-card)' }}>

        {/* Left: Message list */}
        <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-subtle)' }}>
          <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid var(--border-subtle)', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)' }}/>
              <input placeholder="Search messages..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setFilters(f => ({ ...f, search: searchInput }))}
                style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:12, fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {[
                { key:'status',    options:['all','unread','read','replied','archived'] },
                { key:'platform',  options:['all','meta','instagram','whatsapp','twitter','linkedin'] },
                { key:'sentiment', options:['all','positive','neutral','negative'] },
              ].map(f => (
                <select key={f.key} value={filters[f.key]} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ flex:1, padding:'5px 6px', borderRadius:7, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', color:'var(--text-muted)', fontSize:11, fontFamily:'DM Sans,sans-serif' }}>
                  {f.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              ))}
            </div>
          </div>

          <div style={{ padding:'8px 14px', fontSize:11, color:'var(--text-faint)', borderBottom:'1px solid var(--border-subtle)' }}>
            {total} message{total !== 1 ? 's' : ''}
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:20 }}>
                {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height:72, borderRadius:8, marginBottom:8 }}/>)}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center' }}>
                <div style={{ color:'var(--text-faint)', marginBottom:8 }}><MessageSquare size={32}/></div>
                <div style={{ fontSize:13, color:'var(--text-faint)', marginBottom:4 }}>No messages found</div>
                <button onClick={handleSync} style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:12 }}>
                  Sync to fetch new messages
                </button>
              </div>
            ) : (
              messages.map(msg => (
                <MessageCard key={msg._id} msg={msg} selected={selected?._id === msg._id} onClick={() => handleSelect(msg)}/>
              ))
            )}
          </div>
        </div>

        {/* Right: Thread view */}
        <div className="inbox-thread-panel" style={{ display:'flex', flexDirection:'column' }}>
          {!selected ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', gap:12 }}>
              <MessageSquare size={48}/>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text-muted)' }}>Select a message to view</div>
              <div style={{ fontSize:13 }}>Click any message on the left to read and reply</div>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:`${PLATFORM_COLORS[selected.platform] || '#7c3aed'}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:PLATFORM_COLORS[selected.platform] || '#7c3aed', flexShrink:0 }}>
                  {selected.senderName?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{selected.senderName}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)', display:'flex', alignItems:'center', gap:6 }}>
                    {PlatformIcons[selected.platform] && React.createElement(PlatformIcons[selected.platform], { size:11 })}
                    <span style={{ textTransform:'capitalize' }}>{selected.platform}</span>
                    <span>·</span>
                    <span style={{ textTransform:'capitalize' }}>{selected.type}</span>
                    {selected.campaignName && <><span>·</span><span>{selected.campaignName}</span></>}
                  </div>
                </div>
                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:STATUS_STYLES[selected.status]?.bg, color:STATUS_STYLES[selected.status]?.color, fontWeight:700 }}>
                  {STATUS_STYLES[selected.status]?.label}
                </span>
                <button onClick={() => handleDelete(selected._id)} title="Delete"
                  style={{ padding:6, borderRadius:7, border:'1px solid rgba(239,68,68,0.3)', background:'transparent', color:'#ef4444', cursor:'pointer', display:'flex' }}>
                  <Trash size={14}/>
                </button>
              </div>

              {/* Message body */}
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                {selected.postMessage && (
                  <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:16, fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Original Post</div>
                    {selected.postMessage}
                  </div>
                )}

                {/* Customer message */}
                <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:`${PLATFORM_COLORS[selected.platform] || '#7c3aed'}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:PLATFORM_COLORS[selected.platform] || '#7c3aed', flexShrink:0 }}>
                    {selected.senderName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{selected.senderName}</span>
                      <span style={{ fontSize:11, color:'var(--text-faint)' }}>{new Date(selected.platformCreatedAt || selected.createdAt).toLocaleString()}</span>
                      <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:SENTIMENT_STYLES[selected.sentiment]?.bg, color:SENTIMENT_STYLES[selected.sentiment]?.color, fontWeight:600, marginLeft:'auto' }}>
                        {SENTIMENT_STYLES[selected.sentiment]?.label}
                      </span>
                    </div>
                    <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6, padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                      {selected.message}
                    </div>
                  </div>
                </div>

                {/* Public reply sent */}
                {selected.reply && (
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginBottom:12 }}>
                    <div style={{ maxWidth:'80%' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, justifyContent:'flex-end' }}>
                        <Globe size={11} style={{ color:'#16a34a' }}/>
                        <span style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>Public reply</span>
                        <span style={{ fontSize:11, color:'var(--text-faint)' }}>{new Date(selected.repliedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6, padding:'10px 14px', borderRadius:10, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)' }}>
                        {selected.reply}
                      </div>
                    </div>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>Y</div>
                  </div>
                )}

                {/* DM sent */}
                {selected.dmSent && selected.dmText && (
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <div style={{ maxWidth:'80%' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, justifyContent:'flex-end' }}>
                        <Lock size={11} style={{ color:'var(--purple-light)' }}/>
                        <span style={{ fontSize:10, color:'var(--purple-light)', fontWeight:600 }}>Private DM</span>
                        <span style={{ fontSize:11, color:'var(--text-faint)' }}>{selected.dmSentAt ? new Date(selected.dmSentAt).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6, padding:'10px 14px', borderRadius:10, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)' }}>
                        {selected.dmText}
                      </div>
                    </div>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>Y</div>
                  </div>
                )}
              </div>

              {/* Reply box */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border-subtle)', background:'var(--bg-card)' }}>

                {/* Reply mode toggle — only show for comments on DM-capable platforms */}
                {isComment && canSendDM && (
                  <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                    <button onClick={() => setReplyMode('public')}
                      style={{ flex:1, padding:'7px 12px', borderRadius:8, border:`1px solid ${replyMode==='public'?'#16a34a':'var(--border-subtle)'}`, background:replyMode==='public'?'rgba(22,163,74,0.1)':'transparent', color:replyMode==='public'?'#16a34a':'var(--text-muted)', fontSize:12, fontWeight:replyMode==='public'?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.15s' }}>
                      <Globe size={12}/> Public Reply
                      <span style={{ fontSize:10, opacity:0.7 }}>(visible to all)</span>
                    </button>
                    <button onClick={() => setReplyMode('dm')}
                      style={{ flex:1, padding:'7px 12px', borderRadius:8, border:`1px solid ${replyMode==='dm'?'var(--purple-primary)':'var(--border-subtle)'}`, background:replyMode==='dm'?'rgba(124,58,237,0.1)':'transparent', color:replyMode==='dm'?'var(--purple-light)':'var(--text-muted)', fontSize:12, fontWeight:replyMode==='dm'?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.15s' }}>
                      <Lock size={12}/> Private DM
                      <span style={{ fontSize:10, opacity:0.7 }}>(only sender sees)</span>
                    </button>
                  </div>
                )}

                {/* Mode indicator */}
                <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                  {replyMode === 'public'
                    ? <><Globe size={11} style={{ color:'#16a34a' }}/> <span style={{ color:'#16a34a', fontWeight:600 }}>Public</span> — reply will be visible to everyone on the post</>
                    : <><Lock size={11} style={{ color:'var(--purple-light)' }}/> <span style={{ color:'var(--purple-light)', fontWeight:600 }}>Private DM</span> — only {selected?.senderName} will see this</>
                  }
                </div>

                {/* AI suggest */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
                  <button onClick={handleAiReply} disabled={aiLoading}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.07)', color:'var(--purple-light)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                    <Bolt size={11}/> {aiLoading ? 'Generating...' : 'AI Suggest'}
                  </button>
                </div>

                {/* Text + send */}
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <textarea ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder={replyMode === 'dm' ? `Send a private message to ${selected?.senderName}...` : 'Write a public reply...'}
                    rows={3}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleReply(); }}
                    style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1px solid ${replyMode==='dm'?'rgba(124,58,237,0.3)':'rgba(22,163,74,0.3)'}`, background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:13, resize:'none', fontFamily:'DM Sans,sans-serif', lineHeight:1.5 }}
                  />
                  <button onClick={handleReply}
                    disabled={(replyMode==='dm' ? sendingDM : replying) || !replyText.trim()}
                    style={{ padding:'10px 16px', borderRadius:10, border:'none', background: replyMode==='dm'?'linear-gradient(135deg,#7c3aed,#6d28d9)':'linear-gradient(135deg,#16a34a,#15803d)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:6, flexShrink:0, height:44, opacity: (!replyText.trim() || replying || sendingDM) ? 0.6 : 1 }}>
                    {replyMode === 'dm' ? <Lock size={14}/> : <Globe size={14}/>}
                    {(replyMode==='dm' ? sendingDM : replying) ? 'Sending...' : replyMode==='dm' ? 'Send DM' : 'Reply'}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Ctrl+Enter to send</div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}