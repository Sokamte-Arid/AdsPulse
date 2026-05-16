import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AcceptInvitePage() {
  const [searchParams]  = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate        = useNavigate();
  const token           = searchParams.get('token');

  const [status,  setStatus]  = useState('loading'); // loading | ready | success | error | wrong-email
  const [orgInfo, setOrgInfo] = useState(null);
  const [error,   setError]   = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Invalid invitation link — no token found.'); return; }
    if (authLoading) return;
    if (!user) {
      // Not logged in — redirect to login, then come back
      navigate(`/login?redirect=/accept-invite?token=${token}`, { replace: true });
      return;
    }
    setStatus('ready');
  }, [token, user, authLoading, navigate]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await api.post('/organization/accept-invite', { token });
      setOrgInfo({ name: res.data.organization, role: res.data.role });
      setStatus('success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('sent to')) {
        setStatus('wrong-email');
        setError(msg);
      } else {
        setStatus('error');
        setError(msg);
      }
    } finally { setAccepting(false); }
  };

  // Loading
  if (authLoading || status === 'loading') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
          <div style={{ color:'var(--text-muted)', fontSize:14 }}>Validating invitation...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg-page)', padding:20, position:'relative', overflow:'hidden'
    }}>
      {/* Background orbs */}
      {[
        { top:'10%', left:'15%', size:350, color:'rgba(124,58,237,0.1)' },
        { bottom:'10%', right:'10%', size:280, color:'rgba(168,85,247,0.07)' },
      ].map((o, i) => (
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', width:o.size, height:o.size,
          background:`radial-gradient(circle,${o.color},transparent 70%)`,
          top:o.top, left:o.left, right:o.right, bottom:o.bottom,
          filter:'blur(40px)', pointerEvents:'none'
        }}/>
      ))}

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, margin:'0 auto 12px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⚡</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>AdsPulse</div>
        </div>

        <div className="glass-card" style={{ padding:36, textAlign:'center' }}>

          {/* ── Ready to accept ── */}
          {status === 'ready' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                You've Been Invited!
              </h2>
              <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                You've been invited to join a team on AdsPulse.
                Click below to accept and get started.
              </p>

              {user && (
                <div style={{ padding:'12px 16px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', marginBottom:20, fontSize:13 }}>
                  <div style={{ color:'var(--text-muted)', marginBottom:4 }}>Accepting as:</div>
                  <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-faint)' }}>{user.email}</div>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleAccept}
                disabled={accepting}
                style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:15 }}
              >
                {accepting ? '⏳ Accepting...' : '✓ Accept Invitation'}
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                style={{ marginTop:12, background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:13 }}
              >
                Skip for now
              </button>
            </>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Welcome to the Team!
              </h2>
              {orgInfo && (
                <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                  You've joined <strong style={{ color:'var(--text-primary)' }}>{orgInfo.name}</strong> as{' '}
                  <strong style={{ color:'var(--purple-light)', textTransform:'capitalize' }}>{orgInfo.role}</strong>.
                </p>
              )}
              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
                style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:15 }}
              >
                Go to Dashboard →
              </button>
            </>
          )}

          {/* ── Wrong email ── */}
          {status === 'wrong-email' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>📧</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Wrong Account
              </h2>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:20, fontSize:13, color:'#ef4444', lineHeight:1.6 }}>
                {error}
              </div>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px', lineHeight:1.6 }}>
                Please log out and sign in with the email address that received this invitation.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ flex:1, justifyContent:'center' }}>
                  Go to Dashboard
                </button>
                <button className="btn-primary" onClick={() => { localStorage.removeItem('token'); navigate(`/login?redirect=/accept-invite?token=${token}`); }} style={{ flex:1, justifyContent:'center' }}>
                  Sign In
                </button>
              </div>
            </>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>❌</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Invitation Invalid
              </h2>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:20, fontSize:13, color:'#ef4444', lineHeight:1.6 }}>
                {error || 'This invitation link is invalid or has expired.'}
              </div>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px', lineHeight:1.6 }}>
                Ask the team owner to send you a new invitation.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ width:'100%', justifyContent:'center' }}>
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
