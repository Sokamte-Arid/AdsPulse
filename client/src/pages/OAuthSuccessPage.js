import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle } from '../components/shared/Icons';

export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [status,  setStatus]  = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const oauth   = params.get('oauth');
    const account = params.get('account');
    const errMsg  = params.get('message');

    // ── Error from server ──────────────────────────────────────────────────
    if (oauth === 'error') {
      setStatus('error');
      setMessage(errMsg || 'Connection failed. Please try again.');
      setTimeout(() => navigate('/connect'), 4000);
      return;
    }

    // ── Success — session is already in localStorage from before OAuth ─────
    // The JWT is never passed through the URL anymore (security fix).
    const token = localStorage.getItem('token');
    if (!token) {
      setStatus('error');
      setMessage('Session expired. Please log in and try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    setStatus('success');
    setMessage(account ? `Connected to ${account}` : 'Platform connected successfully!');
    setTimeout(() => navigate('/connect'), 2000);
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', flexDirection:'column', gap:16, fontFamily:'DM Sans, sans-serif' }}>

      {status === 'loading' && (
        <>
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:24, height:24, border:'3px solid rgba(255,255,255,0.3)', borderTop:'3px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
          <div style={{ color:'var(--text-muted)', fontSize:15 }}>Completing connection...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ color:'#16a34a' }}><CheckCircle size={48}/></div>
          <div style={{ color:'var(--text-primary)', fontSize:18, fontWeight:700 }}>Connected!</div>
          <div style={{ color:'var(--text-muted)', fontSize:14 }}>{message}</div>
          <div style={{ color:'var(--text-faint)', fontSize:13 }}>Redirecting to integrations...</div>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ color:'#ef4444' }}><XCircle size={48}/></div>
          <div style={{ color:'var(--text-primary)', fontSize:18, fontWeight:700 }}>Connection Failed</div>
          <div style={{ color:'var(--text-muted)', fontSize:14, textAlign:'center', maxWidth:340 }}>{message}</div>
          <div style={{ color:'var(--text-faint)', fontSize:13 }}>Redirecting back...</div>
        </>
      )}
    </div>
  );
}