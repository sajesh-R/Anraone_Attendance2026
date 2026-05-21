import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../utils/pushNotifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('att_token') || null);
  const [loading, setLoading] = useState(true);

  // ── Configure Axios default Authorization header ──────────
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('att_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('att_token');
    }
  }, [token]);

  // ── Restore session from stored token on app mount ────────
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get('/api/auth/me');
        setUser(data.user);
      } catch (error) {
        console.error('Failed to restore session:', error.message);
        // Stale/invalid token — clear everything
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [token]);

  // ── Email/Password Login ──────────────────────────────────
  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      subscribeToPushNotifications(data.token).catch(console.error);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please verify your credentials.',
      };
    }
  };

  // ── Register ──────────────────────────────────────────────
  const register = async (fullName, email, password, role) => {
    try {
      const { data } = await axios.post('/api/auth/register', { fullName, email, password, role });
      setToken(data.token);
      setUser(data.user);
      subscribeToPushNotifications(data.token).catch(console.error);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  // ── Google OAuth ──────────────────────────────────────────
  const googleLogin = async (googleProfile) => {
    try {
      const { data } = await axios.post('/api/auth/google', googleProfile);
      setToken(data.token);
      setUser(data.user);
      subscribeToPushNotifications(data.token).catch(console.error);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Google login failed.',
      };
    }
  };

  // ── Microsoft SSO ─────────────────────────────────────────
  const microsoftLogin = async (msProfile) => {
    try {
      const { data } = await axios.post('/api/auth/microsoft', msProfile);
      setToken(data.token);
      setUser(data.user);
      subscribeToPushNotifications(data.token).catch(console.error);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Microsoft SSO login failed.',
      };
    }
  };

  // ── Logout ────────────────────────────────────────────────
  const logout = async () => {
    try {
      await unsubscribeFromPushNotifications(token);
      await axios.post('/api/auth/logout');
    } catch (_) {
      // Silent fail — still clear local state
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  // ── Update local user state (after profile updates) ───────
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    microsoftLogin,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
};
