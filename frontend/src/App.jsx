// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import { LanguageProvider } from './i18n/LanguageContext';
import { CurrencyProvider } from './currency/CurrencyContext';
import PortsProvider from './ports/PortsProvider';

import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import DestinationsPage from './public/DestinationsPage';
import ShipsPage from './public/ShipsPage';
import SupportPage from './public/SupportPage';

import DashboardPage from './DashboardPage';
import SearchResultsPage from './SearchResultsPage';
import BookingPage from './BookingPage';
import MyBookingsPage from './MyBookingsPage';
import BookingDetailPage from './BookingDetailPage';
import TicketsPage from './TicketsPage';
import MapPage from './MapPage';
import PaymentMethodsPage from './PaymentMethodsPage';
import HelpSupportPage from './HelpSupportPage';
import ProfilePage from './ProfilePage';
import AccountSettingsPage from './AccountSettingsPage';

import PageTransition from './components/PageTransition';

function App() {
  return (
    <Router>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <PortsProvider>
              <PageTransition>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/destinations" element={<DestinationsPage />} />
                  <Route path="/ships" element={<ShipsPage />} />
                  <Route path="/support" element={<SupportPage />} />


                  {/* User area (requires login) */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/find-ships" element={<SearchResultsPage showSearch />} />
                    <Route path="/book/:tripId" element={<BookingPage />} />
                    <Route path="/bookings" element={<MyBookingsPage />} />
                    <Route path="/bookings/:id" element={<BookingDetailPage />} />
                    <Route path="/tickets" element={<TicketsPage />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/payment-methods" element={<PaymentMethodsPage />} />
                    <Route path="/help" element={<HelpSupportPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<AccountSettingsPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PageTransition>
            </PortsProvider>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
