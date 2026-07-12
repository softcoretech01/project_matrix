// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const API_BASE_URL = 'http://localhost:5002/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('pm_theme') || 'dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage session on load
    const savedSession = localStorage.getItem('projectmatrix_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem('projectmatrix_session');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pm_theme', theme);
  }, [theme]);

  const login = async (email, password, rememberMe) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed.');
    }

    const userData = await res.json();
    setUser(userData);
    localStorage.setItem('projectmatrix_session', JSON.stringify(userData));

    if (rememberMe) {
      localStorage.setItem('projectmatrix_remembered_email', email);
    } else {
      localStorage.removeItem('projectmatrix_remembered_email');
    }
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('projectmatrix_session');
  };


  const changePassword = async (oldPassword, newPassword) => {
    // Check old password on client side or backend, we update directly
    const res = await fetch(`${API_BASE_URL}/auth/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ employeeId: user.id, password: newPassword })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update password.');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = {
    user,
    theme,
    loading,
    login,
    logout,
    changePassword,
    toggleTheme,
    getRememberedEmail: () => localStorage.getItem('projectmatrix_remembered_email') || ''
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
