// src/data/geo.js
// Geographic data and helpers for the voyage map.
// Coordinates are approximate port locations in the Philippines. Route
// waypoints follow the general sea lanes ferries use so the line stays on
// water instead of cutting across islands.

export const PORT_COORDINATES = {
  MNL: [14.5833, 120.9667], // Manila
  CEB: [10.293, 123.905], // Cebu
  TAG: [9.6475, 123.8537], // Tagbilaran, Bohol
  MPH: [11.9276, 121.9556], // Caticlan
  BOR: [11.9674, 121.9248], // Boracay
  BCD: [10.6765, 122.9509], // Bacolod
  ILO: [10.7202, 122.5621], // Iloilo
  DGT: [9.3068, 123.3054], // Dumaguete
  BTG: [13.7565, 121.0583], // Batangas
  CPL: [13.4116, 121.1803], // Calapan
};

// Display names for each port, used when building and resolving route labels.
export const PORT_LABELS = {
  MNL: 'Manila',
  CEB: 'Cebu',
  TAG: 'Bohol',
  MPH: 'Caticlan',
  BOR: 'Boracay',
  BCD: 'Bacolod',
  ILO: 'Iloilo',
  DGT: 'Dumaguete',
  BTG: 'Batangas',
  CPL: 'Calapan',
};

// Maps the human-readable route labels used by the admin console to port codes.
export const ROUTE_PORT_CODES = {
  'Manila → Cebu': ['MNL', 'CEB'],
  'Cebu → Bohol': ['CEB', 'TAG'],
  'Caticlan → Boracay': ['MPH', 'BOR'],
  'Bacolod → Iloilo': ['BCD', 'ILO'],
};

/**
 * Resolves a route label such as "Manila → Cebu" to its port codes. New routes
 * created from the admin pick port names from PORT_LABELS, so they resolve too.
 * Returns null when the label cannot be mapped.
 */
export function getRoutePortCodes(label) {
  const known = ROUTE_PORT_CODES[label];
  if (known) return known;

  const names = String(label ?? '')
    .split('→')
    .map((part) => part.trim().toLowerCase());
  if (names.length !== 2) return null;

  const codes = names.map((name) => (
    Object.entries(PORT_LABELS).find(([, portName]) => portName.toLowerCase() === name)?.[0]
  ));

  return codes[0] && codes[1] ? codes : null;
}

/** Human-readable port name for a port code. */
export function getPortLabel(code) {
  return PORT_LABELS[code] ?? code;
}

// Keyed `FROM-TO`. Reverse pairs are generated automatically.
const ROUTE_WAYPOINTS = {
  'MNL-CEB': [
    [14.5833, 120.9667],
    [14.35, 120.8],
    [13.95, 120.68],
    [13.55, 120.78],
    [13.15, 121.1],
    [12.6, 121.7],
    [11.95, 122.4],
    [11.35, 122.95],
    [10.8, 123.45],
    [10.48, 123.72],
    [10.293, 123.905],
  ],
  'CEB-TAG': [
    [10.293, 123.905],
    [10.18, 123.95],
    [9.98, 123.95],
    [9.78, 123.9],
    [9.6475, 123.8537],
  ],
  'MPH-BOR': [
    [11.9276, 121.9556],
    [11.94, 121.945],
    [11.955, 121.935],
    [11.9674, 121.9248],
  ],
  'BCD-ILO': [
    [10.6765, 122.9509],
    [10.71, 122.86],
    [10.72, 122.75],
    [10.71, 122.65],
    [10.7202, 122.5621],
  ],
  'MNL-BTG': [
    [14.5833, 120.9667],
    [14.3, 120.72],
    [14.0, 120.8],
    [13.85, 120.95],
    [13.7565, 121.0583],
  ],
  'BTG-CPL': [
    [13.7565, 121.0583],
    [13.62, 121.1],
    [13.5, 121.14],
    [13.4116, 121.1803],
  ],
  'CEB-DGT': [
    [10.293, 123.905],
    [10.12, 123.72],
    [9.92, 123.55],
    [9.72, 123.4],
    [9.5, 123.32],
    [9.3068, 123.3054],
  ],
  'CEB-BCD': [
    [10.293, 123.905],
    [10.38, 123.72],
    [10.48, 123.5],
    [10.56, 123.28],
    [10.62, 123.1],
    [10.6765, 122.9509],
  ],
  'ILO-DGT': [
    [10.7202, 122.5621],
    [10.45, 122.8],
    [10.1, 123.0],
    [9.75, 123.18],
    [9.5, 123.27],
    [9.3068, 123.3054],
  ],
  'CEB-ILO': [
    [10.293, 123.905],
    [10.42, 123.7],
    [10.5, 123.45],
    [10.58, 123.2],
    [10.66, 122.95],
    [10.72, 122.75],
    [10.7202, 122.5621],
  ],
};

export function getPortCoordinate(code) {
  return PORT_COORDINATES[code] ?? null;
}

/**
 * Returns a sea-lane path for a port pair. Falls back to a straight line when
 * no curated route exists, and reverses curated routes for the opposite leg.
 */
export function getRoutePath(from, to) {
  const origin = getPortCoordinate(from);
  const destination = getPortCoordinate(to);
  if (!origin || !destination) return [];

  const direct = ROUTE_WAYPOINTS[`${from}-${to}`];
  if (direct) return direct;

  const reverse = ROUTE_WAYPOINTS[`${to}-${from}`];
  if (reverse) return [...reverse].reverse();

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

/** "2:00 PM" -> { hours, minutes } */
function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value ?? '');
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return { hours, minutes: Number(match[2]) };
}

function combineDateAndTime(dateISO, timeValue) {
  const time = parseTime(timeValue);
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO ?? '');
  if (!time || !dateParts) return null;
  return new Date(
    Number(dateParts[1]),
    Number(dateParts[2]) - 1,
    Number(dateParts[3]),
    time.hours,
    time.minutes,
    0,
    0,
  );
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
 * @returns {{ status: 'scheduled'|'at-sea'|'arrived', progress: number, etaMinutes: number }}
 */
export function getVoyageState(ticket, now = new Date()) {
  const departure = combineDateAndTime(ticket?.date, ticket?.departure);
  let arrival = combineDateAndTime(ticket?.date, ticket?.arrival);

  if (!departure || !arrival) {
    return { status: 'scheduled', progress: 0, etaMinutes: 0 };
  }
  // Overnight sailings arrive the next day.
  if (arrival <= departure) {
    arrival = new Date(arrival.getTime() + 24 * 60 * 60 * 1000);
  }

  if (now < departure) {
    return {
      status: 'scheduled',
      progress: 0,
      etaMinutes: Math.ceil((departure - now) / 60000),
    };
  }

  if (now >= arrival) {
    return { status: 'arrived', progress: 1, etaMinutes: 0 };
  }

  const duration = arrival - departure;
  return {
    status: 'at-sea',
    progress: (now - departure) / duration,
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
