import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Gauge, Navigation, Ship, Users } from 'lucide-react';
import { statusStyles } from '../data/adminData';
import { useVessels } from '../data/vesselStore';
import {
  getPointAlongPath,
  getRoutePath,
  getRoutePortCodes,
} from '../data/geo';

const FleetMap = lazy(() => import('./components/FleetMap'));

const SIMULATION_LOOP_SECONDS = 300;

function MapSkeleton() {
  return (
    <div
      className="flex h-[520px] animate-pulse flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-blue-50"
      aria-hidden="true"
    >
      <div className="h-9 w-9 rounded-full bg-blue-100" />
      <div className="h-2.5 w-44 rounded-full bg-slate-200" />
      <div className="h-2 w-28 rounded-full bg-slate-100" />
    </div>
  );
}

export default function AdminFleetMapPage() {
  const vessels = useVessels();
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState(() => vessels[0]?.id ?? null);

  // Advance the simulated fleet positions while the page is open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const fleet = useMemo(() => {
    const seconds = now.getTime() / 1000;
    const loop = (seconds % SIMULATION_LOOP_SECONDS) / SIMULATION_LOOP_SECONDS;

    return vessels.map((vessel, index) => {
      const occupancy = vessel.capacity ? Math.round((vessel.sold / vessel.capacity) * 100) : 0;
      const codes = getRoutePortCodes(vessel.route);
      if (!codes) {
        // no route assigned yet: listed, but nothing to draw on the map
        return { ...vessel, from: '', to: '', path: [], progress: 0, position: null, occupancy };
      }
      const [from, to] = codes;
      const path = getRoutePath(from, to);
      const isUnderMaintenance = vessel.status !== 'Active';
      const progress = isUnderMaintenance ? 0 : (loop + index * 0.137) % 1;
      const position = getPointAlongPath(path, progress);

      return {
        ...vessel,
        from,
        to,
        path,
        progress,
        position,
        occupancy,
      };
    });
  }, [now, vessels]);

  const stats = useMemo(() => {
    const active = fleet.filter((vessel) => vessel.status === 'Active').length;
    const capacity = fleet.reduce((sum, vessel) => sum + vessel.capacity, 0);
    const sold = fleet.reduce((sum, vessel) => sum + vessel.sold, 0);
    return {
      total: fleet.length,
      active,
      maintenance: fleet.length - active,
      occupancy: capacity ? Math.round((sold / capacity) * 100) : 0,
    };
  }, [fleet]);

  const selected = fleet.find((vessel) => vessel.id === selectedId) ?? fleet[0] ?? null;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total fleet', value: stats.total, icon: Ship },
          { label: 'At sea now', value: stats.active, icon: Navigation },
          { label: 'Under maintenance', value: stats.maintenance, icon: Gauge },
          { label: 'Fleet occupancy', value: `${stats.occupancy}%`, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <Icon className="h-4 w-4 text-[#0056FF]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        {/* Map */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Anchor className="h-4 w-4 text-[#0056FF]" /> Fleet positions
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Simulated live positions across each sea route. Select a vessel for details.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Live demo
            </span>
          </div>

          <Suspense fallback={<MapSkeleton />}>
            <FleetMap vessels={fleet} selectedId={selectedId} onSelect={setSelectedId} height="520px" />
          </Suspense>
        </section>

        {/* Vessel list + details */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Vessels</h2>
              <Link to="/admin/vessels" className="text-xs font-semibold text-[#0056FF] hover:underline">
                Manage fleet
              </Link>
            </div>
            <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
              {fleet.map((vessel) => {
                const isActive = vessel.id === selected?.id;
                return (
                  <li key={vessel.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(vessel.id)}
                      aria-pressed={isActive}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              vessel.status === 'Active' ? 'bg-[#0056FF]' : 'bg-slate-400'
                            }`}
                          />
                          <span className="truncate">{vessel.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {vessel.route}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                            statusStyles[vessel.status] ?? statusStyles.Active
                          }`}
                        >
                          {vessel.status}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-slate-400">
                          {vessel.status === 'Maintenance'
                            ? 'Out of service'
                            : `${Math.round(vessel.progress * 100)}%`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">{selected.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {selected.id} · {selected.type} · {selected.route}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Cabin occupancy</span>
                  <span>{selected.occupancy}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full w-[var(--occupancy)] rounded-full bg-[#0056FF]"
                    style={{ '--occupancy': `${selected.occupancy}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {selected.sold} of {selected.capacity} seats sold
                </p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Route progress</span>
                  <span>{Math.round(selected.progress * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full w-[var(--route-progress)] rounded-full bg-emerald-500"
                    style={{ '--route-progress': `${Math.round(selected.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {selected.status === 'Maintenance'
                    ? 'Docked — not currently sailing.'
                    : `${selected.from} → ${selected.to} · simulated live position`}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
