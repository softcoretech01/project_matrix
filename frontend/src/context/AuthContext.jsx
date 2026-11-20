// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api, setToken, getToken, API_BASE_URL as API_BASE } from '../services/api';

const AuthContext = createContext();
export const API_BASE_URL = API_BASE;

const SESSION_KEY = 'projectmatrix_session';
const REMEMBER_KEY = 'projectmatrix_remembered_email';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, val) {
  try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (_) {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const theme = 'light';                 // light theme only (dark mode removed)
  const [loading, setLoading] = useState(true);

  // Rehydrate session (user object + token) on load
  useEffect(() => {
    const saved = safeGet(SESSION_KEY);
    const token = getToken();
    if (saved && token) {
      try { setUser(JSON.parse(saved)); } catch (_) { safeSet(SESSION_KEY, null); }
    } else {
      // token and session must both exist
      safeSet(SESSION_KEY, null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  // Force light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    safeSet(SESSION_KEY, null);
  }, []);

  // Auto-logout when any API call reports 401
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('pm:unauthorized', handler);
    return () => window.removeEventListener('pm:unauthorized', handler);
  }, [logout]);

  const login = async (email, password, rememberMe, portal) => {
    const data = await api.post('/auth/login', { email, password, portal });
    setToken(data.token);
    const u = { ...data };
    delete u.token;
    setUser(u);
    safeSet(SESSION_KEY, JSON.stringify(u));
    safeSet(REMEMBER_KEY, rememberMe ? email : null);
    return u;
  };

  const changePassword = async (oldPassword, newPassword) => {
    await api.post('/auth/change-password', { oldPassword, newPassword });
  };

  const forgotPassword = async (email) => api.post('/auth/forgot-password', { email });
  const resetPassword = async (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword });

  const refreshMe = async () => {
    const me = await api.get('/auth/me');
    setUser(me);
    safeSet(SESSION_KEY, JSON.stringify(me));
    return me;
  };

  const value = {
    user,
    theme,
    loading,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    refreshMe,
    getRememberedEmail: () => safeGet(REMEMBER_KEY) || '',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
