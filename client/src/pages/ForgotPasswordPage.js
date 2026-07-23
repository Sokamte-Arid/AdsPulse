import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12 }}>⚡</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>AdsPulse</h1>
          <p style={{ fontSize:13, color:'var(--text-faint)', margin:0 }}>Cross-Platform Ad Management</p>
        </div>

        <div className="glass-card" style={{ padding:32, borderRadius:18 }}>
          {sent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>Check your email</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, margin:'0 0 24px' }}>
                If an account exists for <strong style={{ color:'var(--text-primary)' }}>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
              </p>
              <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:20 }}>The link expires in 1 hour.</p>
              <Link to="/login" style={{ display:'block', textAlign:'center', padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', textDecoration:'none', fontSize:14, fontWeight:700 }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px' }}>Forgot password?</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.5 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom:16 }}>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus style={{ fontSize:15 }}/>
                </div>

                {error && (
                  <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13, marginBottom:16 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif', opacity:loading?0.7:1 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div style={{ textAlign:'center', marginTop:20 }}>
                <Link to="/login" style={{ fontSize:13, color:'var(--purple-light)', textDecoration:'none', fontWeight:600 }}>
                  ← Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}