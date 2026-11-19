// src/admin/AdminDashboardPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Clock, MapPin, Ship, TrendingUp, Users } from 'lucide-react';
import {
  currency,
} from '../data/adminData';
import { formatISODate } from '../data/customerData';
import { useSchedules } from '../data/scheduleStore';
import { useVessels } from '../data/vesselStore';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import ProgressBar from './components/ProgressBar';
import { AreaChart } from './components/Charts';
import { useAuth } from '../auth/AuthContext';
import { buildAdminRouteMetrics, loadAllAdminBookings } from './adminBookingData';
import { apiRequest } from '../api';

const BOOKING_STATUSES = [
  { label: 'Confirmed', color: '#10B981' },
  { label: 'Pending', color: '#F59E0B' },
  { label: 'Reschedule pending', color: '#0056FF' },
  { label: 'Cancelled', color: '#EF4444' },
];

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
];

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const schedules = useSchedules();
  const vessels = useVessels();
  const [range, setRange] = useState(7);
  const [bookings, setBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [activeVessels, setActiveVessels] = useState(null);
  const [statsError, setStatsError] = useState('');
  const upcomingDepartures = useMemo(
    () => schedules.map((schedule) => {
      const vessel = vessels.find((item) => (
        item.id === schedule.vesselId || item.name === schedule.vessel
      ));
      return {
        ...schedule,
        vessel: vessel?.name ?? schedule.vessel,
        route: vessel?.route ?? schedule.route,
        status: vessel?.status === 'Maintenance'
          ? vessel.status
          : schedule.status ?? vessel?.status ?? 'Active',
        sold: vessel?.sold ?? schedule.sold ?? 0,
        capacity: vessel?.capacity ?? schedule.capacity ?? 0,
      };
    }),
    [schedules, vessels],
  );

  useEffect(() => {
    let active = true;
    setIsLoadingBookings(true);
    setBookingsError('');

    loadAllAdminBookings(token)
      .then((items) => {
        if (active) setBookings(items);
      })
      .catch((error) => {
        if (active) setBookingsError(error.message);
      })
      .finally(() => {
        if (active) setIsLoadingBookings(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    setStatsError('');
    apiRequest('/admin/stats', { token })
      .then((stats) => {
        if (active) setActiveVessels(stats.activeBoats);
      })
      .catch((error) => {
        if (active) setStatsError(error.message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const statusBreakdown = useMemo(
    () => BOOKING_STATUSES.map((status) => ({
      ...status,
      value: bookings.filter((booking) => booking.status === status.label).length,
    })),
    [bookings],
  );
  const revenueSeries = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - range + 1);
    start.setHours(0, 0, 0, 0);
    const series = Array.from({ length: range }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
        bookings: 0,
      };
    });

    bookings.forEach((booking) => {
      if (booking.paymentStatus !== 'paid' || !booking.createdAt) return;
      const createdAt = new Date(booking.createdAt);
      const index = Math.floor((createdAt - start) / 86400000);
      if (index >= 0 && index < series.length) {
        series[index].value += booking.amount;
        series[index].bookings += 1;
      }
    });
    return series;
  }, [bookings, range]);
  const totalBookings = bookings.length;
  const revenueTotal = revenueSeries.reduce((sum, item) => sum + item.value, 0);
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(currentPeriodStart.getDate() - range + 1);
  currentPeriodStart.setHours(0, 0, 0, 0);
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - range);
  const currentPeriodBookings = bookings.filter((booking) => new Date(booking.createdAt) >= currentPeriodStart);
  const previousPeriodBookings = bookings.filter((booking) => {
    const createdAt = new Date(booking.createdAt);
    return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
  });
  const paidRevenue = (items) => items.reduce(
    (sum, booking) => sum + (booking.paymentStatus === 'paid' ? booking.amount : 0),
    0,
  );
  const uniqueBookers = (items) => new Set(items.map((booking) => booking.userId).filter(Boolean)).size;
  const deltaPercent = (current, previous) => (
    previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0
  );
  const periodHint = `vs. previous ${range} days`;
  const dashboardKpis = [
    {
      id: 'bookings',
      label: 'Bookings',
      value: currentPeriodBookings.length.toLocaleString(),
      delta: deltaPercent(currentPeriodBookings.length, previousPeriodBookings.length),
      hint: periodHint,
      icon: 'ticket',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: currency(paidRevenue(currentPeriodBookings)),
      delta: deltaPercent(paidRevenue(currentPeriodBookings), paidRevenue(previousPeriodBookings)),
      hint: periodHint,
      icon: 'revenue',
    },
    {
      id: 'passengers',
      label: 'Passengers',
      value: uniqueBookers(currentPeriodBookings).toLocaleString(),
      delta: deltaPercent(uniqueBookers(currentPeriodBookings), uniqueBookers(previousPeriodBookings)),
      hint: periodHint,
      icon: 'passengers',
    },
    {
      id: 'vessels',
      label: 'Vessels',
      value: activeVessels ?? '—',
      delta: 0,
      hint: statsError || 'Active vessels',
      icon: 'vessels',
    },
  ];
  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [bookings],
  );
  const popularRoutes = useMemo(
    () => buildAdminRouteMetrics(bookings).slice(0, 4),
    [bookings],
  );
  const firstName = (user?.name ?? 'Admin').split(' ')[0];
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h2 className="text-2xl font-bold text-slate-900">{firstName} 👋</h2>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 md:self-auto">
          <CalendarDays className="h-4 w-4 text-[#0056FF]" />
          {today}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
          <StatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Revenue + status */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 md:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue overview</h3>
              <p className="mt-1 text-xs text-slate-500">
                {currency(revenueTotal)} collected in the selected period
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {RANGES.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setRange(option.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    range === option.key ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <AreaChart data={revenueSeries} valueFormat={(value) => currency(value)} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Booking status</h3>
            <span className="text-xs text-slate-400">{totalBookings} total</span>
          </div>
          <div className="space-y-5">
            {statusBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span
                      className="h-2 w-2 rounded-full bg-[var(--dot-color)]"
                      style={{ '--dot-color': item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="text-slate-500">
                    {item.value}
                    <span className="ml-1 text-xs text-slate-400">
                      ({totalBookings ? Math.round((item.value / totalBookings) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <ProgressBar value={item.value} max={totalBookings} color={item.color} />
              </div>
            ))}
          </div>
          <Link
            to="/admin/bookings"
            className="mt-6 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
          >
            Manage bookings <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent bookings + upcoming departures */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
            <h3 className="text-base font-bold text-slate-900">Recent bookings</h3>
            <Link to="/admin/bookings" className="flex items-center gap-1 text-sm font-semibold text-[#0056FF] hover:underline">
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold md:px-6">Booking</th>
                  <th className="px-3 py-3 font-semibold">Passenger</th>
                  <th className="px-3 py-3 font-semibold">Route</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold md:px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                  {isLoadingBookings && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Loading bookings…</td></tr>
                  )}
                  {!isLoadingBookings && bookingsError && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-red-600">Could not load bookings: {bookingsError}</td></tr>
                  )}
                  {!isLoadingBookings && !bookingsError && recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-semibold text-slate-800 md:px-6">{booking.bookingRef}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-medium text-slate-700">{booking.passenger}</p>
                      <p className="text-xs text-slate-400">{booking.bookedAt}</p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{booking.route}</td>
                    <td className="px-3 py-3.5 font-semibold text-slate-800">{currency(booking.amount)}</td>
                    <td className="px-5 py-3.5 text-right md:px-6">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
                {!isLoadingBookings && !bookingsError && recentBookings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
            <h3 className="text-base font-bold text-slate-900">Upcoming departures</h3>
            <Link to="/admin/vessels" className="text-sm font-semibold text-[#0056FF] hover:underline">
              Fleet
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingDepartures.map((departure) => (
              <div key={departure.id} className="px-5 py-4 md:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                      <Ship className="h-3.5 w-3.5 shrink-0 text-[#0056FF]" />
                      {departure.vessel}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" /> {departure.route}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3 w-3 shrink-0" /> {departure.departure} · {departure.arrival}
                    </p>
                    {departure.date && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="h-3 w-3 shrink-0" /> {formatISODate(departure.date)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={departure.status} />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {departure.sold} / {departure.capacity} seats
                    </span>
                    <span>
                      {departure.capacity
                        ? Math.round((departure.sold / departure.capacity) * 100)
                        : 0}%
                    </span>
                  </div>
                  <ProgressBar value={departure.sold} max={departure.capacity} />
                </div>
              </div>
            ))}
            {upcomingDepartures.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No upcoming departures scheduled.</p>
            )}
          </div>
        </div>
      </div>

      {/* Popular routes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Popular routes</h3>
          <Link to="/admin/reports" className="flex items-center gap-1 text-sm font-semibold text-[#0056FF] hover:underline">
            Full report <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoadingBookings ? (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">Loading popular routes…</p>
          ) : bookingsError ? (
            <p role="alert" className="col-span-full py-8 text-center text-sm text-red-600">
              Could not load popular routes: {bookingsError}
            </p>
          ) : popularRoutes.length ? popularRoutes.map((route) => (
            <div key={route.route} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#0056FF]/40">
              <p className="text-sm font-semibold text-slate-800">{route.route}</p>
              <p className="mt-1 text-xs text-slate-500">{route.bookings.toLocaleString()} bookings</p>
              <p className="mt-3 text-lg font-bold text-slate-900">{currency(route.revenue)}</p>
              <div className="mt-3 flex items-center gap-2">
                <ProgressBar value={route.share} max={100} className="flex-1" />
                <span className="text-[11px] font-semibold text-slate-500">{route.share}%</span>
              </div>
            </div>
          )) : (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">No route bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
