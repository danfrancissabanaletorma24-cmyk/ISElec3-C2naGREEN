import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getPathDistance,
  getPointAlongPath,
  getRoutePath,
  getVoyageStatusLabel,
} from '../data/geo';
import { getDestination } from '../data/customerData';

const SHIP_ICON = L.divIcon({
  className: 'border-0 bg-transparent',
  html: `
    <span class="flex h-[40px] w-[40px] animate-voyage-pulse items-center justify-center rounded-full border-[3px] border-white bg-[#0056ff] text-white shadow-[0_6px_18px_-4px_#0056ffa6]" aria-hidden="true">
      <svg class="h-[20px] w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
        <path d="M12 10v4" />
        <path d="M12 2v3" />
      </svg>
    </span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

function FitRoute({ path, resetKey }) {
  const map = useMap();

  useEffect(() => {
    if (!path || path.length === 0) return;
    const bounds = L.latLngBounds(path.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 9 });
  }, [map, path, resetKey]);

  return null;
}

/**
 * Interactive sea-route map with an optional moving vessel marker.
 *
 * @param {object} props
 * @param {string} props.from Origin port code
 * @param {string} props.to Destination port code
 * @param {number} [props.progress] 0 = origin, 1 = destination
 * @param {string} [props.shipName]
 * @param {string} [props.height]
 * @param {boolean} [props.interactive]
 * @param {object} [props.voyageState]
 */
export default function VoyageMap({
  from,
  to,
  progress = 0,
  shipName = 'Vessel',
  height = '320px',
  interactive = true,
  voyageState,
  className = '',
}) {
  const path = useMemo(() => getRoutePath(from, to), [from, to]);
  const origin = getDestination(from);
  const destination = getDestination(to);

  const center = useMemo(() => {
    if (path.length === 0) return [12.5, 122];
    const middle = getPointAlongPath(path, 0.5);
    return middle ?? path[0];
  }, [path]);

  const shipPosition = useMemo(
    () => getPointAlongPath(path, progress) ?? center,
    [path, progress, center],
  );

  const distanceKm = useMemo(() => Math.round(getPathDistance(path)), [path]);
  const statusLabel = voyageState ? getVoyageStatusLabel(voyageState) : null;
  const progressPercent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  if (path.length === 0) {
    return (
      <div
        className={`flex h-[var(--map-height)] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 ${className}`}
        style={{ '--map-height': height }}
      >
        Route details are unavailable for this sailing.
      </div>
    );
  }

  return (
    <div
      className={`h-[var(--map-height)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 [isolation:isolate] [&_.leaflet-container]:z-0 [&_.leaflet-container]:bg-[#dbeafe] [&_.leaflet-container]:[font:inherit] [&_.leaflet-control-attribution]:bg-white/80 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-tooltip]:rounded-lg [&_.leaflet-tooltip]:border-0 [&_.leaflet-tooltip]:px-2 [&_.leaflet-tooltip]:py-1 [&_.leaflet-tooltip]:text-[11px] [&_.leaflet-tooltip]:font-semibold [&_.leaflet-tooltip]:text-[#0f172a] [&_.leaflet-tooltip]:shadow-[0_6px_18px_-8px_#0f172a66] ${className}`}
      style={{ '--map-height': height }}
      role="region"
      aria-label={`Map of the ${origin.city} to ${destination.city} sea route, ${progressPercent}% of the voyage complete`}
    >
      <MapContainer
        center={center}
        zoom={6}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitRoute path={path} resetKey={`${from}-${to}`} />

        <Polyline
          positions={path}
          pathOptions={{ color: '#0056FF', weight: 3, opacity: 0.75, dashArray: '7 8' }}
        />

        <CircleMarker
          center={path[0]}
          radius={7}
          pathOptions={{ color: '#0056FF', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            {origin.city}
          </Tooltip>
        </CircleMarker>

        <CircleMarker
          center={path[path.length - 1]}
          radius={7}
          pathOptions={{ color: '#0f766e', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            {destination.city}
          </Tooltip>
        </CircleMarker>

        <Marker position={shipPosition} icon={SHIP_ICON} title={`${shipName} position`}>
          <Tooltip direction="top" offset={[0, -18]}>
            <span className="font-semibold">{shipName}</span>
            {statusLabel ? ` · ${statusLabel}` : ''}
          </Tooltip>
        </Marker>
      </MapContainer>

      <div className="sr-only">
        Sailing from {origin.city} to {destination.city}, approximately {distanceKm} km.
        {statusLabel ? ` Status: ${statusLabel}.` : ''} Voyage {progressPercent}% complete.
      </div>
    </div>
  );
}
