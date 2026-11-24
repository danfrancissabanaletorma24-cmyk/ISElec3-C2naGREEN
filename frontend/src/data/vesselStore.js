import { useSyncExternalStore } from 'react';
import { apiRequest } from '../api';

const VESSEL_STORAGE_KEY = 'layagexpres_admin_vessels';
const ROUTE_STORAGE_KEY = 'layagexpres_admin_routes';

function readStoredList(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    console.error(`Saved data for ${key} is invalid; using defaults.`);
  } catch (error) {
    console.error(`Could not load saved data for ${key}.`, error);
  }
  return fallback;
}

function saveList(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save data for ${key}.`, error);
  }
}

const defaultVessels = [
  {
    id: 'VES-001',
    name: 'MV Esperanza Star',
    type: 'RoRo / Ferry',
    capacity: 120,
    sold: 82,
    route: 'Mobo → Pio Duran',
    status: 'Active',
  },
  {
    id: 'VES-002',
    name: 'MV Ricardo 5',
    type: 'Fast Craft',
    capacity: 80,
    sold: 56,
    route: 'Mobo → Pilar',
    status: 'Active',
  },
  {
    id: 'VES-003',
    name: 'Montenegro Lines Fast Craft',
    type: 'Fast Craft',
    capacity: 60,
    sold: 42,
    route: 'Masbate City → Pilar',
    status: 'Maintenance',
  },
];

const defaultRoutes = [
  { id: 'ROUTE-001', label: 'Mobo → Pio Duran', bookings: 248, occupancy: 88 },
  { id: 'ROUTE-002', label: 'Mobo → Pilar', bookings: 192, occupancy: 76 },
  { id: 'ROUTE-003', label: 'Masbate City → Pilar', bookings: 164, occupancy: 81 },
  { id: 'ROUTE-004', label: 'Pio Duran → Masbate City', bookings: 126, occupancy: 69 },
];

let vessels = readStoredList(VESSEL_STORAGE_KEY, defaultVessels);
let routes = readStoredList(ROUTE_STORAGE_KEY, defaultRoutes);

const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const emit = () => listeners.forEach((listener) => listener());

export function useVessels() {
  return useSyncExternalStore(subscribe, () => vessels, () => vessels);
}

export function useRoutes() {
  return useSyncExternalStore(subscribe, () => routes, () => routes);
}

export function addVessel(vessel) {
  vessels = [...vessels, { ...vessel, id: `VES-${Date.now()}` }];
  saveList(VESSEL_STORAGE_KEY, vessels);
  emit();
}

export function updateVessel(id, patch) {
  vessels = vessels.map((vessel) => (vessel.id === id ? { ...vessel, ...patch } : vessel));
  saveList(VESSEL_STORAGE_KEY, vessels);
  emit();
}

export function deleteVessel(id) {
  vessels = vessels.filter((vessel) => vessel.id !== id);
  saveList(VESSEL_STORAGE_KEY, vessels);
  emit();
}

export function addRoute(label, apiId) {
  routes = [...routes, { id: `ROUTE-${Date.now()}`, label, apiId, bookings: 0, occupancy: 0 }];
  saveList(ROUTE_STORAGE_KEY, routes);
  emit();
}

export function syncRoutesFromApi(apiRoutes) {
  routes = apiRoutes.map((apiRoute) => {
    const apiId = String(apiRoute._id);
    const existing = routes.find((route) => String(route.apiId) === apiId);
    const origin = apiRoute.origin?.city || apiRoute.origin?.name;
    const destination = apiRoute.destination?.city || apiRoute.destination?.name;
    return {
      id: apiId,
      apiId,
      label: `${origin} → ${destination}`,
      bookings: existing?.bookings ?? 0,
      occupancy: existing?.occupancy ?? 0,
    };
  });
  saveList(ROUTE_STORAGE_KEY, routes);
  emit();
}

export function updateRoute(id, patch) {
  const current = routes.find((route) => route.id === id);
  if (!current) return;
  const nextLabel = patch.label ?? current.label;
  routes = routes.map((route) => (route.id === id ? { ...route, ...patch } : route));
  vessels = vessels.map((vessel) => (
    vessel.route === current.label ? { ...vessel, route: nextLabel } : vessel
  ));
  saveList(ROUTE_STORAGE_KEY, routes);
  saveList(VESSEL_STORAGE_KEY, vessels);
  emit();
}

export function deleteRoute(id) {
  const route = routes.find((item) => item.id === id);
  if (!route) return { ok: false, message: 'Route not found.' };
  if (vessels.some((vessel) => vessel.route === route.label)) {
    return { ok: false, message: 'Reassign vessels before deleting this route.' };
  }
  routes = routes.filter((item) => item.id !== id);
  saveList(ROUTE_STORAGE_KEY, routes);
  emit();
  return { ok: true };
}

// ---- Database sync -------------------------------------------------------------------------------
// The boats saved in the database are the real fleet. The list kept in this browser (localStorage) is
// only a cache, so every admin page rebuilds it from /boats (+ the next upcoming trip of each boat
// for its route and seats sold). Vessels added from anywhere therefore always show up.
const BOAT_TYPE_LABELS = { fastcraft: 'Fast Craft', roro: 'RoRo / Ferry', ferry: 'RoRo / Ferry', cargo: 'Cargo' };
const BOAT_STATUS_LABELS = { active: 'Active', maintenance: 'Maintenance', retired: 'Retired' };

export const DEFAULT_VESSEL_IMAGES = {
  'Fast Craft': '/ships/kho-fast-craft.jpg',
  'RoRo / Ferry': '/ships/kho-roro.jpg',
  Cargo: '/ships/kho-cargo.png',
};

export const vesselImage = (vessel) => vessel?.image || DEFAULT_VESSEL_IMAGES[vessel?.type] || DEFAULT_VESSEL_IMAGES['Fast Craft'];

const portName = (port) => port?.city || port?.name;
const tripRouteLabel = (trip) => {
  const origin = portName(trip?.route?.origin);
  const destination = portName(trip?.route?.destination);
  return origin && destination ? `${origin} → ${destination}` : '';
};

export function syncVesselsFromApi(boats, trips = []) {
  const nextTripByBoat = new Map();
  trips
    .filter((trip) => trip?.boat && trip.status !== 'cancelled')
    .sort((a, b) => new Date(a.departureAt) - new Date(b.departureAt))
    .forEach((trip) => {
      const boatId = String(trip.boat._id || trip.boat);
      if (!nextTripByBoat.has(boatId)) nextTripByBoat.set(boatId, trip);
    });

  vessels = boats.map((boat) => {
    const apiId = String(boat._id);
    const existing = vessels.find((vessel) => vessel.apiId === apiId)
      || vessels.find((vessel) => !vessel.apiId && vessel.name.toLowerCase() === String(boat.name).toLowerCase());
    const seatCounts = (boat.seats || []).reduce((counts, seat) => {
      counts[seat.seatClass] = (counts[seat.seatClass] || 0) + 1;
      return counts;
    }, {});
    const capacity = boat.seatCapacity ?? (boat.seats || []).length;
    const trip = nextTripByBoat.get(apiId);
    const sold = trip ? Math.max((trip.seatsTotal ?? capacity) - (trip.seatsAvailable ?? capacity), 0) : 0;
    const type = BOAT_TYPE_LABELS[boat.boatType] || 'Fast Craft';
    return {
      id: existing?.id || `VES-${apiId.slice(-6).toUpperCase()}`,
      apiId,
      name: boat.name,
      type,
      operator: boat.operator || '',
      capacity,
      economySeats: seatCounts.economy || 0,
      businessSeats: seatCounts.business || 0,
      vipSeats: seatCounts.vip || 0,
      sold,
      route: tripRouteLabel(trip) || existing?.route || 'No route assigned',
      status: BOAT_STATUS_LABELS[boat.status] || 'Active',
      image: boat.imageUrl || '',
      defaultFares: {
        economy: boat.defaultFares?.economy || boat.defaultFare || 0,
        business: boat.defaultFares?.business || 0,
        vip: boat.defaultFares?.vip || 0,
      },
    };
  });
  saveList(VESSEL_STORAGE_KEY, vessels);
  emit();
}

let refreshing = null;
/** Reloads the fleet from the database. Safe to call often; concurrent calls share one request. */
export function refreshVessels(token) {
  if (!token) return Promise.resolve();
  if (refreshing) return refreshing;
  refreshing = Promise.all([
    apiRequest('/boats?limit=100&sort=name', { token }),
    apiRequest('/trips?upcoming=true&limit=100', { token }).catch(() => ({ data: [] })),
  ])
    .then(([boats, trips]) => {
      if (Array.isArray(boats?.data)) syncVesselsFromApi(boats.data, trips?.data || []);
    })
    .catch((error) => console.error('Could not refresh the fleet from the server.', error))
    .finally(() => { refreshing = null; });
  return refreshing;
}
