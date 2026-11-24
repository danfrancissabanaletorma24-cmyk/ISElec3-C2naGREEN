import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SHIP_SVG = `
  <svg class="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
    <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
    <path d="M12 10v4" />
    <path d="M12 2v3" />
  </svg>`;

function createShipIcon(vessel, selected) {
  const color = vessel.status === 'Maintenance' ? '#94A3B8' : '#0056FF';
  const size = selected ? 40 : 30;
  const sizeClasses = selected
    ? 'h-[40px] w-[40px] border-[3px] shadow-[0_0_0_6px_#0056ff2e,0_8px_20px_-4px_#0f172a80]'
    : 'h-[30px] w-[30px] border-2 shadow-[0_4px_12px_-3px_#0f172a73]';
  return L.divIcon({
    className: 'border-0 bg-transparent',
    html: `<span class="flex items-center justify-center rounded-full border-white text-white transition-[transform,box-shadow] duration-200 bg-[var(--ship-color)] ${sizeClasses}" style="--ship-color:${color}">${SHIP_SVG}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitFleet({ vessels, resetKey }) {
  const map = useMap();

  // Only re-fit when the set of routes actually changes. The vessel positions update every couple of
  // seconds, so depending on `vessels` here would keep resetting whatever zoom/pan the admin chose.
  const pathSignature = useMemo(
    () => [...new Set(vessels.map((vessel) => vessel.route))].sort().join('|'),
    [vessels],
  );
  const latestVessels = useRef(vessels);
  latestVessels.current = vessels;

  useEffect(() => {
    const points = latestVessels.current.flatMap((vessel) => vessel.path ?? []);
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng))), {
      padding: [46, 46],
      maxZoom: 8,
      animate: false,
    });
  }, [map, pathSignature, resetKey]);

  return null;
}

/**
 * Shows every vessel on a single sea map.
 * Each vessel is expected to include `path`, `position`, `route`, `status`.
 */
export default function FleetMap({ vessels, selectedId, onSelect, height = '520px' }) {
  const icons = useMemo(
    () =>
      Object.fromEntries(
        vessels.map((vessel) => [vessel.id, createShipIcon(vessel, vessel.id === selectedId)]),
      ),
    [vessels, selectedId],
  );

  const routes = useMemo(() => {
    const seen = new Map();
    vessels.forEach((vessel) => {
      if (!seen.has(vessel.route)) {
        seen.set(vessel.route, { route: vessel.route, path: vessel.path });
      }
    });
    return [...seen.values()];
  }, [vessels]);

  const center = useMemo(() => {
    const first = vessels.find((vessel) => vessel.path?.length);
    return first ? first.path[Math.floor(first.path.length / 2)] : [12.5, 122];
  }, [vessels]);

  return (
    <div
      className="relative h-[var(--map-height)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 [isolation:isolate] [&_.leaflet-container]:z-0 [&_.leaflet-container]:bg-[#dbeafe] [&_.leaflet-container]:[font:inherit] [&_.leaflet-control-attribution]:bg-white/80 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-tooltip]:rounded-lg [&_.leaflet-tooltip]:border-0 [&_.leaflet-tooltip]:px-2 [&_.leaflet-tooltip]:py-1 [&_.leaflet-tooltip]:text-[11px] [&_.leaflet-tooltip]:font-semibold [&_.leaflet-tooltip]:text-[#0f172a] [&_.leaflet-tooltip]:shadow-[0_6px_18px_-8px_#0f172a66]"
      style={{ '--map-height': height }}
      role="region"
      aria-label={`Fleet map showing ${vessels.length} vessels across Philippine sea routes`}
    >
      <MapContainer
        center={center}
        zoom={6}
        className="h-full w-full"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitFleet vessels={vessels} resetKey="admin-fleet" />

        {routes.map((route) => {
          const isSelected = vessels.some(
            (vessel) =>
              vessel.id === selectedId && vessel.route === route.route,
          );
          return (
            <Polyline
              key={route.route}
              positions={route.path}
              pathOptions={{
                color: isSelected ? '#0f766e' : '#0056FF',
                weight: isSelected ? 4 : 2,
                opacity: isSelected ? 0.9 : 0.35,
                dashArray: '7 8',
              }}
            />
          );
        })}

        {vessels.map((vessel) =>
          vessel.position ? (
            <Marker
              key={vessel.id}
              position={vessel.position}
              icon={icons[vessel.id]}
              eventHandlers={{ click: () => onSelect?.(vessel.id) }}
              title={`${vessel.name} · ${vessel.route}`}
            >
              <Tooltip direction="top" offset={[0, -16]}>
                <span className="font-semibold">{vessel.name}</span> ·{' '}
                {vessel.status === 'Maintenance'
                  ? 'Maintenance'
                  : `${Math.round(vessel.progress * 100)}% across`}
              </Tooltip>
            </Marker>
          ) : null,
        )}

        {vessels
          .filter((vessel) => vessel.id === selectedId)
          .map((vessel) =>
            vessel.path?.length ? (
              <CircleMarker
                key={`${vessel.id}-start`}
                center={vessel.path[0]}
                radius={5}
                pathOptions={{ color: '#0056FF', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  {vessel.route.split(' → ')[0]}
                </Tooltip>
              </CircleMarker>
            ) : null,
          )}
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col gap-1 rounded-lg bg-white/95 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-md">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0056FF]" /> At sea
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Maintenance
        </span>
      </div>

      <div className="sr-only">
        {vessels.map((vessel) => (
          <p key={vessel.id}>
            {vessel.name}, {vessel.route}, {vessel.status === 'Maintenance'
              ? 'under maintenance'
              : `${Math.round(vessel.progress * 100)}% across the route`}.
          </p>
        ))}
      </div>
    </div>
  );
}
