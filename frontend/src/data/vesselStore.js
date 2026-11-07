import { useSyncExternalStore } from 'react';
import { vessels as initialVessels, popularRoutes } from './adminData';

/**
 * Shared in-memory fleet store so the Vessels & Routes page and the Fleet Map
 * stay in sync. Like the rest of the mock data, it resets on a full reload.
 */
let vessels = initialVessels.map((vessel) => ({ ...vessel }));
let routes = popularRoutes.map((route, index) => ({
  id: `RTE-${String(index + 1).padStart(2, '0')}`,
  label: route.route,
  bookings: route.bookings,
  revenue: route.revenue,
  share: route.share,
  occupancy: route.occupancy,
}));
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVessels() {
  return vessels;
}

export function getRoutes() {
  return routes;
}

function nextId(prefix, items) {
  const highest = items.reduce((max, item) => {
    const value = Number(String(item.id ?? '').split('-')[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}

export function setVesselStatus(id, status) {
  vessels = vessels.map((vessel) => (
    vessel.id === id ? { ...vessel, status } : vessel
  ));
  emit();
}

export function addVessel(vessel) {
  vessels = [{ ...vessel, id: vessel.id ?? nextId('VSL', vessels) }, ...vessels];
  emit();
}

export function updateVessel(id, patch) {
  vessels = vessels.map((vessel) => (
    vessel.id === id ? { ...vessel, ...patch } : vessel
  ));
  emit();
}

export function deleteVessel(id, reason = '') {
  const vessel = vessels.find((item) => item.id === id);
  if (!vessel) return { ok: false, message: 'Vessel not found.' };

  vessels = vessels.filter((item) => item.id !== id);
  emit();
  return { ok: true, vessel, reason };
}

export function isRouteInUse(label) {
  return vessels.some((vessel) => vessel.route === label);
}

export function addRoute(label) {
  const route = {
    id: nextId('RTE', routes),
    label,
    bookings: 0,
    revenue: 0,
    share: 0,
    occupancy: 0,
  };
  routes = [...routes, route];
  emit();
  return route;
}

export function updateRoute(id, patch) {
  const previous = routes.find((route) => route.id === id);
  if (!previous) return;

  routes = routes.map((route) => (
    route.id === id ? { ...route, ...patch } : route
  ));

  // Keep vessels pointed at the route when its label changes.
  if (patch.label && patch.label !== previous.label) {
    vessels = vessels.map((vessel) => (
      vessel.route === previous.label ? { ...vessel, route: patch.label } : vessel
    ));
  }
  emit();
}

export function deleteRoute(id) {
  const route = routes.find((item) => item.id === id);
  if (!route) return { ok: false, message: 'Route not found.' };
  if (isRouteInUse(route.label)) {
    return {
      ok: false,
      message: `Cannot delete ${route.label} — reassign its vessels first.`,
    };
  }

  routes = routes.filter((item) => item.id !== id);
  emit();
  return { ok: true };
}

export function useVessels() {
  return useSyncExternalStore(subscribe, getVessels, getVessels);
}

export function useRoutes() {
  return useSyncExternalStore(subscribe, getRoutes, getRoutes);
}
