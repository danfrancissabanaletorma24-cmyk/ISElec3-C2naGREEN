
// src/admin/AdminLayout.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Ship, Users, BarChart3, Settings,
  LogOut, Search, Bell, ChevronDown, Menu, X, ShieldCheck,
  ChevronLeft, ChevronRight, Map as MapIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import useSidebarState from '../hooks/useSidebarState';
import { apiRequest } from '../api';
import { refreshVessels } from '../data/vesselStore';
import Avatar from '../customer/Avatar';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/vessels', label: 'Vessels & Routes', icon: Ship },
  { to: '/admin/map', label: 'Fleet Map', icon: MapIcon },
  { to: '/admin/passengers', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

const PAGE_META = {
  '/admin': { title: 'Dashboard', subtitle: 'Operations snapshot for today' },
  '/admin/bookings': { title: 'Bookings', subtitle: 'Manage reservations and refunds' },
  '/admin/vessels': { title: 'Vessels & Routes', subtitle: 'Fleet capacity and schedules' },
  '/admin/map': { title: 'Fleet Map', subtitle: 'Live vessel positions across sea routes' },
  '/admin/users': { title: 'Users', subtitle: 'User directory and booking history' },
  '/admin/passengers': { title: 'Users', subtitle: 'User directory and booking history' },
  '/admin/reports': { title: 'Reports', subtitle: 'Revenue, routes and payment insights' },
  '/admin/settings': { title: 'Settings', subtitle: 'Console preferences' },
};

export default function AdminLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.admin.sidebarCollapsed',
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationError, setNotificationError] = useState('');
  const [markingNotificationId, setMarkingNotificationId] = useState(null);

  // Keep the fleet in sync with the database on every admin page (Dashboard, Vessels, Fleet Map).
  useEffect(() => { refreshVessels(token); }, [token, location.pathname]);

  const isCollapsed = collapsed && !mobileOpen;
  const meta = PAGE_META[location.pathname] ?? PAGE_META['/admin'];

  // Load all notifications for the admin
  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiRequest('/notifications/all?page=1&limit=50', { token });

      if (!Array.isArray(result.data)) {
        throw new Error('The notifications API returned an unexpected response.');
      }

      setNotifications(
        result.data.map((item) => {
          const createdAt = new Date(item.createdAt);

          return {
            ...item,
            createdAtLabel: Number.isNaN(createdAt.getTime())
              ? ''
              : createdAt.toLocaleString(),
          };
        })
      );

      setNotificationTotal(Number(result.total) || 0);
      setUnreadNotifications(Number(result.unreadCount) || 0);
    } catch (error) {
      setNotificationError(error.message || 'Could not load notifications.');
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [token]);

  // Mark a notification as read in the admin view only
  const markNotificationRead = async (notificationId) => {
    const selectedNotification = notifications.find(
      (item) => item._id === notificationId
    );

    if (!selectedNotification || selectedNotification.adminIsRead) {
      return;
    }

    setNotificationError('');
    setMarkingNotificationId(notificationId);

    try {
      await apiRequest(`/notifications/all/${notificationId}/read`, {
        method: 'PATCH',
        token,
      });

      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, adminIsRead: true }
            : item
        )
      );

      setUnreadNotifications((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationError(
        error.message || 'Could not mark notification as read.'
      );
    } finally {
      setMarkingNotificationId(null);
    }
  };

  // Automatically refresh notifications every minute
  useEffect(() => {
    loadNotifications();

    const timer = window.setInterval(loadNotifications, 60000);

    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  // Load older notifications
  const loadMoreNotifications = async () => {
    setIsLoadingMoreNotifications(true);
    setNotificationError('');

    try {
      const page = Math.floor(notifications.length / 50) + 1;

      const result = await apiRequest(
        `/notifications/all?page=${page}&limit=50`,
        { token }
      );

      if (!Array.isArray(result.data)) {
        throw new Error('The notifications API returned an unexpected response.');
      }

      setNotifications((current) =>
        current.concat(
          result.data.map((item) => {
            const createdAt = new Date(item.createdAt);

            return {
              ...item,
              createdAtLabel: Number.isNaN(createdAt.getTime())
                ? ''
                : createdAt.toLocaleString(),
            };
          })
        )
      );

      setNotificationTotal(Number(result.total) || 0);
      setUnreadNotifications(Number(result.unreadCount) || 0);
    } catch (error) {
      setNotificationError(error.message || 'Could not load more notifications.');
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ================= ADMIN SIDEBAR ================= */}
      <aside
        aria-label="Admin navigation"
        data-surface="dark"
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col bg-[#0B1B33] text-slate-300 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isCollapsed ? 'lg:w-[80px]' : ''
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#0B1B33] text-slate-400 shadow-md transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          )}
        </button>

        {/* Logo row */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/10 ${
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0056FF] text-white">
              <Ship className="h-5 w-5 fill-current" />
            </div>

            {!isCollapsed && (
              <div>
                <p className="text-lg font-bold leading-tight text-white">
                  LayagExpress
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Admin Console
                </p>
              </div>
            )}
          </div>

          <button
            onClick={closeMobile}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isCollapsed && (
          <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Manage
          </p>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-10">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={isCollapsed ? label : undefined}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors ${
                  isCollapsed ? 'justify-center px-4 lg:px-0' : 'px-4'
                } ${
                  isActive
                    ? 'bg-[#0056FF] text-white shadow-lg shadow-blue-900/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && label}
            </NavLink>
          ))}

          <NavLink
            to="/admin/settings"
            title={isCollapsed ? 'Settings' : undefined}
            onClick={closeMobile}
            className={({ isActive }) =>
              `mt-6 flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors ${
                isCollapsed ? 'justify-center px-4 lg:px-0' : 'px-4'
              } ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && 'Settings'}
          </NavLink>
        </nav>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={openMobile}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900">
                {meta.title}
              </h1>
              <p className="truncate text-xs text-slate-500">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search bookings, users…"
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#0056FF] focus:bg-white focus:ring-2 focus:ring-[#0056FF]/15"
              />
            </div>

            {/* ================= NOTIFICATIONS ================= */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  const opening = !isNotificationsOpen;

                  setIsNotificationsOpen(opening);
                  setIsProfileOpen(false);

                  if (opening) {
                    setIsLoadingNotifications(true);
                    setNotificationError('');
                    loadNotifications();
                  }
                }}
                aria-label={
                  unreadNotifications
                    ? `Notifications (${unreadNotifications} unread)`
                    : 'Notifications'
                }
                aria-haspopup="menu"
                aria-expanded={isNotificationsOpen}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <Bell className="h-5 w-5" />

                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  role="menu"
                  aria-label="Notifications"
                  className="absolute right-0 z-30 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] animate-scale-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">
                      Notifications
                    </p>
                    <span className="text-xs text-slate-500">
                      {notificationTotal} total
                    </span>
                  </div>

                  {notificationError && (
                    <p role="alert" className="px-4 py-3 text-xs text-red-600">
                      {notificationError}
                    </p>
                  )}

                  {isLoadingNotifications ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading notifications…
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    <>
                      <ul className="max-h-80 overflow-y-auto py-1">
                        {notifications.map((notification) => {
                          const userName = [
                            notification.user?.firstName,
                            notification.user?.lastName,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                            notification.user?.email ||
                            'Unknown user';

                          return (
                            <li
                              key={notification._id}
                              className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 last:border-0 ${
                                notification.adminIsRead ? 'opacity-70' : ''
                              }`}
                            >
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0056FF]">
                                <Bell className="h-4 w-4" />
                              </span>

                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800">
                                    {notification.title}
                                  </span>

                                  {!notification.adminIsRead && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#0056FF]" />
                                  )}
                                </span>

                                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                  {notification.message}
                                </span>

                                <span className="mt-1 block text-[10px] font-medium text-slate-500">
                                  To: {userName}
                                </span>

                                <span className="block text-[10px] font-medium text-slate-400">
                                  {notification.createdAtLabel} ·{' '}
                                  {notification.adminIsRead ? 'Read' : 'Unread'}
                                </span>

                                {!notification.adminIsRead && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markNotificationRead(notification._id)
                                    }
                                    disabled={
                                      markingNotificationId === notification._id
                                    }
                                    className="mt-2 text-xs font-semibold text-[#0056FF] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {markingNotificationId === notification._id
                                      ? 'Marking...'
                                      : 'Mark as Read'}
                                  </button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      {notifications.length < notificationTotal && (
                        <button
                          type="button"
                          onClick={loadMoreNotifications}
                          disabled={isLoadingMoreNotifications}
                          className="w-full border-t border-slate-100 px-4 py-3 text-xs font-semibold text-[#0056FF] hover:bg-slate-50 disabled:text-slate-400"
                        >
                          {isLoadingMoreNotifications
                            ? 'Loading…'
                            : 'Load older notifications'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ================= PROFILE ================= */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-xl p-1 pr-2 transition-colors hover:bg-slate-100"
              >
                <Avatar
                  user={user ?? { name: 'Administrator' }}
                  className="h-9 w-9 border border-slate-200"
                  textClass="text-xs"
                />

                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-tight text-slate-800">
                    {user?.name ?? 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {user?.title ?? 'Administrator'}
                  </p>
                </div>

                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-100 bg-white py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] animate-scale-in">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">
                      {user?.name ?? 'Administrator'}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user?.email ?? 'admin@layagexpres.com'}
                    </p>

                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0056FF]">
                      <ShieldCheck className="h-3 w-3" /> Admin access
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 px-4 py-4 text-xs text-slate-400 md:px-8">
          LayagExpress Admin Console · © 2026
        </footer>
      </div>
    </div>
  );
}
