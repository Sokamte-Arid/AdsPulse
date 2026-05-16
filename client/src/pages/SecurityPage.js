import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import api from '../utils/api';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

const ACTION_ICONS = {
  'platform.connect':    { icon: '🔗', color: '#16a34a' },
  'platform.disconnect': { icon: '🔌', color: '#d97706' },
  'platform.sync':       { icon: '🔄', color: '#3b82f6' },
  'campaign.create':     { icon: '📣', color: '#7c3aed' },
  'campaign.update':     { icon: '✏️',  color: '#3b82f6' },
  'campaign.delete':     { icon: '🗑️', color: '#ef4444' },
  '2fa.enable':          { icon: '🔐', color: '#16a34a' },
  '2fa.disable':         { icon: '🔓', color: '#d97706' },
  'auth.login':          { icon: '🔑', color: '#3b82f6' },
};

export default function SecurityPage() {
  const { user, refreshUser } = useAuth();
  const [step,      setStep]     = useState('overview');
  const [method,    setMethod]   = useState('totp');
  const [qrCode,    setQrCode]   = useState('');
  const [secret,    setSecret]   = useState('');
  const [code,      setCode]     = useState(['', '', '', '', '', '']);
  const [password,  setPassword] = useState('');
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');
  const [success,   setSuccess]  = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('2fa');
  const [setupMsg,  setSetupMsg] = useState('');
  const codeRefs = useRef([]);

  const is2FAEnabled = user?.twoFactorEnabled;

  useEffect(() => {
    api.get('/audit?limit=40')
      .then(res => setAuditLogs(res.data || []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const handleCodeInput = (idx, val) => {
    const v = val.replace(/\D/, '');
    const newCode = [...code];
    newCode[idx] = v;
    setCode(newCode);
    if (v && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) setCode(pasted.split(''));
  };

  const handleSetup = async (selectedMethod) => {
    setMethod(selectedMethod);
    setLoading(true);
    setError('');
    setSetupMsg('');
    setCode(['', '', '', '', '', '']);
    try {
      const res = await authAPI.setup2FA({ method: selectedMethod });
      if (selectedMethod === 'totp') {
        setQrCode(res.data.qrCode);
        setSecret(res.data.secret);
        setStep('setup-totp');
      } else {
        setSetupMsg(res.data.message || 'Code sent — check your server terminal');
        setStep('setup-email');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  const handleEnable = async () => {
    const finalCode = code.join('');
    if (finalCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.enable2FA({ code: finalCode });
      await refreshUser();
      setSuccess('✅ Two-factor authentication enabled! Your account is now more secure.');
      setStep('overview');
      setCode(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } finally { setLoading(false); }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.disable2FA({ password });
      await refreshUser();
      setSuccess('2FA has been disabled.');
      setStep('overview');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect password.');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security</h1>
          <p className="page-subtitle">Two-factor authentication and account activity</p>
        </div>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-elevated)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[{ id: '2fa', label: '🔐 Two-Factor Auth' }, { id: 'activity', label: '📋 Activity Log' }, { id: 'account', label: '👤 Account' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-faint)',
            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── 2FA TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === '2fa' && (
        <div className="glass-card" style={{ padding: 28, maxWidth: 580 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Two-Factor Authentication</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Add a second layer of security</p>
            </div>
            <div style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: is2FAEnabled ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${is2FAEnabled ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: is2FAEnabled ? '#16a34a' : '#ef4444'
            }}>
              {is2FAEnabled ? '✓ ENABLED' : '✗ DISABLED'}
            </div>
          </div>

          {/* ── Overview ── */}
          {step === 'overview' && !is2FAEnabled && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
                Choose your preferred 2FA method. After setup, every login will require your password <strong>plus</strong> a verification code.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                {[
                  { id: 'totp', icon: '📱', title: 'Authenticator App', badge: 'Most Secure', desc: 'Use Google Authenticator or Authy. Generates a new 6-digit code every 30 seconds. Works offline.' },
                  { id: 'email', icon: '📧', title: 'Email Code', badge: 'Easy Setup', desc: 'A 6-digit code is emailed on each login. Code also appears in the server terminal during development.' },
                ].map(opt => (
                  <div key={opt.id}
                    onClick={() => !loading && handleSetup(opt.id)}
                    style={{ padding: 18, borderRadius: 12, border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'var(--bg-elevated)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', color: 'var(--purple-light)' }}>
                      {opt.badge}
                    </div>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>{opt.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                    {loading && method === opt.id && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--purple-light)' }}>Setting up...</div>}
                  </div>
                ))}
              </div>
              {error && <div style={{ color: '#ef4444', fontSize: 13, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)' }}>⚠️ {error}</div>}
            </>
          )}

          {step === 'overview' && is2FAEnabled && (
            <>
              <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ✅ Protected with {user?.twoFactorMethod === 'email' ? '📧 email code' : '📱 authenticator app'}.
                Every login now requires your password <strong>plus</strong> the second factor.
              </div>
              <button className="btn-secondary" onClick={() => { setStep('disable'); setError(''); }} style={{ fontSize: 13 }}>
                🔓 Disable 2FA
              </button>
            </>
          )}

          {/* ── TOTP Setup ── */}
          {step === 'setup-totp' && (
            <div>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>ℹ️ Steps:</strong> Open Google Authenticator or Authy → tap <strong>+</strong> → tap <strong>Scan QR code</strong> → scan the image below → enter the 6-digit code shown in the app.
              </div>

              {/* QR Code */}
              {qrCode && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src={qrCode} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 12, padding: 10, background: 'white', border: '3px solid var(--purple-primary)' }} />
                </div>
              )}

              {/* Manual entry */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Can't scan? Enter this key manually in the app:
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', letterSpacing: 3, wordBreak: 'break-all', userSelect: 'all' }}>
                  {secret}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
                  Account: {user?.email} · Issuer: AdsPulse · Type: Time-based
                </div>
              </div>

              {/* Code input */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                Enter the 6-digit code from your authenticator app:
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
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
                      width: 46, height: 58, textAlign: 'center', fontSize: 24, fontWeight: 800,
                      borderRadius: 10, border: `2px solid ${digit ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                      background: 'var(--bg-input)', color: 'var(--text-primary)',
                      outline: 'none', transition: 'border-color 0.2s', fontFamily: 'DM Mono, monospace'
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ⚠️ {error}
                  <div style={{ fontSize: 11, marginTop: 4, color: '#fca5a5' }}>
                    Tip: Make sure your phone time is set to automatic. The code changes every 30 seconds.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => { setStep('overview'); setError(''); setCode(['', '', '', '', '', '']); }} style={{ flex: 1, justifyContent: 'center' }}>
                  ← Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={loading || code.join('').length !== 6}
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {loading ? '⏳ Verifying...' : '✓ Enable 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* ── Email OTP Setup ── */}
          {step === 'setup-email' && (
            <div>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <strong>📧 {setupMsg}</strong>
                <br/>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  During development, the code is printed to your <strong>server terminal window</strong>.
                  Look for the box that shows <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>2FA VERIFICATION CODE</code>.
                </span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                Enter the 6-digit code:
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
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
                      width: 46, height: 58, textAlign: 'center', fontSize: 24, fontWeight: 800,
                      borderRadius: 10, border: `2px solid ${digit ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                      background: 'var(--bg-input)', color: 'var(--text-primary)',
                      outline: 'none', transition: 'border-color 0.2s', fontFamily: 'DM Mono, monospace'
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => { setStep('overview'); setError(''); setCode(['', '', '', '', '', '']); }} style={{ flex: 1, justifyContent: 'center' }}>
                  ← Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={loading || code.join('').length !== 6}
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {loading ? '⏳ Verifying...' : '✓ Enable Email 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* ── Disable 2FA ── */}
          {step === 'disable' && (
            <div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                ⚠️ Disabling 2FA makes your account less secure. Enter your password to confirm.
              </div>
              <label className="form-label">Current Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDisable()}
                style={{ marginBottom: 16 }}
              />
              {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => { setStep('overview'); setError(''); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button
                  onClick={handleDisable}
                  disabled={loading || !password}
                  style={{ flex: 2, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'DM Sans, sans-serif', opacity: !password ? 0.5 : 1 }}
                >
                  {loading ? 'Disabling...' : '🔓 Disable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Account Activity</h3>
          {logsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-faint)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
              <div>No activity yet. Actions like connecting platforms, creating campaigns and enabling 2FA will appear here.</div>
            </div>
          ) : (
            auditLogs.map((log, idx) => {
              const style = ACTION_ICONS[log.action] || { icon: '⚡', color: 'var(--purple-light)' };
              return (
                <div key={log._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: idx < auditLogs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${style.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {style.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.action.replace(/\./g, ' · ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(log.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                      {log.success ? <span style={{ color: '#16a34a' }}>✓ Success</span> : <span style={{ color: '#ef4444' }}>✗ Failed</span>}
                      {log.ip ? ` · IP: ${log.ip}` : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ACCOUNT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div className="glass-card" style={{ padding: 24, maxWidth: 560 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 18px' }}>Account Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Full Name',    value: user?.name },
              { label: 'Email',        value: user?.email },
              { label: 'Role',         value: user?.role },
              { label: '2FA Method',   value: user?.twoFactorEnabled ? (user?.twoFactorMethod === 'totp' ? '📱 Authenticator App' : '📧 Email Code') : '❌ Disabled' },
              { label: 'Last Login',   value: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
