// src/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { valuesFromSearchParams } from './customer/searchValues';
import { apiRequest, mapBookingToTicket } from './api';
import {
  POPULAR_ROUTES, getDestination, getShipTypeLabel, formatISODate,
} from './data/customerData';
import { cancelTicket, rescheduleTicket, useTickets } from './data/ticketStore';
import { LIFT, STAGGER } from './components/motion';

const HERO_IMG = '/supercat.jpg';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState(() => valuesFromSearchParams(searchParams));
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [serverTickets, setServerTickets] = useState([]);
  const [serverError, setServerError] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  const demoTickets = useTickets(user?.email);
  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    apiRequest('/bookings/my', { token })
      .then((result) => {
        if (active) {
          setServerTickets((result.data || []).map(mapBookingToTicket));
          setServerError('');
        }
      })
      .catch((error) => {
        if (active) setServerError(error.message);
      });
    return () => { active = false; };
  }, [token]);

  const tickets = token ? serverTickets : demoTickets;
  const dashboardTickets = tickets.filter(
    (ticket) => ticket.status === 'upcoming' || ticket.status === 'cancelled',
  );
  const liveTicket = tickets.find((ticket) => ticket.status === 'upcoming') ?? null;

  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const displayName = user?.name || 'Traveler';

  const handleConfirmReschedule = (patch) => {
    if (!rescheduleTarget) return;
    if (token) {
      setToast('Rescheduling a server booking must be completed from the available trip options.');
      setRescheduleTarget(null);
      return;
    }
    rescheduleTicket(user.email, rescheduleTarget.id, patch);
    setToast(`Trip ${rescheduleTarget.bookingRef} moved to ${formatISODate(patch.date)} at ${patch.departure}.`);
    setRescheduleTarget(null);
  };

  const handleConfirmCancel = async (reason) => {
    if (!cancelTarget) return;
    try {
      if (token) {
        await apiRequest(`/bookings/${cancelTarget.id}/cancel`, {
          token,
          method: 'PATCH',
          body: { reason },
        });
        const result = await apiRequest('/bookings/my', { token });
        setServerTickets((result.data || []).map(mapBookingToTicket));
      } else {
        cancelTicket(user.email, cancelTarget.id, reason);
      }
      setToast(`Trip ${cancelTarget.bookingRef} cancelled. Refund of ₱${cancelTarget.price.toLocaleString()} is being processed.`);
      setCancelTarget(null);
    } catch (error) {
      setToast(error.message);
    }
  };

  const pickRoute = (route) =>
    setValues((current) => ({
      ...current,
      tripType: 'one-way',
      from: route.from,
      to: route.to,
      shipType: route.shipType,
    }));

  const handleSearchTrips = async (queryString) => {
    const params = new URLSearchParams(queryString);
    const tripType = params.get('tripType');
    const legs = [{
      label: 'Outbound',
      from: params.get('from'),
      to: params.get('to'),
      date: params.get('date'),
    }];
    if (tripType === 'round-trip') {
      legs.push({
        label: 'Return',
        from: params.get('to'),
        to: params.get('from'),
        date: params.get('returnDate'),
      });
    } else if (tripType === 'multi-city') {
      legs.push({
        label: 'Second leg',
        from: params.get('legFrom'),
        to: params.get('legTo'),
        date: params.get('legDate'),
      });
    }

    setSearching(true);
    setSearchError('');
    setSearchResults(null);
    try {
      const results = await Promise.all(legs.map(async (leg) => {
        const query = new URLSearchParams({
          origin: leg.from,
          destination: leg.to,
          date: leg.date,
          status: 'scheduled',
          limit: '100',
        });
        const response = await apiRequest(`/trips?${query}`);
        const matchingTrips = (response.data || []).filter((trip) => {
          const selectedType = params.get('shipType');
          if (!selectedType || selectedType === 'any') return true;
          if (selectedType === 'cargo') return trip.cargoRatePerKg > 0;
          const actualType = String(trip.boat?.boatType || '').toLowerCase().replace(/[-_\s]/g, '');
          const expectedType = selectedType.toLowerCase().replace(/[-_\s]/g, '');
          return actualType === expectedType;
        });
        return { ...leg, trips: matchingTrips };
      }));
      setSearchResults(results);
    } catch (error) {
      setSearchError(error.message);
    } finally {
      setSearching(false);
    }
  };

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
            onSearch={handleSearchTrips}
            className="mb-8"
          />
          {searching && (
            <p role="status" className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              Searching available ships…
            </p>
          )}
          {searchError && (
            <p role="alert" className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not search trips: {searchError}
            </p>
          )}
          {searchResults && (
            <section aria-label="Trip search results" className="mb-8 space-y-5">
              {searchResults.map((leg) => (
                <div key={`${leg.label}-${leg.from}-${leg.to}-${leg.date}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">
                    {leg.label}: {getDestination(leg.from).city} → {getDestination(leg.to).city}
                    <span className="ml-2 text-sm font-medium text-slate-500">{formatISODate(leg.date)}</span>
                  </h2>
                  {leg.trips.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                      No ships are available for this route and date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {leg.trips.map((trip) => {
                        const departureAt = new Date(trip.departureAt);
                        const arrivalAt = new Date(trip.arrivalAt);
                        const fares = Object.entries(trip.fares || {}).filter(([, fare]) => Number(fare) > 0);
                        const lowestFare = fares.length
                          ? Math.min(...fares.map(([, fare]) => Number(fare)))
                          : null;
                        return (
                          <article key={trip._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900">{trip.boat?.name || 'Ferry'}</h3>
                              <p className="mt-1 text-sm text-slate-600">
                                {departureAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {' – '}
                                {arrivalAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {' · '}
                                {trip.boat?.boatType || 'Ferry'}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">
                              {lowestFare === null ? 'Fare unavailable' : `From ₱${lowestFare.toLocaleString()} / person`}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

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
                </div>
                {serverError && (
                  <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    Could not load your bookings: {serverError}
                  </p>
                )}
                
                {dashboardTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No trips yet</p>
                    <p className="mt-1 text-xs text-slate-500">Book a ferry and your trip will appear here.</p>
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
                              src={HERO_IMG}
                              alt={ticket.ship}
                              className={`w-full md:w-32 h-20 rounded-lg object-cover ${isCancelled ? 'grayscale' : ''}`}
                            />
                            <div className="flex-1 w-full">
                              <h3 className="font-bold text-base mb-1">{from.city} → {to.city}</h3>
                              <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1">
                                <CalendarDays className="w-4 h-4" /> {formatISODate(ticket.date)} • {ticket.departure}
                              </p>
                              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                <Ship className="w-4 h-4" /> {ticket.ship} • {ticket.seatClass} Class
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                                  isCancelled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                                }`}>
                                  {isCancelled ? 'Cancelled' : 'Confirmed'}
                                </span>
                                {isCancelled && (
                                  <span className="text-xs font-medium text-red-600">
                                    Refund of ₱{ticket.price.toLocaleString()} is being processed.
                                  </span>
                                )}
                              </div>
                              {isCancelled && ticket.cancelReason && (
                                <p className="mt-1 text-xs text-slate-500">Reason: {ticket.cancelReason}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                              {!isCancelled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRescheduleTarget(ticket)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50 md:w-auto"
                                  >
                                    <CalendarClock className="h-4 w-4" /> Reschedule
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCancelTarget(ticket)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 md:w-auto"
                                  >
                                    <XCircle className="h-4 w-4" /> Cancel Trip
                                  </button>
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
                </div>
                
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${STAGGER}`}>
                  {POPULAR_ROUTES.map((route) => {
                    const from = getDestination(route.from);
                    const to = getDestination(route.to);
                    return (
                      <button
                        type="button"
                        key={`${route.from}-${route.to}`}
                        onClick={() => pickRoute(route)}
                        className={`border border-slate-200 rounded-xl overflow-hidden group cursor-pointer text-left hover:border-[#0056FF]/50 ${LIFT}`}
                      >
                        <div className="relative h-24">
                          <img src={HERO_IMG} alt={`${from.city} to ${to.city}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <span className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] font-bold shadow-sm">{getShipTypeLabel(route.shipType)}</span>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm mb-1">{from.city} → {to.city}</h4>
                          <p className="text-xs text-slate-500">{route.duration} • From ₱{route.price} / person</p>
                        </div>
                      </button>
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
          onConfirm={handleConfirmReschedule}
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
