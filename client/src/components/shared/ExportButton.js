import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from './Icons';

export default function ExportButton({ endpoint, filename, label = 'Export', params = {} }) {
  const [open,        setOpen]        = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format) => {
    setOpen(false);
    setDownloading(true);
    try {
      const token  = localStorage.getItem('token');
      const query  = new URLSearchParams({ ...params, format }).toString();
      const res    = await fetch(`http://localhost:5000/api/export/${endpoint}?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xls' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={downloading}
        className="btn-secondary"
        style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
        <Download size={14}/>
        {downloading ? 'Exporting...' : label}
        <ChevronDown size={12}/>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:200,
          background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
          borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
          minWidth:160, overflow:'hidden',
        }}>
          <div style={{ padding:'6px 0' }}>
            <div style={{ padding:'4px 14px 6px', fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Export as
            </div>
            {[
              { format:'csv',  label:'CSV (.csv)',   desc:'Open in Excel, Google Sheets' },
              { format:'xlsx', label:'Excel (.xls)', desc:'Formatted spreadsheet'        },
            ].map(opt => (
              <button key={opt.format} onClick={() => handleExport(opt.format)}
                style={{ width:'100%', padding:'9px 14px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'block', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{opt.label}</div>
                <div style={{ fontSize:11, color:'var(--text-faint)' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}