// src/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, role: requiredRole }) {
  const { role, loading, user } = useAuth();
  const location = useLocation();

  // Wait until AuthContext finishes checking the profile from the server
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  // If not logged in after loading finishes, redirect to login
  if (!user && !role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If a specific role is strictly required, check it
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children ?? <Outlet />;
}