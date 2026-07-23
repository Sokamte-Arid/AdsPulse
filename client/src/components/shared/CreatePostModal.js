import React, { useState, useRef } from 'react';
import api from '../../utils/api';
import { PlatformIcons, PLATFORMS } from '../../utils/platforms';
import { Bolt, Check, Close, Image, Refresh, Send, Video, Eye } from './Icons';

// ── Platform support matrix ───────────────────────────────────────────────────
const PLATFORM_SUPPORT = {
  post:  { meta:true, instagram:true, linkedin:true, twitter:true, tiktok:false, youtube:false, snapchat:false },
  reel:  { meta:true, instagram:true, tiktok:true,   youtube:true, linkedin:false, twitter:false, snapchat:false },
  story: { meta:true, instagram:true, snapchat:true, linkedin:false, twitter:false, tiktok:false, youtube:false },
};

const PLATFORM_LIMITS = {
  meta:      { caption:63206, hashtags:30 },
  instagram: { caption:2200,  hashtags:30 },
  tiktok:    { caption:2200,  hashtags:20 },
  linkedin:  { caption:3000,  hashtags:5  },
  twitter:   { caption:280,   hashtags:2  },
  youtube:   { caption:5000,  hashtags:15 },
  snapchat:  { caption:250,   hashtags:0  },
};

const POST_TYPES = [
  { id:'post',  label:'Post',        icon:'📝', desc:'Photo, video or text update' },
  { id:'reel',  label:'Reel / Short',icon:'🎬', desc:'Short vertical video content' },
  { id:'story', label:'Story',       icon:'⭕', desc:'24-hour disappearing content'  },
];

const MEDIA_SPECS = {
  post:  'Images (JPG, PNG, GIF) or videos (MP4, MOV). Recommended: 1080×1080px square.',
  reel:  'Vertical video required (9:16). MP4 or MOV. Max 90s for Meta/Instagram, 10min for TikTok.',
  story: 'Vertical format (9:16). Images or short videos. Max 15s video. 1080×1920px recommended.',
};

function StepIndicator({ current, total }) {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: i === current ? 24 : 8, height:8, borderRadius:4, background: i <= current ? 'var(--purple-primary)' : 'var(--border-subtle)', transition:'all 0.3s' }}/>
      ))}
    </div>
  );
}

function CharCounter({ text, limit }) {
  if (!limit) return null;
  const len  = text?.length || 0;
  const over = len > limit;
  const warn = len > limit * 0.85;
  return (
    <span style={{ fontSize:11, fontWeight:700, color: over?'#ef4444':warn?'#f59e0b':'var(--text-faint)' }}>
      {len}/{limit}
    </span>
  );
}

export default function CreatePostModal({ onClose, onCreated, initialType = 'post' }) {
  const [step,          setStep]         = useState(initialType !== 'post' || true ? 0 : 0); // 0=type, 1=platforms, 2=media, 3=content, 4=schedule
  const [postType,      setPostType]     = useState(initialType);
  const [selectedPlats, setSelectedPlats]= useState([]);
  const [mediaFiles,    setMediaFiles]   = useState([]);
  const [previews,      setPreviews]     = useState([]);
  const [captions,      setCaptions]     = useState({}); // per platform
  const [title,         setTitle]        = useState(''); // YouTube
  const [description,   setDescription] = useState(''); // AI prompt
  const [hashtags,      setHashtags]     = useState({}); // per platform
  const [scheduleMode,  setScheduleMode] = useState('now'); // now | schedule | draft
  const [scheduledAt,   setScheduledAt]  = useState('');
  const [aiLoading,     setAiLoading]    = useState(false);
  const [aiSuggestions, setAiSuggestions]= useState([]);
  const [publishing,    setPublishing]   = useState(false);
  const [uploading,     setUploading]    = useState(false);
  const [error,         setError]        = useState('');
  const [activePlatTab, setActivePlatTab]= useState('');
  const fileRef = useRef();

  const supportedPlatforms = PLATFORMS.filter(p => PLATFORM_SUPPORT[postType]?.[p.id]);

  const togglePlatform = (id) => {
    setSelectedPlats(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    if (!activePlatTab) setActivePlatTab(id);
  };

  const handleFiles = (files) => {
    const newFiles  = Array.from(files);
    const newPrevs  = newFiles.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image', name: f.name }));
    setMediaFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPrevs]);
  };

  const removeMedia = (idx) => {
    setMediaFiles(prev => prev.filter((_,i) => i !== idx));
    setPreviews(prev => prev.filter((_,i) => i !== idx));
  };

  const handleAiCaption = async () => {
    if (!description.trim() && !title.trim()) {
      setError('Describe your post to generate AI captions.'); return;
    }
    setAiLoading(true); setError('');
    try {
      const res = await api.post('/insights/caption', {
        description: description || title,
        platforms:   selectedPlats,
        postType,
        tone: 'engaging',
      });
      // Populate captions for each platform
      const newCaptions = { ...captions };
      const newHashtags = { ...hashtags };
      selectedPlats.forEach(p => {
        if (res.data.captions?.[p]) {
          newCaptions[p] = res.data.captions[p].text || '';
          newHashtags[p] = (res.data.captions[p].hashtags || []).join(' ');
        }
      });
      setCaptions(newCaptions);
      setHashtags(newHashtags);
      setAiSuggestions(res.data.suggestions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'AI caption failed');
    } finally { setAiLoading(false); }
  };

  const handlePublish = async () => {
    if (selectedPlats.length === 0) { setError('Select at least one platform.'); return; }
    setPublishing(true); setError('');
    try {
      // Upload media to Cloudinary first
      let uploadedMedia = [];
      if (mediaFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        mediaFiles.forEach(f => formData.append('files', f));
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedMedia = uploadRes.data.files || [];
        setUploading(false);
      }

      // Use first platform's caption as default, or per-platform
      const primaryCaption = captions[selectedPlats[0]] || description || '';
      const primaryHashtags = hashtags[selectedPlats[0]]?.split(/\s+/).filter(h => h.startsWith('#')).map(h => h.slice(1)) || [];

      const payload = {
        postType,
        caption:     primaryCaption,
        title:       title || undefined,
        hashtags:    primaryHashtags,
        mediaUrls:   uploadedMedia,
        status:      scheduleMode === 'draft' ? 'draft' : scheduleMode === 'schedule' ? 'scheduled' : 'draft',
        scheduledAt: scheduleMode === 'schedule' ? scheduledAt : undefined,
        platforms:   selectedPlats.map(p => ({
          platform: p,
          caption:  captions[p] || primaryCaption,
          hashtags: hashtags[p]?.split(/\s+/).filter(h => h.startsWith('#')).map(h => h.slice(1)) || primaryHashtags,
        })),
      };

      const res = await api.post('/posts', payload);

      // Publish immediately if selected
      if (scheduleMode === 'now') {
        await api.post(`/posts/${res.data._id}/publish`).catch(() => {});
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally { setPublishing(false); setUploading(false); }
  };

  const canProceed = () => {
    if (step === 1 && selectedPlats.length === 0) return false;
    return true;
  };

  const stepTitles = ['Choose Type', 'Choose Platforms', 'Add Media', 'Write Content', 'Publish'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
      <div className="glass-card" style={{ width:'100%', maxWidth:680, maxHeight:'94vh', display:'flex', flexDirection:'column', borderRadius:20, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Create {postType.charAt(0).toUpperCase()+postType.slice(1)}</div>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:2 }}>{stepTitles[step]}</div>
          </div>
          <StepIndicator current={step} total={5}/>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', padding:4, marginLeft:8 }}>
            <Close size={20}/>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {/* STEP 0 — Choose Type */}
          {step === 0 && (
            <div>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>What type of content do you want to create?</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {POST_TYPES.map(type => (
                  <button key={type.id} onClick={() => { setPostType(type.id); setSelectedPlats([]); }}
                    style={{ padding:'18px 20px', borderRadius:12, border:`2px solid ${postType===type.id?'var(--purple-primary)':'var(--border-subtle)'}`, background:postType===type.id?'rgba(124,58,237,0.1)':'var(--bg-elevated)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14, transition:'all 0.15s', fontFamily:'DM Sans,sans-serif' }}>
                    <span style={{ fontSize:28 }}>{type.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{type.label}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{type.desc}</div>
                    </div>
                    {postType === type.id && <Check size={18} style={{ color:'var(--purple-light)' }}/>}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:16, padding:'12px 14px', borderRadius:10, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', fontSize:12, color:'var(--text-faint)' }}>
                📐 {MEDIA_SPECS[postType]}
              </div>
            </div>
          )}

          {/* STEP 1 — Choose Platforms */}
          {step === 1 && (
            <div>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                Select where you want to publish your {postType}:
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {supportedPlatforms.map(pl => {
                  const Icon     = PlatformIcons[pl.id];
                  const selected = selectedPlats.includes(pl.id);
                  const limits   = PLATFORM_LIMITS[pl.id];
                  return (
                    <button key={pl.id} onClick={() => togglePlatform(pl.id)}
                      style={{ padding:'14px 18px', borderRadius:12, border:`2px solid ${selected?pl.color:'var(--border-subtle)'}`, background:selected?`${pl.color}12`:'var(--bg-elevated)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, transition:'all 0.15s', fontFamily:'DM Sans,sans-serif' }}>
                      {Icon && <Icon size={24}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{pl.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-faint)' }}>
                          Caption: {limits?.caption?.toLocaleString()} chars
                          {limits?.hashtags > 0 ? ` · Up to ${limits.hashtags} hashtags` : ' · No hashtags'}
                        </div>
                      </div>
                      {selected && <Check size={18} style={{ color:pl.color }}/>}
                    </button>
                  );
                })}
              </div>
              {selectedPlats.length > 0 && (
                <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', fontSize:12, color:'#16a34a' }}>
                  ✓ {selectedPlats.length} platform{selectedPlats.length>1?'s':''} selected
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Add Media */}
          {step === 2 && (
            <div>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                {postType === 'post' ? 'Add images or videos (optional for text-only posts)' : `Upload your ${postType} video/image`}
              </p>

              {/* Upload area */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--purple-primary)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; }}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); e.currentTarget.style.borderColor='var(--border-subtle)'; }}
                style={{ border:'2px dashed var(--border-subtle)', borderRadius:12, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'border 0.15s', marginBottom:16 }}>
                <div style={{ color:'var(--text-faint)', marginBottom:8 }}>
                  {postType === 'post' ? <Image size={32}/> : <Video size={32}/>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>
                  Click to upload or drag & drop
                </div>
                <div style={{ fontSize:12, color:'var(--text-faint)' }}>
                  {postType === 'post' ? 'JPG, PNG, GIF, MP4, MOV' : 'MP4, MOV (vertical 9:16 recommended)'}
                </div>
                <input ref={fileRef} type="file"
                  accept={postType === 'post' ? 'image/*,video/*' : 'video/*'}
                  multiple={postType === 'post'}
                  style={{ display:'none' }}
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              {/* Previews */}
              {previews.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {previews.map((prev, i) => (
                    <div key={i} style={{ position:'relative', borderRadius:10, overflow:'hidden', width:120, height:120, background:'var(--bg-elevated)' }}>
                      {prev.type === 'video'
                        ? <video src={prev.url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        : <img src={prev.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      }
                      <button onClick={() => removeMedia(i)}
                        style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Close size={12}/>
                      </button>
                      <div style={{ position:'absolute', bottom:4, left:4, fontSize:9, background:'rgba(0,0,0,0.6)', color:'white', padding:'2px 5px', borderRadius:4 }}>
                        {prev.type === 'video' ? '🎬' : '🖼'} {prev.name?.slice(0,12)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {postType !== 'post' && previews.length === 0 && (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#f59e0b' }}>
                  ⚠️ {postType === 'reel' ? 'Reels require a video file.' : 'Stories require an image or short video.'}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Write Content */}
          {step === 3 && (
            <div>
              {/* AI Caption Generator */}
              <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Bolt size={14} style={{ color:'var(--purple-light)' }}/> AI Caption Generator
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your post... (e.g. 'New summer collection launch featuring our beach dresses')"
                  rows={2}
                  style={{ width:'100%', border:'1px solid rgba(124,58,237,0.3)', borderRadius:8, background:'var(--bg-card)', color:'var(--text-primary)', fontSize:13, padding:'8px 12px', resize:'none', fontFamily:'DM Sans,sans-serif', lineHeight:1.5, boxSizing:'border-box', marginBottom:8 }}
                />
                <button onClick={handleAiCaption} disabled={aiLoading}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  {aiLoading ? <><Refresh size={12}/> Generating...</> : <><Bolt size={12}/> Generate Captions</>}
                </button>
                {aiSuggestions.length > 0 && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
                    {aiSuggestions.map((s,i) => (
                      <div key={i} style={{ fontSize:11, color:'var(--text-faint)', display:'flex', gap:6 }}>
                        <span style={{ color:'var(--purple-light)', fontWeight:700 }}>{i+1}.</span> {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Per-platform caption tabs */}
              {selectedPlats.length > 0 && (
                <div>
                  {/* Platform tabs */}
                  <div style={{ display:'flex', gap:4, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
                    {selectedPlats.map(pid => {
                      const pl   = PLATFORMS.find(p => p.id === pid);
                      const Icon = PlatformIcons[pid];
                      const active = activePlatTab === pid || (!activePlatTab && pid === selectedPlats[0]);
                      return (
                        <button key={pid} onClick={() => setActivePlatTab(pid)}
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:`1px solid ${active?pl?.color||'var(--purple-primary)':'var(--border-subtle)'}`, background:active?`${pl?.color||'#7c3aed'}12`:'transparent', color:active?pl?.color||'var(--purple-light)':'var(--text-muted)', fontSize:12, fontWeight:active?700:500, cursor:'pointer', fontFamily:'DM Sans,sans-serif', flexShrink:0, transition:'all 0.15s' }}>
                          {Icon && <Icon size={14}/>} {pl?.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active platform content editor */}
                  {selectedPlats.map(pid => {
                    if (pid !== (activePlatTab || selectedPlats[0])) return null;
                    const limits = PLATFORM_LIMITS[pid] || {};
                    const isYouTube = pid === 'youtube';
                    return (
                      <div key={pid}>
                        {isYouTube && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <label className="form-label">Title *</label>
                              <CharCounter text={title} limit={100}/>
                            </div>
                            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                              placeholder="Video title (max 100 chars)" style={{ fontSize:13 }}/>
                          </div>
                        )}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <label className="form-label">{isYouTube ? 'Description' : 'Caption'}</label>
                            <CharCounter text={captions[pid]} limit={limits.caption}/>
                          </div>
                          <textarea className="form-input"
                            value={captions[pid] || ''}
                            onChange={e => setCaptions(c => ({ ...c, [pid]: e.target.value }))}
                            placeholder={`Write your ${isYouTube ? 'description' : 'caption'} for ${PLATFORMS.find(p=>p.id===pid)?.name}...`}
                            rows={5}
                            style={{ resize:'vertical', lineHeight:1.6, fontSize:13 }}
                          />
                        </div>
                        {limits.hashtags > 0 && (
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                              <label className="form-label">Hashtags</label>
                              <span style={{ fontSize:11, color:'var(--text-faint)' }}>Max {limits.hashtags}</span>
                            </div>
                            <input className="form-input"
                              value={hashtags[pid] || ''}
                              onChange={e => setHashtags(h => ({ ...h, [pid]: e.target.value }))}
                              placeholder="#hashtag1 #hashtag2 #hashtag3"
                              style={{ fontSize:13 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Schedule */}
          {step === 4 && (
            <div>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>When do you want to publish?</p>

              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {[
                  { id:'now',      emoji:'🚀', label:'Publish Now',       desc:'Post immediately to all selected platforms' },
                  { id:'schedule', emoji:'📅', label:'Schedule for Later', desc:'Choose a specific date and time' },
                  { id:'draft',    emoji:'📝', label:'Save as Draft',      desc:'Save without publishing' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setScheduleMode(opt.id)}
                    style={{ padding:'14px 18px', borderRadius:12, border:`2px solid ${scheduleMode===opt.id?'var(--purple-primary)':'var(--border-subtle)'}`, background:scheduleMode===opt.id?'rgba(124,58,237,0.1)':'var(--bg-elevated)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, transition:'all 0.15s', fontFamily:'DM Sans,sans-serif' }}>
                    <span style={{ fontSize:22 }}>{opt.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                    {scheduleMode === opt.id && <Check size={18} style={{ color:'var(--purple-light)' }}/>}
                  </button>
                ))}
              </div>

              {scheduleMode === 'schedule' && (
                <div>
                  <label className="form-label">Schedule Date & Time</label>
                  <input className="form-input" type="datetime-local" value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0,16)}
                    style={{ fontSize:13 }}/>
                </div>
              )}

              {/* Summary */}
              <div style={{ marginTop:20, padding:'14px 16px', borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Summary</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'var(--text-muted)' }}>
                  <div>📝 Type: <strong style={{ color:'var(--text-primary)' }}>{postType.charAt(0).toUpperCase()+postType.slice(1)}</strong></div>
                  <div>📲 Platforms: <strong style={{ color:'var(--text-primary)' }}>{selectedPlats.map(p => PLATFORMS.find(pl=>pl.id===p)?.name).join(', ')}</strong></div>
                  <div>🖼 Media: <strong style={{ color:'var(--text-primary)' }}>{previews.length > 0 ? `${previews.length} file${previews.length>1?'s':''}` : 'None'}</strong></div>
                  <div>⏰ Publish: <strong style={{ color:'var(--text-primary)' }}>{scheduleMode==='now'?'Immediately':scheduleMode==='draft'?'Save as draft':scheduledAt||'Not set'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => step > 0 ? setStep(s => s-1) : onClose()}
            className="btn-secondary" style={{ fontSize:13 }}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {step < 4 ? (
            <button onClick={() => { if (canProceed()) { setError(''); setStep(s => s+1); } else setError('Please make a selection before continuing.'); }}
              className="btn-primary" style={{ fontSize:13 }}>
              Continue →
            </button>
          ) : (
            <button onClick={handlePublish} disabled={publishing || uploading}
              className="btn-primary" style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
              {uploading ? <><Refresh size={14}/> Uploading...</>
               : publishing ? <><Refresh size={14}/> Publishing...</>
               : scheduleMode === 'now' ? <><Send size={14}/> Publish Now</>
               : scheduleMode === 'draft' ? <><Eye size={14}/> Save Draft</>
               : <><Send size={14}/> Schedule Post</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}