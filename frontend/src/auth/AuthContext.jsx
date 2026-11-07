// src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'travezia_auth';
const USERS_KEY = 'layagexpres_users';

export const ADMIN_DEMO = {
  email: 'admin@layagexpres.com',
  password: 'admin123',
};

const _DEMO_PASSWORD = 'demo1234';

const DEMO_USERS = {
  admin: {
    name: 'Kerwin Tagle',
    email: ADMIN_DEMO.email,
    role: 'admin',
    title: 'Administrator',
    avatar: 'https://i.pravatar.cc/150?img=11',
  },
  customer: {
    name: 'Kerwin Tagle',
    email: 'kerwin.tagle@email.com',
    role: 'customer',
    title: 'Passenger',
    avatar: 'https://i.pravatar.cc/150?img=11',
  },
};

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    const isLegacyCustomerSession = session?.role === 'customer'
      && !session.token
      && session.user?.email?.toLowerCase() !== DEMO_USERS.customer.email;
    return isLegacyCustomerSession ? null : session;
  } catch {
    return null;
  }
}

export function readRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeRegisteredUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable — keep in-memory session only */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const login = async (role, email, password) => {
    const normalized = (email || '').trim().toLowerCase();

    if (role === 'customer') {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: normalized, password },
      });
      const user = { ...result.user, role: 'customer' };
      setSession({ role: 'customer', user, token: result.token });
      return user;
    }

    if (role === 'admin' && password !== undefined && password !== ADMIN_DEMO.password) {
      throw new Error('Incorrect administrator password.');
    }

    const base = DEMO_USERS[role] ?? DEMO_USERS.customer;
    const user = { ...base, email: normalized || base.email };
    setSession({ role: user.role, user });
    return user;
  };

  const register = async ({ name, email, mobile, password }) => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: name.trim(), email: email.trim().toLowerCase(), mobile: mobile.trim(), password },
    });
    const user = { ...result.user, role: 'customer' };
    setSession({ role: 'customer', user, token: result.token });
    return user;
  };

  const updateUser = async (patch) => {
    if (!session?.token) throw new Error('You must be signed in to update your profile.');
    const backendPatch = { ...patch };
    if (patch.name) {
      const [firstName, ...lastName] = patch.name.trim().split(/\s+/);
      backendPatch.firstName = firstName;
      backendPatch.lastName = lastName.join(' ');
      delete backendPatch.name;
    }
    if (patch.mobile) {
      backendPatch.contactNumber = patch.mobile;
      delete backendPatch.mobile;
    }
    const user = await apiRequest('/auth/me', {
      token: session.token,
      method: 'PUT',
      body: backendPatch,
    });
    const nextUser = { ...user, role: 'customer' };
    setSession((current) => current && ({ ...current, user: nextUser }));
    return nextUser;
  };

  const changePassword = async (currentPassword, nextPassword) => {
    if (!session?.token) throw new Error('You must be signed in.');
    await apiRequest('/auth/change-password', {
      token: session.token,
      method: 'PUT',
      body: { currentPassword, newPassword: nextPassword },
    });
  };

  const logout = () => setSession(null);

  const value = {
    role: session?.role ?? null,
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session),
    login,
    register,
    updateUser,
    changePassword,
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
