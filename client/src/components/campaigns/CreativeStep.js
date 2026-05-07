import React, { useState, useRef, useCallback } from 'react';

const CTA_OPTIONS = ['Learn More','Shop Now','Sign Up','Download','Get Quote','Contact Us','Book Now','Watch More','Apply Now','Subscribe'];
const DESTINATION_TYPES = [
  { id:'website',      label:'Website',      icon:'🌐', desc:'Redirect to your website' },
  { id:'messenger',    label:'Messenger',    icon:'💬', desc:'Open Facebook Messenger' },
  { id:'whatsapp',     label:'WhatsApp',     icon:'📱', desc:'Start WhatsApp chat' },
  { id:'instagram_dm', label:'Instagram DM', icon:'📸', desc:'Open Instagram DM' },
  { id:'telegram',     label:'Telegram',     icon:'✈️', desc:'Open Telegram chat' },
];

function UploadZone({ accept, onFile, preview, mediaType }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onFile(file, url);
  };

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = e => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div
      className={`upload-zone ${dragging ? 'drag-over' : ''}`}
      onClick={() => ref.current?.click()}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
    >
      <input ref={ref} type="file" accept={accept} style={{ display:'none' }}
        onChange={e => handleFile(e.target.files[0])} />
      {preview ? (
        mediaType === 'video' ? (
          <video src={preview} controls style={{ maxHeight:200, borderRadius:8, maxWidth:'100%' }} />
        ) : (
          <img src={preview} alt="preview" style={{ maxHeight:200, borderRadius:8, maxWidth:'100%', objectFit:'cover' }} />
        )
      ) : (
        <>
          <div style={{ fontSize:40, marginBottom:10 }}>{mediaType === 'video' ? '🎬' : '🖼️'}</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--purple-light)', marginBottom:4 }}>
            Click or drag & drop
          </div>
          <div style={{ fontSize:12, color:'var(--text-faint)' }}>
            {mediaType === 'video' ? 'MP4, MOV, AVI — max 500MB' : 'JPG, PNG, GIF, WebP — max 30MB'}
          </div>
        </>
      )}
    </div>
  );
}

function CarouselCard({ item, index, onUpdate, onRemove, canRemove }) {
  const accept = item.mediaType === 'video' ? 'video/*' : 'image/*';
  return (
    <div style={{ padding:16, borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', minWidth:240, maxWidth:260, flexShrink:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(124,58,237,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--purple-light)' }}>{index+1}</div>
        {canRemove && <button onClick={()=>onRemove(index)} style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,color:'#ef4444',cursor:'pointer',padding:'2px 8px',fontSize:11 }}>✕</button>}
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {['image','video'].map(t => (
          <button key={t} onClick={()=>onUpdate(index,'mediaType',t)} style={{ flex:1,padding:'5px 0',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',background:item.mediaType===t?'rgba(124,58,237,0.2)':'transparent',border:`1px solid ${item.mediaType===t?'rgba(124,58,237,0.5)':'var(--border-subtle)'}`,color:item.mediaType===t?'var(--purple-light)':'var(--text-faint)' }}>
            {t==='image'?'🖼️ Image':'🎬 Video'}
          </button>
        ))}
      </div>
      <UploadZone
        accept={accept}
        preview={item.mediaUrl}
        mediaType={item.mediaType}
        onFile={(file, url) => { onUpdate(index,'mediaUrl',url); onUpdate(index,'fileName',file.name); }}
      />
      <input className="form-input" placeholder="Headline" value={item.headline||''} onChange={e=>onUpdate(index,'headline',e.target.value)} style={{ marginTop:8,fontSize:12 }}/>
      <input className="form-input" placeholder="Link URL" value={item.link||''} onChange={e=>onUpdate(index,'link',e.target.value)} style={{ marginTop:6,fontSize:12 }}/>
    </div>
  );
}

export default function CreativeStep({ data, onChange }) {
  const creative = data.creative || { type:'single_image', headline:'', description:'', callToAction:'Learn More', destinationType:'website', destinationUrl:'', items:[{ mediaType:'image', mediaUrl:'', headline:'', link:'' }] };

  const update = (field, value) => onChange('creative', { ...creative, [field]:value });

  const updateItem = (idx, field, value) => {
    const items = creative.items.map((item,i) => i===idx ? {...item,[field]:value} : item);
    update('items', items);
  };

  const addCard = () => { if(creative.items.length>=10) return; update('items', [...creative.items,{mediaType:'image',mediaUrl:'',headline:'',link:''}]); };
  const removeCard = idx => update('items', creative.items.filter((_,i)=>i!==idx));

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:'clamp(18px,3vw,24px)', fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px' }}>Create your ad</h2>
        <p style={{ color:'var(--text-muted)', fontSize:14, margin:0 }}>Choose format, upload media and set destination.</p>
      </div>

      {/* Format */}
      <div style={{ marginBottom:24 }}>
        <label className="form-label">Ad Format</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[{id:'single_image',icon:'🖼️',label:'Single Image'},{id:'single_video',icon:'🎬',label:'Single Video'},{id:'carousel',icon:'🎠',label:'Carousel'}].map(fmt => (
            <div key={fmt.id} onClick={()=>update('type',fmt.id)} style={{ padding:'16px 12px',borderRadius:12,cursor:'pointer',textAlign:'center',border:`2px solid ${creative.type===fmt.id?'var(--purple-primary)':'var(--border-subtle)'}`,background:creative.type===fmt.id?'var(--bg-hover)':'var(--bg-elevated)',transition:'all 0.2s' }}>
              <div style={{ fontSize:26, marginBottom:6 }}>{fmt.icon}</div>
              <div style={{ fontSize:13,fontWeight:700,color:creative.type===fmt.id?'var(--purple-light)':'var(--text-primary)' }}>{fmt.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Destination */}
      <div style={{ marginBottom:20 }}>
        <label className="form-label">Link Destination</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:12 }}>
          {DESTINATION_TYPES.map(dest => (
            <div key={dest.id} onClick={()=>update('destinationType',dest.id)} style={{ padding:'12px 10px',borderRadius:10,cursor:'pointer',border:`2px solid ${creative.destinationType===dest.id?'var(--purple-primary)':'var(--border-subtle)'}`,background:creative.destinationType===dest.id?'var(--bg-hover)':'var(--bg-elevated)',transition:'all 0.2s' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{dest.icon}</div>
              <div style={{ fontSize:11,fontWeight:700,color:creative.destinationType===dest.id?'var(--purple-light)':'var(--text-primary)' }}>{dest.label}</div>
            </div>
          ))}
        </div>
        <input className="form-input" placeholder={creative.destinationType==='website'?'https://yourwebsite.com':creative.destinationType==='whatsapp'?'+1234567890':'Destination URL or contact'} value={creative.destinationUrl||''} onChange={e=>update('destinationUrl',e.target.value)}/>
      </div>

      {/* Headline + CTA */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <div>
          <label className="form-label">Headline</label>
          <input className="form-input" placeholder="Your headline..." value={creative.headline||''} onChange={e=>update('headline',e.target.value)}/>
        </div>
        <div>
          <label className="form-label">Call to Action</label>
          <select className="form-input" value={creative.callToAction||'Learn More'} onChange={e=>update('callToAction',e.target.value)}>
            {CTA_OPTIONS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={3} placeholder="Ad description..." value={creative.description||''} onChange={e=>update('description',e.target.value)} style={{ resize:'vertical' }}/>
        </div>
      </div>

      {/* Media / Carousel */}
      {creative.type==='carousel' ? (
        <div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <label className="form-label" style={{ margin:0 }}>Carousel Cards ({creative.items?.length||0}/10)</label>
            {(creative.items?.length||0)<10 && <button className="btn-secondary" onClick={addCard} style={{ fontSize:12,padding:'6px 14px' }}>+ Add Card</button>}
          </div>
          <div style={{ display:'flex',gap:14,overflowX:'auto',paddingBottom:10 }}>
            {(creative.items||[]).map((item,idx)=>(
              <CarouselCard key={idx} item={item} index={idx} onUpdate={updateItem} onRemove={removeCard} canRemove={(creative.items?.length||0)>2}/>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="form-label">{creative.type==='single_video'?'Video':'Image'}</label>
          <UploadZone
            accept={creative.type==='single_video'?'video/*':'image/*'}
            mediaType={creative.type==='single_video'?'video':'image'}
            preview={creative.items?.[0]?.mediaUrl}
            onFile={(file,url)=>{
              const items=[{...( creative.items?.[0]||{}),mediaUrl:url,mediaType:creative.type==='single_video'?'video':'image',fileName:file.name}];
              update('items',items);
            }}
          />
          {creative.items?.[0]?.fileName && (
            <div style={{ marginTop:8,fontSize:12,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6 }}>
              <span>📎</span> {creative.items[0].fileName}
              <button onClick={()=>update('items',[{mediaType:'image',mediaUrl:'',headline:'',link:''}])} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:11 }}>Remove</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
