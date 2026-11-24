// src/MyBookingsPage.jsx  -  every booking of the signed-in person
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Package, Search, Ship } from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import useMyBookings from './hooks/useMyBookings';
import { useCurrency } from './currency/CurrencyContext';
import { getDestination, formatISODate } from './data/customerData';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function statusBadge(booking) {
  if (booking.refundStatus === 'refunded') return { label: 'Refunded', style: 'bg-emerald-100 text-emerald-700' };
  if (booking.status === 'cancelled') return { label: 'Cancelled', style: 'bg-red-100 text-red-700' };
  if (booking.needsReschedule) return { label: 'Trip cancelled by operator', style: 'bg-amber-100 text-amber-800' };
  if (booking.awaitingPayment) return { label: 'Awaiting payment', style: 'bg-amber-100 text-amber-800' };
  if (booking.status === 'past') return { label: 'Completed', style: 'bg-slate-100 text-slate-700' };
  return { label: 'Confirmed', style: 'bg-green-100 text-green-800' };
}

export default function MyBookingsPage() {
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });
  const { format } = useCurrency();
  const { bookings, loading, error } = useMyBookings();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => bookings.filter((booking) => {
    if (filter !== 'all' && booking.status !== filter) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return [booking.bookingRef, booking.ship, getDestination(booking.from).city, getDestination(booking.to).city]
      .some((value) => String(value).toLowerCase().includes(text));
  }), [bookings, filter, query]);

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      <CustomerSidebar open={mobileOpen} onClose={closeMobile} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <main className="flex flex-1 flex-col">
        <CustomerHeader title="My Bookings" subtitle="Your trips, payments and booking history" onOpenMenu={openMobile} />

        <div className="px-4 md:px-8 pb-10 w-full max-w-[1100px] mx-auto">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">My Bookings</h1>
              <p className="text-sm text-slate-500">Open a booking to pay, see its invoice, reschedule or cancel.</p>
            </div>
            <Link to="/find-ships" className="self-start rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 md:translate-y-2">
              Book a Trip
            </Link>
          </div>

          <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Booking filters">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${filter === item.id ? 'bg-[#0056FF] font-semibold text-white' : 'font-medium text-slate-500 hover:bg-slate-50'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reference, ship or port"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20 md:w-72"
              />
            </label>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not load your bookings: {error}</p>}
          {loading && <p className="text-sm text-slate-500">Loading your bookings…</p>}

          {!loading && visible.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <h2 className="mb-1 text-lg font-bold text-slate-900">No bookings here</h2>
              <p className="text-sm text-slate-500">{bookings.length === 0 ? 'Book your first trip and it will show up here.' : 'Try another filter or search.'}</p>
            </div>
          )}

          <div className="space-y-4">
            {visible.map((booking) => {
              const badge = statusBadge(booking);
              const from = getDestination(booking.from);
              const to = getDestination(booking.to);
              return (
                <Link
                  key={booking.id}
                  to={`/bookings/${booking.id}`}
                  className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#0056FF]/40 hover:shadow-md md:flex-row"
                >
                  <img src={booking.image} alt={booking.ship} className={`h-20 w-full rounded-lg object-cover md:w-32 ${booking.status === 'cancelled' ? 'grayscale' : ''}`} />
                  <div className="w-full flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{from.city} → {to.city}</h3>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${badge.style}`}>{badge.label}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays className="h-4 w-4" /> {formatISODate(booking.date)} • {booking.departure}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-500">
                      {booking.bookingType === 'cargo' ? <Package className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
                      {booking.ship} • {booking.bookingType === 'cargo' ? booking.passenger : `${booking.seats.length} seat${booking.seats.length === 1 ? '' : 's'} (${booking.seats.join(', ')})`}
                    </p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-lg font-bold text-[#0056FF]">{format(booking.price)}</p>
                    <p className="text-xs text-slate-400">{booking.bookingRef}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
