import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, MapPin, Navigation, Ship } from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import VoyageMapLazy from './customer/VoyageMapLazy';
import useMyBookings from './hooks/useMyBookings';
import {
  formatDurationMinutes,
  getPathDistance,
  getRoutePath,
  getVoyageState,
  getVoyageStatusLabel,
} from './data/geo';
import {
  formatISODate,
  getDestination,
  getShipTypeLabel,
} from './data/customerData';

export default function MapPage() {
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const { bookings: tickets, loading, error } = useMyBookings();

  const routeOptions = useMemo(() => {
    return tickets
      .filter((ticket) => ticket.status !== 'cancelled' && ticket.from && ticket.to)
      .map((ticket) => ({
        key: ticket.id,
        from: ticket.from,
        to: ticket.to,
        duration: ticket.arrival ? `${ticket.departure} – ${ticket.arrival}` : 'Scheduled',
        shipType: ticket.shipType,
        ticket,
      }));
  }, [tickets]);

  const [selectedKey, setSelectedKey] = useState(null);
  const selectedRoute =
    routeOptions.find((route) => route.key === (selectedKey ?? routeOptions[0]?.key)) ?? routeOptions[0];

  const path = useMemo(
    () => (selectedRoute ? getRoutePath(selectedRoute.from, selectedRoute.to) : []),
    [selectedRoute],
  );
  const distanceKm = useMemo(() => Math.round(getPathDistance(path)), [path]);

  const liveTicket = selectedRoute?.ticket;
  const matchesLiveTicket = liveTicket?.status === 'upcoming' && !liveTicket.needsReschedule;

  const voyageState = matchesLiveTicket ? getVoyageState(liveTicket) : null;
  const progress = voyageState?.progress ?? (liveTicket?.status === 'past' ? 1 : 0);
  const statusLabel = voyageState
    ? getVoyageStatusLabel(voyageState)
    : liveTicket?.needsReschedule
      ? 'Reschedule needed'
      : 'Past trip';
  const shipName = liveTicket?.ship || 'LayagExpress vessel';

  const from = selectedRoute ? getDestination(selectedRoute.from) : null;
  const to = selectedRoute ? getDestination(selectedRoute.to) : null;

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        highlight="/map"
      />

      <main className="flex flex-1 flex-col">
        <CustomerHeader
          title="Map & Routes"
          subtitle="See the routes for trips you have booked"
          onOpenMenu={openMobile}
        />

        <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <MapPin className="h-6 w-6 text-[#0056FF]" /> Sea Routes
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Pick a route to see the sea crossing and track your vessel.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your booked routes…</p>
          ) : error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          ) : routeOptions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Ship className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-900">No booked trips yet</h2>
              <p className="mt-1 text-sm text-slate-500">Your booked trip routes will appear here.</p>
              <Link to="/find-ships" className="mt-4 inline-block rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Find a trip
              </Link>
            </div>
          ) : (
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            {/* Route list */}
            <aside className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:space-y-3 lg:overflow-visible lg:pb-0">
              {routeOptions.map((route) => {
                const isActive = route.key === selectedRoute?.key;
                const routeFrom = getDestination(route.from);
                const routeTo = getDestination(route.to);

                return (
                  <button
                    key={route.key}
                    type="button"
                    onClick={() => setSelectedKey(route.key)}
                    aria-pressed={isActive}
                    className={`flex min-w-[210px] items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors lg:min-w-0 ${
                      isActive
                        ? 'border-[#0056FF] bg-blue-50/70 ring-2 ring-[#0056FF]/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        {routeFrom.city}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        {routeTo.city}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Ship className="h-3.5 w-3.5 text-[#0056FF]" />
                        {formatISODate(route.ticket.date)} · {getShipTypeLabel(route.shipType)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      {route.ticket.status === 'past' ? 'Completed' : 'Booked'}
                    </span>
                  </button>
                );
              })}
            </aside>

            {/* Map + details */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {from?.city} → {to?.city}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {matchesLiveTicket
                      ? `Following ${liveTicket.ship} across the sea`
                      : liveTicket?.needsReschedule
                        ? 'This booked trip needs to be rescheduled'
                        : 'Route for your booked trip'}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    voyageState?.status === 'at-sea'
                      ? 'border-blue-200 bg-blue-50 text-[#0056FF]'
                      : voyageState?.status === 'arrived'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : voyageState?.status === 'scheduled'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="p-4 md:p-5">
                <VoyageMapLazy
                  key={selectedRoute?.key}
                  from={selectedRoute?.from}
                  to={selectedRoute?.to}
                  progress={progress}
                  shipName={shipName}
                  voyageState={voyageState ?? undefined}
                  height="460px"
                />
              </div>

              <div className="grid gap-4 border-t border-slate-100 px-5 py-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Crossing
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Clock className="h-4 w-4 text-[#0056FF]" /> {selectedRoute?.duration || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Distance by sea
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Navigation className="h-4 w-4 text-[#0056FF]" /> {distanceKm.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Departure
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <CalendarDays className="h-4 w-4 text-[#0056FF]" />
                    {`${formatISODate(liveTicket.date)} · ${liveTicket.departure}`}
                  </p>
                </div>
              </div>

              {matchesLiveTicket && voyageState ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                  <p className="text-xs text-slate-600">
                    {voyageState.status === 'at-sea'
                      ? `About ${Math.round(voyageState.progress * 100)}% across · arriving in ${formatDurationMinutes(
                          voyageState.etaMinutes,
                        )}`
                      : voyageState.status === 'arrived'
                        ? 'This sailing has arrived at its destination.'
                        : `Departs ${formatISODate(liveTicket.date)} at ${liveTicket.departure}.`}
                  </p>
                  <Link
                    to={`/bookings/${liveTicket.id}`}
                    className="rounded-lg border border-[#0056FF] px-4 py-2 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
                  >
                    View booking
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                  <p className="text-xs text-slate-600">
                    {liveTicket?.needsReschedule
                      ? 'This booked trip was cancelled by the operator and needs to be rescheduled.'
                      : 'This is a past booked trip.'}
                  </p>
                  <Link
                    to={`/bookings/${liveTicket.id}`}
                    className="rounded-lg border border-[#0056FF] px-4 py-2 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
                  >
                    View booking
                  </Link>
                </div>
              )}
            </section>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
