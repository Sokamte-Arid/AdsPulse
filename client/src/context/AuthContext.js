import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(res => setUser(res.data))
      .catch(() => { localStorage.removeItem('token'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData, requires2FA, welcome } = res.data;
    if (requires2FA) return res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return { welcome };
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    // If email verification required, don't auto-login
    if (res.data.requiresVerification) {
      return res.data; // caller handles the pending state
    }
    const { token, user: userData, welcome } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return { welcome };
  }, []);

  const verify2FA = useCallback(async (tempToken, code) => {
    const res = await authAPI.verify2FA({ tempToken, code });
    const { token, user: userData, welcome } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return { welcome };
  }, []);

  // Used after email verification or password reset
  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data);
      return res.data;
    } catch { logout(); }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verify2FA, loginWithToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
