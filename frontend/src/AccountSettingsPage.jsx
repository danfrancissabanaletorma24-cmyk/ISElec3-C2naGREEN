// src/AccountSettingsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Shield, Globe, Wallet, Armchair, CheckCircle2, User, ArrowRight,
} from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import Toast from './customer/Toast';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { useCurrency } from './currency/CurrencyContext';


const CLASS_OPTIONS = [
  { id: 'economy', label: 'Economy' },
  { id: 'business', label: 'Business' },
  { id: 'vip', label: 'VIP' },
];

const inputClass = (invalid) => `w-full py-3 border rounded-xl text-sm font-medium outline-none transition-all ${
  invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-slate-200 focus:ring-2 focus:ring-[#0056FF] focus:border-[#0056FF]'
}`;

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex h-6 w-11 shrink-0 items-center rounded-full px-1 transition-colors ${
        checked ? 'bg-[#0056FF]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AccountSettingsPage() {
  const { user, updateUser, changePassword } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const { currency, setCurrency, currencies } = useCurrency();

  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const [toast, setToast] = useState('');

  const [notifications, setNotifications] = useState({
    email: user?.preferences?.notificationsEmail ?? true,
    sms: user?.preferences?.notificationsSms ?? true,
    promotions: user?.preferences?.promotions ?? false,
  });

  const [defaultClass, setDefaultClass] = useState(() => {
    const stored = user?.preferences?.defaultClass;
    if (CLASS_OPTIONS.some((option) => option.id === stored)) return stored;
    try {
      return 'economy';
    } catch {
      return 'economy';
    }
  });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  const handleSavePreferences = async () => {
    try {
      await updateUser({
        preferences: {
          notificationsEmail: notifications.email,
          notificationsSms: notifications.sms,
          promotions: notifications.promotions,
          defaultClass,
          language,
          currency,
        },
      });
      setToast(t('prefs.saved'));
    } catch (error) {
      setToast(error.message || 'Could not save your preferences.');
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateUser({
        preferences: {
          notificationsEmail: notifications.email,
          notificationsSms: notifications.sms,
          promotions: notifications.promotions,
        },
      });
      setToast('Notification settings saved.');
    } catch (error) {
      setToast(error.message || 'Could not save your notification settings.');
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (!passwords.current) next.current = 'Enter your current password.';
    if (passwords.next.length < 8) next.next = 'Use at least 8 characters.';
    if (passwords.next !== passwords.confirm) next.confirm = 'Passwords do not match.';
    if (Object.keys(next).length > 0) {
      setPasswordErrors(next);
      return;
    }
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordErrors({});
      setToast('Password updated successfully.');
    } catch (error) {
      setPasswordErrors({ current: error.message });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">

      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main className="flex flex-1 flex-col">

        <CustomerHeader
          title="Account Settings"
          subtitle="Security, preferences, and notifications"
          onOpenMenu={openMobile}
        />

        <div className="px-4 md:px-8 pb-10 max-w-[1100px] mx-auto w-full">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Account Settings</h1>
            <p className="text-slate-500 text-sm">Manage your login security, app preferences, and notifications.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-6">

              {/* Preferences */}
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#0056FF]" /> {t('prefs.title')}
                </h2>
                <p className="mb-6 border-b border-slate-100 pb-4 text-sm text-slate-500">{t('prefs.sub')}</p>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pref-language" className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Globe className="h-3.5 w-3.5" /> {t('prefs.language')}
                    </label>
                    <select
                      id="pref-language"
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]"
                    >
                      {languages.map((item) => (
                        <option key={item.code} value={item.code}>{item.native}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pref-currency" className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Wallet className="h-3.5 w-3.5" /> {t('prefs.currency')}
                    </label>
                    <select
                      id="pref-currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]"
                    >
                      {currencies.map((item) => (
                        <option key={item.code} value={item.code}>{item.symbol} {item.code} — {item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Armchair className="h-3.5 w-3.5" /> {t('prefs.class')}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {CLASS_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={defaultClass === option.id}
                          onClick={() => setDefaultClass(option.id)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                            defaultClass === option.id
                              ? 'border-[#0056FF] bg-blue-50 text-[#0056FF]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-800"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('prefs.save')}
                  </button>
                </div>
              </div>

              {/* Security */}
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Shield className="w-5 h-5 text-[#0056FF]" /> Security
                </h2>

                <form className="space-y-5" onSubmit={handleChangePassword} noValidate>
                  <div>
                    <label htmlFor="pw-current" className="block text-xs font-bold text-slate-500 mb-2">Current Password</label>
                    <input
                      id="pw-current"
                      type="password"
                      value={passwords.current}
                      onChange={(event) => {
                        setPasswords((current) => ({ ...current, current: event.target.value }));
                        setPasswordErrors((current) => ({ ...current, current: undefined }));
                      }}
                      placeholder="••••••••"
                      aria-invalid={Boolean(passwordErrors.current)}
                      className={inputClass(passwordErrors.current)}
                    />
                    {passwordErrors.current && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{passwordErrors.current}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="pw-next" className="block text-xs font-bold text-slate-500 mb-2">New Password</label>
                      <input
                        id="pw-next"
                        type="password"
                        value={passwords.next}
                        onChange={(event) => {
                          setPasswords((current) => ({ ...current, next: event.target.value }));
                          setPasswordErrors((current) => ({ ...current, next: undefined }));
                        }}
                        placeholder="••••••••"
                        aria-invalid={Boolean(passwordErrors.next)}
                        className={inputClass(passwordErrors.next)}
                      />
                      {passwordErrors.next && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{passwordErrors.next}</p>}
                    </div>
                    <div>
                      <label htmlFor="pw-confirm" className="block text-xs font-bold text-slate-500 mb-2">Confirm New Password</label>
                      <input
                        id="pw-confirm"
                        type="password"
                        value={passwords.confirm}
                        onChange={(event) => {
                          setPasswords((current) => ({ ...current, confirm: event.target.value }));
                          setPasswordErrors((current) => ({ ...current, confirm: undefined }));
                        }}
                        placeholder="••••••••"
                        aria-invalid={Boolean(passwordErrors.confirm)}
                        className={inputClass(passwordErrors.confirm)}
                      />
                      {passwordErrors.confirm && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{passwordErrors.confirm}</p>}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button type="submit" className="bg-white border-2 border-[#0056FF] text-[#0056FF] hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm transition-colors">
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

            </div>

            <div className="space-y-6">

              {/* Account overview */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <User className="w-5 h-5 text-[#0056FF]" /> Account
                </h2>
                <p className="text-sm font-bold text-slate-900">{user?.name || 'Passenger'}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user?.email || '—'}</p>
                <Link
                  to="/profile"
                  className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0056FF]/40 hover:text-[#0056FF]"
                >
                  Go to My Profile <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Bell className="w-5 h-5 text-[#0056FF]" /> Notifications
                </h2>

                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                      <p className="text-xs text-slate-500 mt-1">Receive updates about your bookings.</p>
                    </div>
                    <Toggle
                      label="Email notifications"
                      checked={notifications.email}
                      onChange={(value) => setNotifications((current) => ({ ...current, email: value }))}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-sm font-bold text-slate-800">SMS Alerts</p>
                      <p className="text-xs text-slate-500 mt-1">Get text messages for trip reminders.</p>
                    </div>
                    <Toggle
                      label="SMS alerts"
                      checked={notifications.sms}
                      onChange={(value) => setNotifications((current) => ({ ...current, sms: value }))}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Promotional Offers</p>
                      <p className="text-xs text-slate-500 mt-1">Receive deals and discounts.</p>
                    </div>
                    <Toggle
                      label="Promotional offers"
                      checked={notifications.promotions}
                      onChange={(value) => setNotifications((current) => ({ ...current, promotions: value }))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Save notification settings
                </button>
              </div>

            </div>

          </div>
        </div>
      </main>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
