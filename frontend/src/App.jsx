// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- Auth ---
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

// --- i18n / currency ---
import { LanguageProvider } from './i18n/LanguageContext';
import { CurrencyProvider } from './currency/CurrencyContext';

// --- Pages (Week 12 scope) ---
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import DashboardPage from './DashboardPage';

import PageTransition from './components/PageTransition';

function App() {
  return (
    <Router>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <PageTransition>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* User area (requires login) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PageTransition>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
