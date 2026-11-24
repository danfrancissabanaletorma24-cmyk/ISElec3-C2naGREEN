// src/auth/AuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'travezia_auth';

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session?.token ? session : null;
  } catch {
    return null;
  }
}

const normalizeUser = (user) => ({
  ...user,
  role: user.role === 'admin' ? 'admin' : 'customer',
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  // Track loading state: true initially if we have a token to verify
  const [loading, setLoading] = useState(() => Boolean(readStoredSession()?.token));

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const logout = useCallback(() => setSession(null), []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const token = session?.token;
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    apiRequest('/auth/me', { token })
      .then((user) => {
        if (active) {
          const normalizedUser = normalizeUser(user);
          setSession((current) => current && {
            ...current,
            role: normalizedUser.role,
            user: normalizedUser,
          });
        }
      })
      .catch(() => { /* 401 handled by unauthorized handler */ })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const authenticate = async (path, email, password) => {
    const result = await apiRequest(path, {
      method: 'POST',
      body: { email: (email || '').trim().toLowerCase(), password },
    });
    if (result.requiresMfa) return result;
    const user = normalizeUser(result.user);
    setSession({ role: user.role, user, token: result.token });
    return user;
  };

  const login = async (email, password) => {
    return authenticate('/auth/login', email, password);
  };

  const verifyMfa = async (challengeToken, code) => {
    const result = await apiRequest('/auth/verify-mfa', {
      method: 'POST',
      body: { challengeToken, code },
    });
    const user = normalizeUser(result.user);
    setSession({ role: user.role, user, token: result.token });
    return user;
  };

  // Creates the account only. The user signs in afterwards, which keeps the
  // authenticator (MFA) step mandatory for every account.
  const register = async ({ name, email, mobile, password }) => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: name.trim(), email: email.trim().toLowerCase(), mobile: mobile.trim(), password },
    });
    return normalizeUser(result.user);
  };

  const updateUser = async (patch) => {
    if (!session?.token) throw new Error('You must be signed in to update your profile.');
    const user = await apiRequest('/auth/me', { token: session.token, method: 'PUT', body: patch });
    const nextUser = normalizeUser(user);
    setSession((current) => current && { ...current, user: nextUser });
    return nextUser;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!session?.token) throw new Error('You must be signed in.');
    await apiRequest('/auth/change-password', {
      token: session.token,
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  };

  const resetPassword = async (newPassword) => {
    if (!session?.token) throw new Error('You must be signed in.');
    await apiRequest('/auth/reset-password', {
      token: session.token,
      method: 'PUT',
      body: { newPassword },
    });
  };

  const value = {
    role: session?.role ?? null,
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session),
    loading, 
    login,
    verifyMfa,
    register,
    updateUser,
    changePassword,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}