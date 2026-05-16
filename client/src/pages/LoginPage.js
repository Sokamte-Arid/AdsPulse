import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function WelcomeToast({ welcome, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:24, right:24, zIndex:9999, maxWidth:380, padding:'18px 22px',
      background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.1))',
      border:'1px solid rgba(124,58,237,0.3)', borderRadius:14,
      boxShadow:'0 8px 32px rgba(124,58,237,0.2)', backdropFilter:'blur(12px)',
      animation:'slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      display:'flex', gap:14, alignItems:'flex-start' }}>
      <div style={{ fontSize:32, lineHeight:1, flexShrink:0 }}>{welcome.isNew ? '🎉' : '👋'}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>{welcome.message}</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{welcome.subtitle}</div>
      </div>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:18, padding:0 }}>✕</button>
    </div>
  );
}

function getStrength(pwd) {
  if (!pwd) return null;
  let s = 0;
  if (pwd.length >= 8) s++; if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++; if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 1) return { label:'Weak',   color:'#ef4444', pct:25  };
  if (s <= 2) return { label:'Fair',   color:'#d97706', pct:50  };
  if (s <= 3) return { label:'Good',   color:'#3b82f6', pct:75  };
  return              { label:'Strong', color:'#16a34a', pct:100 };
}

export default function LoginPage() {
  const { login, register, verify2FA, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [mode,     setMode]     = useState('login');
  const [step,     setStep]     = useState('credentials'); // credentials | 2fa | forgot | forgot-sent | verify-pending
  const [form,     setForm]     = useState({ name:'', email:'', password:'' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code,     setCode]     = useState(['','','','','','']);
  const [tempToken, setTempToken] = useState('');
  const [twoFAMethod, setTwoFAMethod] = useState('totp');
  const [twoFAMsg, setTwoFAMsg] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState(''); // for verify-pending step
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [resentVerification, setResentVerification] = useState(false);
  const [welcome,  setWelcome]  = useState(null);
  const codeRefs = useRef([]);

  useEffect(() => { if (user) navigate(redirect, { replace: true }); }, [user, navigate, redirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && form.password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(form.email.trim(), form.password);
        if (result?.requires2FA) {
          setTempToken(result.tempToken); setTwoFAMethod(result.method);
          setTwoFAMsg(result.message || ''); setStep('2fa');
        } else if (result?.welcome) {
          setWelcome(result.welcome);
        }
      } else {
        const result = await register(form.name.trim(), form.email.trim(), form.password);
        // Registration now returns requiresVerification
        if (result?.requiresVerification) {
          setPendingEmail(form.email.trim());
          setStep('verify-pending');
          if (result.welcome) setWelcome(result.welcome);
        }
      }
    } catch (err) {
      const data = err.response?.data;
      // Handle unverified account trying to log in
      if (data?.requiresVerification) {
        setPendingEmail(data.email || form.email.trim());
        setStep('verify-pending');
      } else {
        setError(data?.message || err.message || 'Something went wrong');
      }
    } finally { setLoading(false); }
  };

  const handleCodeInput = (idx, val) => {
    const v = val.replace(/\D/, '');
    const newCode = [...code]; newCode[idx] = v; setCode(newCode);
    if (v && idx < 5) codeRefs.current[idx+1]?.focus();
    if (newCode.join('').length === 6) handleVerify(newCode.join(''));
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) codeRefs.current[idx-1]?.focus();
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (pasted.length === 6) { setCode(pasted.split('')); handleVerify(pasted); }
  };

  const handleVerify = async (codeStr) => {
    const finalCode = codeStr || code.join('');
    if (finalCode.length !== 6) return;
    setLoading(true); setError('');
    try {
      const result = await verify2FA(tempToken, finalCode);
      if (result?.welcome) setWelcome(result.welcome);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code.');
      setCode(['','','','','','']); codeRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification(pendingEmail);
      setResentVerification(true);
    } catch { setResentVerification(true); }
    finally { setResending(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Email is required'); return; }
    setLoading(true); setError('');
    try { await authAPI.forgotPassword(forgotEmail.trim()); setStep('forgot-sent'); }
    catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const strength = mode === 'register' ? getStrength(form.password) : null;

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', position:'relative', overflow:'hidden', padding:20 }}>
      {welcome && <WelcomeToast welcome={welcome} onClose={() => setWelcome(null)}/>}

      {[
        { top:'8%',   left:'12%',  size:420, color:'rgba(124,58,237,0.12)' },
        { top:'55%',  right:'8%',  size:320, color:'rgba(168,85,247,0.08)' },
        { bottom:'5%',left:'38%',  size:260, color:'rgba(88,28,135,0.1)'   },
      ].map((o, i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.size, height:o.size, background:`radial-gradient(circle,${o.color},transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:'blur(40px)', pointerEvents:'none' }}/>
      ))}

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, margin:'0 auto 14px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>⚡</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>AdsPulse</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>Cross-Platform Ads Management</p>
        </div>

        <div className="glass-card" style={{ padding:32 }}>

          {/* ── Credentials ── */}
          {step === 'credentials' && (
            <>
              <div style={{ display:'flex', marginBottom:24, background:'var(--bg-elevated)', borderRadius:10, padding:4 }}>
                {['login','register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(''); setConfirmPassword(''); }}
                    style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                      background: mode===m?'linear-gradient(135deg,#7c3aed,#6d28d9)':'transparent',
                      color: mode===m?'white':'var(--text-faint)', transition:'all 0.2s' }}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div style={{ marginBottom:14 }}>
                    <label className="form-label">Full Name</label>
                    <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required/>
                  </div>
                )}
                <div style={{ marginBottom:14 }}>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required/>
                </div>
                <div style={{ marginBottom: mode==='register'?8:6 }}>
                  <label className="form-label">Password</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-input" type={showPass?'text':'password'} placeholder="••••••••"
                      value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
                      required minLength={6} style={{ paddingRight:44 }}/>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                      <EyeIcon open={showPass}/>
                    </button>
                  </div>
                  {strength && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:3, borderRadius:2, background:'var(--bg-elevated)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${strength.pct}%`, background:strength.color, borderRadius:2, transition:'width 0.3s' }}/>
                      </div>
                      <div style={{ fontSize:11, color:strength.color, fontWeight:600, marginTop:3 }}>{strength.label} password</div>
                    </div>
                  )}
                </div>

                {mode === 'register' && (
                  <div style={{ marginBottom:20 }}>
                    <label className="form-label">Confirm Password</label>
                    <div style={{ position:'relative' }}>
                      <input className="form-input" type={showConfirmPass?'text':'password'} placeholder="••••••••"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        required style={{ paddingRight:44, borderColor: confirmPassword&&confirmPassword!==form.password?'#ef4444':undefined }}/>
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', padding:2 }}>
                        <EyeIcon open={showConfirmPass}/>
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== form.password && (
                      <div style={{ fontSize:11, color:'#ef4444', marginTop:4, fontWeight:600 }}>Passwords do not match</div>
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div style={{ textAlign:'right', marginBottom:16, marginTop:-2 }}>
                    <button type="button" onClick={() => { setStep('forgot'); setForgotEmail(form.email); setError(''); }}
                      style={{ background:'none', border:'none', color:'var(--purple-light)', fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && (
                  <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" className="btn-primary"
                  disabled={loading || (mode==='register' && confirmPassword!==form.password)}
                  style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                  {loading ? '⏳ Please wait...' : mode==='login' ? '→ Sign In' : '→ Create Account'}
                </button>
              </form>

              {mode === 'login' && (
                <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:12, color:'var(--text-muted)' }}>
                  <strong style={{ color:'var(--purple-light)' }}>Demo:</strong> demo@adspulse.com / demo123
                </div>
              )}
            </>
          )}

          {/* ── Verify Pending — after register ── */}
          {step === 'verify-pending' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>📬</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Check Your Email
              </h2>
              <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 8px', lineHeight:1.7 }}>
                We sent a verification link to:
              </p>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:20 }}>
                {pendingEmail}
              </div>

              <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:22, fontSize:13, color:'var(--text-muted)', lineHeight:1.7, textAlign:'left' }}>
                <strong style={{ color:'var(--text-primary)' }}>Next steps:</strong>
                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                  {['1. Open the email from AdsPulse', '2. Click the "Verify My Email" button', '3. You\'ll be automatically logged in'].map(s => (
                    <div key={s} style={{ fontSize:12 }}>{s}</div>
                  ))}
                </div>
              </div>

              {/* Dev mode notice */}
              <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(37,99,235,0.07)', border:'1px solid rgba(37,99,235,0.2)', marginBottom:20, fontSize:12, color:'var(--text-muted)', lineHeight:1.6, textAlign:'left' }}>
                💡 <strong>Development mode:</strong> If SMTP is not configured, the verification link is printed to your <strong>server terminal</strong>. Look for the box labeled <code>EMAIL VERIFICATION LINK</code>.
              </div>

              {!resentVerification ? (
                <>
                  <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>Didn't receive it?</p>
                  <button onClick={handleResendVerification} disabled={resending} className="btn-secondary"
                    style={{ width:'100%', justifyContent:'center', marginBottom:10 }}>
                    {resending ? '⏳ Sending...' : '📧 Resend Verification Email'}
                  </button>
                </>
              ) : (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.25)', marginBottom:12, fontSize:13, color:'#16a34a' }}>
                  ✅ New verification link sent — check your email or server terminal.
                </div>
              )}

              <button onClick={() => { setStep('credentials'); setMode('login'); setError(''); }}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
                ← Back to login
              </button>
            </div>
          )}

          {/* ── 2FA ── */}
          {step === '2fa' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>{twoFAMethod==='email'?'📧':'📱'}</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>Two-Factor Authentication</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 6px', lineHeight:1.6 }}>
                {twoFAMethod==='email'?'Enter the 6-digit code sent to your email.':'Enter the code from your authenticator app.'}
              </p>
              {twoFAMsg && <p style={{ fontSize:12, color:'#16a34a', margin:'0 0 24px', fontWeight:600 }}>{twoFAMsg}</p>}

              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }}>
                {code.map((digit, i) => (
                  <input key={i} ref={el => codeRefs.current[i]=el}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)} onPaste={handleCodePaste}
                    style={{ width:46, height:56, textAlign:'center', fontSize:22, fontWeight:800, borderRadius:10,
                      border:`2px solid ${digit?'var(--purple-primary)':'var(--border-subtle)'}`,
                      background:'var(--bg-input)', color:'var(--text-primary)', outline:'none',
                      transition:'border-color 0.2s', fontFamily:'DM Mono,monospace' }}/>
                ))}
              </div>

              {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}

              <button className="btn-primary" disabled={loading||code.join('').length!==6} onClick={() => handleVerify()}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15, marginBottom:12 }}>
                {loading?'⏳ Verifying...':'✓ Verify Code'}
              </button>
              {twoFAMethod==='email' && (
                <button onClick={async()=>{ try{ const r=await authAPI.resendOTP({tempToken}); setTwoFAMsg(r.data.message); }catch{} }}
                  style={{ background:'none', border:'none', color:'var(--purple-light)', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:8, display:'block', width:'100%' }}>
                  📧 Resend Code
                </button>
              )}
              <button onClick={() => { setStep('credentials'); setCode(['','','','','','']); setError(''); }}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
                ← Back to login
              </button>
            </div>
          )}

          {/* ── Forgot Password ── */}
          {step === 'forgot' && (
            <div>
              <button onClick={() => { setStep('credentials'); setError(''); }}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, marginBottom:20, padding:0 }}>
                ← Back to login
              </button>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔑</div>
                <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>Forgot Password?</h2>
                <p style={{ fontSize:13, color:'var(--text-muted)', margin:0, lineHeight:1.6 }}>We'll send you a reset link.</p>
              </div>
              <form onSubmit={handleForgotPassword}>
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@company.com"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required style={{ marginBottom:16 }}/>
                {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}
                <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                  {loading?'⏳ Sending...':'📧 Send Reset Link'}
                </button>
              </form>
            </div>
          )}

          {/* ── Forgot Sent ── */}
          {step === 'forgot-sent' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>📬</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>Check Your Email</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px', lineHeight:1.7 }}>
                If an account exists for <strong style={{ color:'var(--text-primary)' }}>{forgotEmail}</strong>, you'll receive a password reset link.
                <br/><br/>
                During development, the link is also in your server terminal.
              </p>
              <button className="btn-primary" onClick={() => { setStep('credentials'); setError(''); }}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0' }}>
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
