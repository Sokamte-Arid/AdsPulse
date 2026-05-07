import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

export default function LoginPage() {
  const { login, register, verify2FA, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]       = useState('login');
  const [step, setStep]       = useState('credentials');
  const [form, setForm]       = useState({ name:'', email:'', password:'' });
  const [code, setCode]       = useState(['','','','','','']);
  const [tempToken, setTempToken] = useState('');
  const [twoFAMethod, setTwoFAMethod] = useState('totp');
  const [twoFAMsg, setTwoFAMsg]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const codeRefs = useRef([]);

  useEffect(() => { if (user) navigate('/dashboard', { replace:true }); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const result = await login(form.email.trim(), form.password);
        if (result?.requires2FA) {
          setTempToken(result.tempToken);
          setTwoFAMethod(result.method);
          setTwoFAMsg(result.message || '');
          setStep('2fa');
        }
      } else {
        await register(form.name.trim(), form.email.trim(), form.password);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleCodeInput = (idx, val) => {
    const v = val.replace(/\D/, '');
    const newCode = [...code];
    newCode[idx] = v;
    setCode(newCode);
    if (v && idx < 5) codeRefs.current[idx + 1]?.focus();
    if (newCode.join('').length === 6) handleVerify(newCode.join(''));
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      handleVerify(pasted);
    }
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (codeStr) => {
    const finalCode = codeStr || code.join('');
    if (finalCode.length !== 6) return;
    setLoading(true); setError('');
    try {
      await verify2FA(tempToken, finalCode);
      // redirect via useEffect when user state updates
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
      setCode(['','','','','','']);
      codeRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setResending(true); setError('');
    try {
      const res = await authAPI.resendOTP({ tempToken });
      setTwoFAMsg(res.data.message || 'New code sent');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code');
    } finally { setResending(false); }
  };

  const orbs = [
    { top:'8%',   left:'12%',  size:420, color:'rgba(124,58,237,0.12)' },
    { top:'55%',  right:'8%',  size:320, color:'rgba(168,85,247,0.08)' },
    { bottom:'5%',left:'38%',  size:260, color:'rgba(88,28,135,0.1)'   },
  ];

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', position:'relative', overflow:'hidden', padding:20 }}>
      {orbs.map((o, i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.size, height:o.size, background:`radial-gradient(circle,${o.color},transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:'blur(40px)', pointerEvents:'none' }}/>
      ))}

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, margin:'0 auto 14px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>⚡</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>AdsPulse</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>Cross-Platform Ads Management</p>
        </div>

        <div className="glass-card" style={{ padding:32 }}>

          {/* ── Credentials step ── */}
          {step === 'credentials' && (
            <>
              <div style={{ display:'flex', marginBottom:24, background:'var(--bg-elevated)', borderRadius:10, padding:4 }}>
                {['login','register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(''); }}
                    style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                      background: mode===m ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                      color: mode===m ? 'white' : 'var(--text-faint)', transition:'all 0.2s' }}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div style={{ marginBottom:14 }}>
                    <label className="form-label">Full Name</label>
                    <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} required/>
                  </div>
                )}
                <div style={{ marginBottom:14 }}>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} required/>
                </div>
                <div style={{ marginBottom:22 }}>
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} required minLength={6}/>
                </div>

                {error && (
                  <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                  {loading ? '⏳ Please wait...' : mode === 'login' ? '→ Sign In' : '→ Create Account'}
                </button>
              </form>

              {mode === 'login' && (
                <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:12, color:'var(--text-muted)' }}>
                  <strong style={{ color:'var(--purple-light)' }}>Demo:</strong> demo@adspulse.com / demo123
                </div>
              )}
            </>
          )}

          {/* ── 2FA step ── */}
          {step === '2fa' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>{twoFAMethod === 'email' ? '📧' : '📱'}</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>
                Two-Factor Authentication
              </h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 6px', lineHeight:1.6 }}>
                {twoFAMethod === 'email'
                  ? 'Enter the 6-digit code sent to your email.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>
              {twoFAMsg && (
                <p style={{ fontSize:12, color:'#16a34a', margin:'0 0 24px', fontWeight:600 }}>{twoFAMsg}</p>
              )}

              {/* 6-digit input boxes */}
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => codeRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    onPaste={handleCodePaste}
                    style={{
                      width:46, height:56, textAlign:'center', fontSize:22, fontWeight:800,
                      borderRadius:10, border:`2px solid ${digit ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                      background:'var(--bg-input)', color:'var(--text-primary)',
                      outline:'none', transition:'border-color 0.2s', fontFamily:'DM Mono,monospace'
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                className="btn-primary"
                disabled={loading || code.join('').length !== 6}
                onClick={() => handleVerify()}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15, marginBottom:12 }}
              >
                {loading ? '⏳ Verifying...' : '✓ Verify Code'}
              </button>

              {/* Resend for email method */}
              {twoFAMethod === 'email' && (
                <button
                  onClick={handleResendOTP}
                  disabled={resending}
                  style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:8 }}
                >
                  {resending ? '⏳ Sending...' : '📧 Resend Code'}
                </button>
              )}

              <div>
                <button
                  onClick={() => { setStep('credentials'); setCode(['','','','','','']); setError(''); }}
                  style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
