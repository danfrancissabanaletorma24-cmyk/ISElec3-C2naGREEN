import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Play, RotateCcw, Ship, Square } from 'lucide-react';
import VoyageMapLazy from './VoyageMapLazy';
import { useCurrency } from '../currency/CurrencyContext';
import {
  formatDurationMinutes,
  getPathDistance,
  getRoutePath,
  getVoyageState,
  getVoyageStatusLabel,
} from '../data/geo';
import { formatISODate, getDestination } from '../data/customerData';

const STATUS_STYLES = {
  'at-sea': 'bg-blue-50 text-[#0056FF] border-blue-200',
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  arrived: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  simulated: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReduced(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}

export default function LiveVoyageCard({ ticket }) {
  const { format } = useCurrency();
  const [now, setNow] = useState(() => new Date());
  const [simActive, setSimActive] = useState(false);
  const [simProgress, setSimProgress] = useState(null);
  const reducedMotion = usePrefersReducedMotion();

  // Keep the live position fresh while the page is open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const simulating = simActive && simProgress !== null && simProgress < 1;

  useEffect(() => {
    if (!simulating) return undefined;
    const timer = window.setTimeout(() => {
      setSimProgress((current) => Math.min(1, (current ?? 0) + 0.02));
    }, 100);
    return () => window.clearTimeout(timer);
  }, [simulating, simProgress]);

  const voyageState = useMemo(() => getVoyageState(ticket, now), [ticket, now]);
  const path = useMemo(
    () => (ticket ? getRoutePath(ticket.from, ticket.to) : []),
    [ticket],
  );
  const distanceKm = useMemo(() => Math.round(getPathDistance(path)), [path]);

  if (!ticket) {
    return (
      <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <MapPin className="h-4 w-4 text-[#0056FF]" /> Live Voyage
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Book a ferry and you will be able to follow its progress across the sea here.
        </p>
      </div>
    );
  }

  const from = getDestination(ticket.from);
  const to = getDestination(ticket.to);
  const isSimulated = simulating || simProgress !== null;
  const progress = simProgress ?? voyageState.progress;
  const progressPercent = Math.round(progress * 100);
  const statusLabel = isSimulated ? 'Simulated position' : getVoyageStatusLabel(voyageState);
  const statusStyle = isSimulated ? STATUS_STYLES.simulated : STATUS_STYLES[voyageState.status];
  const isAtSea = voyageState.status === 'at-sea' && !isSimulated;

  const startSimulation = () => {
    if (reducedMotion) {
      setSimProgress(1);
      setSimActive(false);
      return;
    }
    setSimProgress(0);
    setSimActive(true);
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-[#0056FF]" /> Live Voyage
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Follow {ticket.ship} across the sea from {from.city} to {to.city}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.6fr_1fr]">
        <VoyageMapLazy
          from={ticket.from}
          to={ticket.to}
          progress={progress}
          shipName={ticket.ship}
          voyageState={voyageState}
          height="280px"
        />

        <div className="flex flex-col">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Route</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {from.city} → {to.city}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatISODate(ticket.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5" /> {ticket.departure} – {ticket.arrival}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {ticket.ship} · {ticket.shipType} · about {distanceKm.toLocaleString()} km by sea
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Voyage progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label="Voyage progress"
            >
              <div
                className="h-full w-[var(--progress-width)] rounded-full bg-[#0056FF] transition-[width] duration-500 ease-out"
                style={{ '--progress-width': `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {isAtSea
                ? `Arriving in about ${formatDurationMinutes(voyageState.etaMinutes)}`
                : voyageState.status === 'arrived' && !isSimulated
                  ? 'This sailing has arrived at its destination.'
                  : voyageState.status === 'scheduled' && !isSimulated
                    ? `Departs ${formatISODate(ticket.date)} at ${ticket.departure}`
                    : 'Showing a simulated position along this route.'}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <button
              type="button"
              onClick={simulating ? () => setSimActive(false) : startSimulation}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0056FF] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              {simulating ? (
                <><Square className="h-4 w-4" /> Stop</>
              ) : simProgress !== null || voyageState.status === 'arrived' ? (
                <><RotateCcw className="h-4 w-4" /> Replay</>
              ) : (
                <><Play className="h-4 w-4" /> Simulate voyage</>
              )}
            </button>
            <span className="ml-auto text-[11px] text-slate-400">
              Fare {format(ticket.price)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
