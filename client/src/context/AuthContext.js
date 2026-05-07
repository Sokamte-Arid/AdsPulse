import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData, requires2FA, tempToken, method, message } = res.data;
    if (requires2FA) {
      return { requires2FA: true, tempToken, method, message };
    }
    if (!token) throw new Error('No token received');
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const verify2FA = async (tempToken, code) => {
    const res = await authAPI.verify2FA({ tempToken, code });
    const { token, user: userData } = res.data;
    if (!token) throw new Error('No token received');
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { token, user: userData } = res.data;
    if (!token) throw new Error('No token received');
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  const refreshUser = async () => {
    const res = await authAPI.me();
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, verify2FA, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
