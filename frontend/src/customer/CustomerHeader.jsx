import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, User, Settings, LogOut, Ticket, CreditCard, Ship } from 'lucide-react';
import { apiRequest } from '../api';
import Avatar from './Avatar';
import { useAuth } from '../auth/AuthContext';
import useDismiss from './useDismiss';

const TYPE_ICONS = { booking: Ticket, payment: CreditCard, trip: Ship, system: Bell };

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

export default function CustomerHeader({ title, subtitle, onOpenMenu }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const closeNotifications = () => setIsNotificationsOpen(false);
  const notificationsRef = useDismiss(isNotificationsOpen, closeNotifications);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((value) => !value);
    setIsProfileOpen(false);
  };

  const loadNotifications = async () => {
    try {
      const result = await apiRequest('/notifications/my', { token });
      setNotifications((result.data || []).map((item) => ({
        id: item._id,
        title: item.title,
        body: item.message,
        time: timeAgo(item.createdAt),
        icon: TYPE_ICONS[item.type] || Bell,
        read: item.isRead,
      })));
    } catch {
      /* keep the last list; the bell is not worth an error banner */
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleMarkAllRead = async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    try { await apiRequest('/notifications/read-all', { token, method: 'PATCH' }); } catch { loadNotifications(); }
  };

  const handleReadNotification = async (id) => {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
    try { await apiRequest(`/notifications/${id}/read`, { token, method: 'PATCH' }); } catch { loadNotifications(); }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.firstName || 'Traveler';
  const displayEmail = user?.email || '';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            aria-label={
              unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'
            }
            aria-haspopup="menu"
            aria-expanded={isNotificationsOpen}
            className="relative p-1 text-slate-500 transition-colors hover:text-slate-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                {unreadCount}
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
                <p className="text-sm font-bold text-slate-800">Notifications</p>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-xs font-semibold text-[#0056FF] transition-colors hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                >
                  Mark all as read
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {notifications.map((notification) => {
                    const Icon = notification.icon;
                    return (
                      <li key={notification.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleReadNotification(notification.id)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                            notification.read ? 'opacity-70' : ''
                          }`}
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0056FF]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#0056FF]" />
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                              {notification.body}
                            </span>
                            <span className="mt-1 block text-[10px] font-medium text-slate-400">
                              {notification.time}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((value) => !value);
              setIsNotificationsOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 text-left transition-colors hover:bg-slate-100 sm:gap-3 sm:pr-2"
          >
            <Avatar user={user} className="h-9 w-9 border-2 border-transparent" />
            <span className="hidden text-sm font-semibold text-slate-700 sm:block">{displayName}</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                isProfileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isProfileOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-3 w-56 rounded-xl border border-slate-100 bg-white py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] animate-scale-in"
            >
              <div className="mb-1 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{displayEmail}</p>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User className="h-4 w-4 text-slate-400" /> My Profile
              </Link>
              <Link
                to="/settings"
                role="menuitem"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" /> Account Settings
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
