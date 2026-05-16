import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const SESSION_DURATION  = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const WARNING_BEFORE    = 5 * 60 * 1000;             // warn 5 min before expiry
const CHECK_INTERVAL    = 60 * 1000;                 // check every minute

export default function SessionManager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning,  setShowWarning]  = useState(false);
  const [showExpired,  setShowExpired]  = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [extending,    setExtending]    = useState(false);
  const warningTimerRef = useRef(null);
  const countdownRef    = useRef(null);

  // Get token expiry time from JWT
  const getTokenExpiry = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // convert to ms
    } catch { return null; }
  }, []);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
  }, []);

  const handleExtendSession = async () => {
    setExtending(true);
    try {
      // Call a lightweight endpoint to verify token is still accepted
      await api.get('/auth/me');
      // Token is still valid — but to truly extend, we'd need to re-issue
      // For now, just dismiss the warning and reset the timer
      setShowWarning(false);
      setShowExpired(false);
      setupTimers();
    } catch {
      // Token is truly expired
      setShowWarning(false);
      setShowExpired(true);
    } finally { setExtending(false); }
  };

  const handleLogout = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setShowExpired(false);
    logout();
    navigate('/login', { replace: true });
  }, [clearTimers, logout, navigate]);

  const setupTimers = useCallback(() => {
    clearTimers();
    const expiry = getTokenExpiry();
    if (!expiry) return;

    const now = Date.now();
    const msUntilExpiry  = expiry - now;
    const msUntilWarning = msUntilExpiry - WARNING_BEFORE;

    if (msUntilExpiry <= 0) {
      // Already expired
      setShowExpired(true);
      return;
    }

    if (msUntilWarning <= 0) {
      // Already in warning window
      setShowWarning(true);
      setTimeLeft(Math.floor(msUntilExpiry / 1000));
    } else {
      // Schedule warning
      setTimeout(() => {
        setShowWarning(true);
        setTimeLeft(Math.floor(WARNING_BEFORE / 1000));
      }, msUntilWarning);
    }

    // Countdown timer (updates every second when warning is showing)
    warningTimerRef.current = setInterval(() => {
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      if (remaining <= 0) {
        clearTimers();
        setShowWarning(false);
        setShowExpired(true);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    // Also check periodically for background expiry
    const bgCheck = setInterval(() => {
      const exp = getTokenExpiry();
      if (!exp || Date.now() >= exp) {
        clearInterval(bgCheck);
        setShowWarning(false);
        setShowExpired(true);
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(bgCheck);
  }, [clearTimers, getTokenExpiry]);

  useEffect(() => {
    if (!user) { clearTimers(); return; }
    const cleanup = setupTimers();
    return () => {
      clearTimers();
      cleanup?.();
    };
  }, [user, setupTimers, clearTimers]);

  // Intercept 401 errors from API
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
          setShowWarning(false);
          setShowExpired(true);
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Don't render anything if not logged in or no modals to show
  if (!user || (!showWarning && !showExpired)) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9998, backdropFilter:'blur(4px)' }}/>

      {/* Modal */}
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:9999, width:'100%', maxWidth:420, padding:20 }}>
        <div className="glass-card" style={{ padding:36, textAlign:'center' }}>

          {/* ── Session expiring soon ── */}
          {showWarning && !showExpired && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>⏰</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Session Expiring Soon
              </h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 8px', lineHeight:1.7 }}>
                Your session will expire in
              </p>
              <div style={{ fontSize:36, fontWeight:800, color:'#d97706', marginBottom:16, fontFamily:'DM Mono,monospace' }}>
                {formatTime(timeLeft)}
              </div>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Click "Stay Logged In" to continue your session, or you'll be logged out automatically.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-secondary" onClick={handleLogout} style={{ flex:1, justifyContent:'center' }}>
                  Log Out
                </button>
                <button className="btn-primary" onClick={handleExtendSession} disabled={extending}
                  style={{ flex:2, justifyContent:'center' }}>
                  {extending ? '⏳ Checking...' : '✓ Stay Logged In'}
                </button>
              </div>
            </>
          )}

          {/* ── Session expired ── */}
          {showExpired && (
            <>
              <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 10px' }}>
                Session Expired
              </h2>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 24px', lineHeight:1.7 }}>
                Your session has expired after 7 days of inactivity. Please log in again to continue using AdsPulse.
                <br/><br/>
                <strong style={{ color:'var(--text-primary)' }}>Don't worry</strong> — all your campaigns, data and settings are saved.
              </p>
              <button className="btn-primary" onClick={handleLogout}
                style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:15 }}>
                → Log In Again
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
