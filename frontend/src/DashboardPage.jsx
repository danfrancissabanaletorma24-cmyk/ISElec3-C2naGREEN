// src/DashboardPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, MapPin, Ship, XCircle } from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import { useAuth } from './auth/AuthContext';
import SearchWidget from './customer/SearchWidget';
import Toast from './customer/Toast';
import CancelTripDialog from './customer/CancelTripDialog';
import RescheduleTripDialog from './customer/RescheduleTripDialog';
import LiveVoyageCard from './customer/LiveVoyageCard';
import { buildSearchParams, valuesFromSearchParams } from './customer/searchValues';
import {
  getDestination, getShipTypeLabel, formatISODate,
} from './data/customerData';
import { apiRequest } from './api';
import useMyBookings from './hooks/useMyBookings';
import usePopularRoutes from './hooks/usePopularRoutes';
import { LIFT, STAGGER } from './components/motion';

const HERO_IMG = '/ships/kho-roro.jpg';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState(() => valuesFromSearchParams(searchParams));
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [toast, setToast] = useState('');

  const { bookings: tickets, error: loadError, reload } = useMyBookings();
  const { routes: POPULAR_ROUTES } = usePopularRoutes(30);
  const dashboardTickets = tickets.filter(
    (ticket) => ticket.status === 'upcoming' || ticket.status === 'cancelled',
  );
  const liveTicket = tickets.find((ticket) => ticket.status === 'upcoming' && !ticket.needsReschedule) ?? null;

  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const displayName = user?.name || 'Traveler';

  const handleRescheduled = (message) => {
    setRescheduleTarget(null);
    setToast(message);
    reload();
  };

  const handleConfirmCancel = async (reason) => {
    if (!cancelTarget) return;
    try {
      await apiRequest(`/bookings/${cancelTarget.id}/cancel`, { token, method: 'PATCH', body: { reason } });
      setToast(cancelTarget.paid
        ? `Trip ${cancelTarget.bookingRef} cancelled. Your refund of ₱${cancelTarget.price.toLocaleString()} is being processed.`
        : `Trip ${cancelTarget.bookingRef} cancelled.`);
      setCancelTarget(null);
      reload();
    } catch (error) {
      setToast(error.message);
      setCancelTarget(null);
    }
  };

  const routeLink = (route) =>
    `/search?${buildSearchParams({
      ...values,
      tripType: 'one-way',
      from: route.from,
      to: route.to,
      shipType: route.shipType,
    })}`;

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      
      {/* ================= SIDEBAR ================= */}
      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex flex-1 flex-col">
        
        {/* Top Header */}
        <CustomerHeader
          title="Dashboard"
          subtitle="Your trips, tickets and quick actions"
          onOpenMenu={openMobile}
        />
        
        <div className="px-4 md:px-8 pb-10 w-full max-w-[1280px] mx-auto">
          
          {/* Hero Section */}
          <div className="relative bg-gradient-to-r from-[#D4E6FF] to-[#E8F1FF] rounded-3xl p-10 h-[220px] flex items-center overflow-hidden mb-8">
            <div className="relative z-10 max-w-sm">
              <h1 className="text-3xl font-bold text-[#1E3A8A] leading-tight mb-2">Good morning,<br/>{displayName} 👋</h1>
              <p className="text-slate-600 text-sm">Where will your next journey take you?<br/>Book your ferry tickets with ease.</p>
            </div>
            
            <img 
              src={HERO_IMG} 
              alt="Ferry" 
              className="absolute right-0 bottom-0 h-[120%] w-[85%] lg:w-[70%] object-cover object-left z-0 [mask-image:linear-gradient(to_right,transparent,black_40%)]" 
            />
          </div>

          {/* ================= SEARCH WIDGET ================= */}
          <SearchWidget
            values={values}
            onChange={setValues}
            onSearch={(query) => navigate(`/search?${query}`)}
            className="mb-8"
          />

          {/* ================= LIVE VOYAGE MAP ================= */}
          <LiveVoyageCard ticket={liveTicket} />

          {/* ================= CONTENT GRID ================= */}
          <div className="grid grid-cols-1 gap-6">
            
            <div className="space-y-6 w-full">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#0056FF]" /> Your Trips
                  </h2>
                  <Link to="/bookings" className="text-sm font-medium text-[#0056FF] hover:underline">View All Bookings →</Link>
                </div>
                
                {loadError && (
                  <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not load your bookings: {loadError}</p>
                )}
                {dashboardTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No trips yet</p>
                    <p className="mt-1 text-xs text-slate-500">Book a ferry and your trip will appear here.</p>
                    <Link to="/search" className="mt-4 inline-block rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
                      Search Trips
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardTickets.map((ticket) => {
                      const from = getDestination(ticket.from);
                      const to = getDestination(ticket.to);
                      const isCancelled = ticket.status === 'cancelled';
                      return (
                        <div
                          key={ticket.id}
                          className={`flex flex-col md:flex-row items-center gap-6 rounded-xl p-4 border ${
                            isCancelled ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={ticket.image}
                            alt={ticket.ship}
                            className={`w-full md:w-32 h-20 rounded-lg object-cover ${isCancelled ? 'grayscale' : ''}`}
                          />
                          <div className="flex-1 w-full">
                            <h3 className="font-bold text-base mb-1">{from.city} → {to.city}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1">
                              <CalendarDays className="w-4 h-4" /> {formatISODate(ticket.date)} at {ticket.departure}
                            </p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5">
                              <Ship className="w-4 h-4" /> {ticket.ship} • {ticket.seatClass} Class
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                                isCancelled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                              }`}>
                                {isCancelled ? 'Cancelled' : ticket.needsReschedule ? 'Trip cancelled by operator' : ticket.awaitingPayment ? 'Awaiting payment' : 'Confirmed'}
                              </span>
                              {isCancelled && ticket.refundStatus && (
                                <span className="text-xs font-medium text-red-600">
                                  {ticket.refundStatus === 'pending'
                                    ? `Refund of ₱${ticket.price.toLocaleString()} is being processed.`
                                    : `Refund of ₱${ticket.price.toLocaleString()} completed.`}
                                </span>
                              )}
                              {ticket.needsReschedule && (
                                <span className="text-xs font-medium text-amber-700">
                                  {ticket.tripCancelReason ? `${ticket.tripCancelReason}. ` : ''}Reschedule or cancel for a refund.
                                </span>
                              )}
                            </div>
                            {isCancelled && ticket.cancelReason && (
                              <p className="mt-1 text-xs text-slate-500">Reason: {ticket.cancelReason}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                            <Link
                              to={isCancelled ? '/tickets?tab=cancelled' : '/tickets'}
                              className="w-full md:w-auto border border-[#0056FF] text-[#0056FF] px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors text-center"
                            >
                              View Ticket
                            </Link>
                            {isCancelled ? (
                              <Link to="/search" className="text-sm text-[#0056FF] hover:underline">Book Again</Link>
                            ) : (
                              <>
                                <Link to={`/bookings/${ticket.id}`} className="text-sm text-[#0056FF] hover:underline">Manage Booking</Link>
                                {(ticket.canReschedule || ticket.needsReschedule) && (
                                  <button
                                    type="button"
                                    onClick={() => setRescheduleTarget(ticket)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50 md:w-auto"
                                  >
                                    <CalendarClock className="h-4 w-4" /> Reschedule
                                  </button>
                                )}
                                {(ticket.canCancel || ticket.needsReschedule) && (
                                  <button
                                    type="button"
                                    onClick={() => setCancelTarget(ticket)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 md:w-auto"
                                  >
                                    <XCircle className="h-4 w-4" /> Cancel Trip
                                  </button>
                                )}
                                {ticket.cancelLockedReason && (
                                  <p className="max-w-[12rem] text-center text-[11px] text-slate-400 md:text-right">{ticket.cancelLockedReason}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#0056FF]" /> Popular Routes
                  </h2>
                  <Link to="/find-ships" className="text-sm font-medium text-[#0056FF] hover:underline">View All Routes →</Link>
                </div>
                
                {POPULAR_ROUTES.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No upcoming sailings are scheduled yet.</p>
                )}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${STAGGER}`}>
                  {POPULAR_ROUTES.map((route) => {
                    const from = getDestination(route.from);
                    const to = getDestination(route.to);
                    return (
                      <Link
                        key={`${route.from}-${route.to}`}
                        to={routeLink(route)}
                        className={`border border-slate-200 rounded-xl overflow-hidden group cursor-pointer hover:border-[#0056FF]/50 ${LIFT}`}
                      >
                        <div className="relative h-24">
                          <img src={route.image || HERO_IMG} alt={`${from.city} to ${to.city}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <span className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] font-bold shadow-sm">{getShipTypeLabel(route.shipType)}</span>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm mb-1">{from.city} → {to.city}</h4>
                          <p className="text-xs text-slate-500">
                            {route.duration && `${route.duration} • `}
                            {route.price == null
                              ? 'No upcoming sailing'
                              : `From ₱${route.price.toLocaleString()} / person`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {rescheduleTarget && (
        <RescheduleTripDialog
          trip={rescheduleTarget}
          open
          onClose={() => setRescheduleTarget(null)}
          onDone={handleRescheduled}
        />
      )}

      <CancelTripDialog
        ticket={cancelTarget}
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}