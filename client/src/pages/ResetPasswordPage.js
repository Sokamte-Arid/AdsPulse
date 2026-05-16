import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { loginWithToken } = useAuth();
  const token           = searchParams.get('token');

  const [status,      setStatus]   = useState('verifying'); // verifying | ready | success | error
  const [userInfo,    setUserInfo] = useState(null);
  const [password,    setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]  = useState(false);
  const [error,       setError]    = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authAPI.verifyResetToken(token)
      .then(res => { setUserInfo(res.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [token]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label:'Weak',   color:'#ef4444', width:'25%' };
    if (score <= 2) return { label:'Fair',   color:'#d97706', width:'50%' };
    if (score <= 3) return { label:'Good',   color:'#3b82f6', width:'75%' };
    return              { label:'Strong', color:'#16a34a', width:'100%' };
  };

  const strength = getPasswordStrength(password);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPass) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true); setError('');
    try {
      const res = await authAPI.resetPassword(token, password);
      // Auto-login with the returned token
      if (res.data.token && loginWithToken) {
        loginWithToken(res.data.token, res.data.user);
      }
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', position:'relative', overflow:'hidden', padding:20 }}>
      {/* Background orbs */}
      {[
        { top:'10%', left:'15%', size:360, color:'rgba(124,58,237,0.1)' },
        { bottom:'10%', right:'10%', size:280, color:'rgba(168,85,247,0.07)' },
      ].map((o, i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.size, height:o.size, background:`radial-gradient(circle,${o.color},transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:'blur(40px)', pointerEvents:'none' }}/>
      ))}

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, margin:'0 auto 12px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⚡</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>AdsPulse</div>
        </div>

        <div className="glass-card" style={{ padding:36 }}>

          {/* Verifying */}
          {status === 'verifying' && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
              <div style={{ color:'var(--text-muted)', fontSize:14 }}>Verifying reset link...</div>
            </div>
          )}

          {/* Error — invalid/expired token */}
          {status === 'error' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>❌</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>Link Invalid or Expired</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                This password reset link is invalid or has expired (links expire after 1 hour). Please request a new one.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0' }}>
                ← Back to Login
              </button>
            </div>
          )}

          {/* Ready — show form */}
          {status === 'ready' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🔐</div>
                <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px' }}>
                  Set New Password
                </h2>
                {userInfo && (
                  <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
                    For <strong style={{ color:'var(--text-primary)' }}>{userInfo.email}</strong>
                  </p>
                )}
              </div>

              <form onSubmit={handleReset}>
                {/* New password */}
                <div style={{ marginBottom:8 }}>
                  <label className="form-label">New Password</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-input" type={showPass?'text':'password'} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required minLength={6} style={{ paddingRight:44 }}/>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                      <EyeIcon open={showPass}/>
                    </button>
                  </div>
                  {strength && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:3, borderRadius:2, background:'var(--bg-elevated)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:strength.width, background:strength.color, borderRadius:2, transition:'width 0.3s' }}/>
                      </div>
                      <div style={{ fontSize:11, color:strength.color, fontWeight:600, marginTop:3 }}>{strength.label} password</div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom:20 }}>
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-input" type={showConfirm?'text':'password'} placeholder="••••••••"
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      required style={{ paddingRight:44, borderColor: confirmPass && confirmPass!==password ? '#ef4444' : undefined }}/>
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                      <EyeIcon open={showConfirm}/>
                    </button>
                  </div>
                  {confirmPass && confirmPass!==password && (
                    <div style={{ fontSize:11, color:'#ef4444', marginTop:4, fontWeight:600 }}>Passwords do not match</div>
                  )}
                </div>

                {error && (
                  <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" className="btn-primary"
                  disabled={loading || password!==confirmPass || password.length<6}
                  style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                  {loading ? '⏳ Updating...' : '✓ Set New Password'}
                </button>
              </form>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>Password Updated!</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Your password has been reset successfully. You are now logged in.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
