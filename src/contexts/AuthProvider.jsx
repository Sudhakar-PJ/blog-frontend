import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Fetch user (this will trigger refresh interceptor if cookies are expired)
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: userData } = response.data;
    setUser(userData);
    return userData;
  };

  const register = async (email, username, password) => {
    const response = await api.post('/auth/register', { email, username, password });
    const { user: userData } = response.data;
    setUser(userData);
    return userData;
  };

  const verifyEmailCode = async (userId, code) => {
    await api.post('/auth/verify-email', { userId, code });
    setUser(prev => ({ ...prev, is_email_verified: true }));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
    setUser(null);
    window.location.href = '/login';
  };

  const logoutAllDevices = async () => {
    try {
      await api.post('/auth/logout', { allDevices: true });
    } catch (err) {
      console.error('Logout all devices error', err);
    }
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, logoutAllDevices, verifyEmailCode, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
