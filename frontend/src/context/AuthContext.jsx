import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('hostelhub_token');
      const savedUser = localStorage.getItem('hostelhub_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('hostelhub_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password, role) => {
    const res = await api.post('/auth/login', { identifier, password, role });
    if (res.data.success) {
      localStorage.setItem('hostelhub_token', res.data.token);
      localStorage.setItem('hostelhub_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('hostelhub_token');
    localStorage.removeItem('hostelhub_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

