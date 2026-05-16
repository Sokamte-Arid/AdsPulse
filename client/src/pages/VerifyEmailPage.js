import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { loginWithToken } = useAuth();
  const token           = searchParams.get('token');

  const [status,  setStatus]  = useState('verifying'); // verifying | success | error | already
  const [error,   setError]   = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending,   setResending]   = useState(false);
  const [resent,      setResent]      = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('No verification token found in the link.'); return; }

    authAPI.verifyEmail(token)
      .then(res => {
        if (res.data.alreadyVerified) { setStatus('already'); return; }
        // Auto-login
        if (res.data.token && loginWithToken) {
          loginWithToken(res.data.token, res.data.user);
        }
        setStatus('success');
      })
      .catch(err => {
        setStatus('error');
        setError(err.response?.data?.message || 'Verification failed. The link may be expired.');
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      await authAPI.resendVerification(resendEmail.trim());
      setResent(true);
    } catch (err) {
      // Always show success to prevent enumeration
      setResent(true);
    } finally { setResending(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', padding:20, position:'relative', overflow:'hidden' }}>
      {/* Background orbs */}
      {[
        { top:'8%',   left:'12%',  size:380, color:'rgba(124,58,237,0.1)' },
        { bottom:'8%',right:'10%', size:280, color:'rgba(168,85,247,0.07)' },
      ].map((o, i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.size, height:o.size, background:`radial-gradient(circle,${o.color},transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:'blur(40px)', pointerEvents:'none' }}/>
      ))}

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, margin:'0 auto 12px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⚡</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>AdsPulse</div>
        </div>

        <div className="glass-card" style={{ padding:36, textAlign:'center' }}>

          {/* Verifying */}
          {status === 'verifying' && (
            <>
              <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>Verifying your email...</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Please wait a moment.</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Email Verified!
              </h2>
              <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Your email has been verified successfully. You are now logged in and ready to use AdsPulse.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')}
                style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:15 }}>
                Go to Dashboard →
              </button>
            </>
          )}

          {/* Already verified */}
          {status === 'already' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Already Verified
              </h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Your email address has already been verified. You can log in normally.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}
                style={{ width:'100%', justifyContent:'center', padding:'13px 0' }}>
                → Log In
              </button>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>❌</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Verification Failed
              </h2>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', marginBottom:20, fontSize:13, color:'#ef4444', lineHeight:1.6 }}>
                {error}
              </div>

              {!resent ? (
                <>
                  <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 16px', lineHeight:1.6 }}>
                    Enter your email to get a new verification link:
                  </p>
                  <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    <input className="form-input" type="email" placeholder="your@email.com"
                      value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleResend()}
                      style={{ flex:1 }}/>
                    <button className="btn-primary" onClick={handleResend}
                      disabled={resending || !resendEmail.trim()} style={{ flexShrink:0 }}>
                      {resending ? '⏳' : 'Resend'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.25)', marginBottom:16, fontSize:13, color:'#16a34a' }}>
                  ✅ If that email has a pending verification, a new link has been sent. Check your inbox or server terminal.
                </div>
              )}

              <button className="btn-secondary" onClick={() => navigate('/login')}
                style={{ width:'100%', justifyContent:'center' }}>
                ← Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
