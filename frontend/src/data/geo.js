// src/data/geo.js
// Geographic helpers for the voyage map. Port coordinates are stored with each port in the database.

import { getAllPorts, getDestination } from './ports';

export const PORT_LABELS = {
  MBO: 'Mobo',
  MSB: 'Masbate City',
  PDU: 'Pio Duran',
  PLR: 'Pilar',
};

const PORT_CODES_BY_LABEL = Object.fromEntries(
  Object.entries(PORT_LABELS).map(([code, label]) => [label.toLowerCase(), code]),
);

/** Convert a route label such as "Mobo → Pio Duran" into its port codes. */
export function getRoutePortCodes(route) {
  const [origin, destination] = String(route || '').split('→').map((part) => part.trim());
  if (!origin || !destination) return null;

  const from = PORT_CODES_BY_LABEL[origin.toLowerCase()];
  const to = PORT_CODES_BY_LABEL[destination.toLowerCase()];
  return from && to ? [from, to] : null;
}

/** [lat, lng] of a port code, or null when the port has no coordinates yet. */
export function getPortCoordinate(code) {
  const port = getAllPorts().find((item) => item.code === code);
  if (!port || typeof port.latitude !== 'number' || typeof port.longitude !== 'number') return null;
  return [port.latitude, port.longitude];
}

/** Human-readable port name for a port code. */
export function getPortLabel(code) {
  return getDestination(code).city;
}

/**
 * Sea lanes between the ports, as [lat, lng] waypoints that stay in open water.
 * They were planned and checked against the real Masbate / Albay / Sorsogon coast outlines, so a line never
 * crosses Ticao, Burias or the mainland - it goes around them. The ends are the port points on the shore.
 * Each lane is listed once; the opposite direction is the same lane walked backwards.
 */
const SEA_LANES = {
  'MBO-PDU': [[12.3479, 123.6453], [12.356, 123.654], [13.016, 123.444], [13.0272, 123.4476]],
  'MBO-PLR': [[12.3479, 123.6453], [12.353, 123.648], [12.623, 123.579], [12.632, 123.573], [12.725, 123.582], [12.89, 123.669], [12.908, 123.666], [12.9224, 123.6771]],
  'MBO-MSB': [[12.3479, 123.6453], [12.356, 123.654], [12.368, 123.648], [12.3663, 123.6337]],
  'MSB-PLR': [[12.3663, 123.6337], [12.365, 123.642], [12.413, 123.645], [12.635, 123.573], [12.731, 123.585], [12.89, 123.669], [12.908, 123.666], [12.9224, 123.6771]],
  'MSB-PDU': [[12.3663, 123.6337], [12.368, 123.648], [12.461, 123.642], [12.923, 123.444], [13.016, 123.444], [13.0272, 123.4476]],
  'PDU-PLR': [[13.0272, 123.4476], [13.022, 123.444], [12.995, 123.462], [12.932, 123.525], [12.863, 123.654], [12.887, 123.669], [12.908, 123.666], [12.9224, 123.6771]],
};

/**
 * Route line between two ports. Known ports follow their sea lane (water only, either direction).
 * A port pair without a planned lane falls back to a straight line between the stored port coordinates.
 */
export function getRoutePath(from, to) {
  const forward = SEA_LANES[`${from}-${to}`];
  if (forward) return forward.map(([lat, lng]) => [lat, lng]);

  const backward = SEA_LANES[`${to}-${from}`];
  if (backward) return backward.map(([lat, lng]) => [lat, lng]).reverse();

  const origin = getPortCoordinate(from);
  const destination = getPortCoordinate(to);
  if (!origin || !destination) return [];
  return [origin, destination];
}

/** Great-circle distance between two [lat, lng] points, in kilometres. */
export function distanceBetween([lat1, lng1], [lat2, lng2]) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

/** Total length of a path in kilometres. */
export function getPathDistance(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += distanceBetween(path[index - 1], path[index]);
  }
  return total;
}

/**
 * Interpolates a position along a path.
 * @param {number[][]} path
 * @param {number} progress 0 = origin, 1 = destination
 */
export function getPointAlongPath(path, progress) {
  if (!path || path.length === 0) return null;
  if (path.length === 1) return path[0];

  const clamped = Math.min(1, Math.max(0, progress));
  const cumulative = [0];
  for (let index = 1; index < path.length; index += 1) {
    cumulative.push(cumulative[index - 1] + distanceBetween(path[index - 1], path[index]));
  }

  const total = cumulative[cumulative.length - 1];
  if (total === 0) return path[0];

  const target = clamped * total;
  let segment = 1;
  while (segment < cumulative.length - 1 && cumulative[segment] < target) {
    segment += 1;
  }

  const start = cumulative[segment - 1];
  const end = cumulative[segment];
  const ratio = end === start ? 0 : (target - start) / (end - start);
  const [startLat, startLng] = path[segment - 1];
  const [endLat, endLng] = path[segment];

  return [
    startLat + (endLat - startLat) * ratio,
    startLng + (endLng - startLng) * ratio,
  ];
}

/** Formats a minute count as "2h 30m" / "45m". */
export function formatDurationMinutes(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Works out where a sailing is in its journey.
 * @param {{ departureAt: string, arrivalAt: string }} trip  ISO timestamps from the API
 * @returns {{ status: 'scheduled'|'at-sea'|'arrived', progress: number, etaMinutes: number }}
 */
export function getVoyageState(trip, now = new Date()) {
  const departure = trip?.departureAt ? new Date(trip.departureAt) : null;
  const arrival = trip?.arrivalAt ? new Date(trip.arrivalAt) : null;

  if (!departure || !arrival || Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
    return { status: 'scheduled', progress: 0, etaMinutes: 0 };
  }

  if (now < departure) {
    return { status: 'scheduled', progress: 0, etaMinutes: Math.ceil((departure - now) / 60000) };
  }
  if (now >= arrival) {
    return { status: 'arrived', progress: 1, etaMinutes: 0 };
  }
  return {
    status: 'at-sea',
    progress: (now - departure) / (arrival - departure),
    etaMinutes: Math.ceil((arrival - now) / 60000),
  };
}

/** Human-readable status label for the current voyage state. */
export function getVoyageStatusLabel(state) {
  switch (state.status) {
    case 'at-sea':
      return 'At sea';
    case 'arrived':
      return 'Arrived';
    default:
      return 'Scheduled';
  }
}
