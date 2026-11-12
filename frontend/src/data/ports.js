// src/data/ports.js
// Ports come from the backend (GET /api/ports). This tiny store keeps them in memory so any
// component - or plain helper such as getDestination() - can look a port up by its code.
import { useSyncExternalStore } from 'react';
import { apiRequest } from '../api';

const HIDDEN_PORT_CODES = new Set(['CAM', 'POL']);

let ports = [];
let routes = [];
let status = 'idle'; // idle | loading | ready | error
let loadError = '';
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function loadPorts(force = false) {
  if (status === 'loading' || (status === 'ready' && !force)) return;
  status = 'loading';
  loadError = '';
  emit();
  try {
    const [portResult, routeResult] = await Promise.all([
      apiRequest('/ports?isActive=true&limit=100'),
      apiRequest('/routes?isActive=true&limit=100'),
    ]);
    if (!Array.isArray(portResult.data) || !Array.isArray(routeResult.data)) {
      throw new Error('The ports or routes API returned an unexpected response.');
    }

    const portsById = new Map(
      portResult.data
      .filter((port) => port.isActive !== false)
        .map((port) => [String(port._id), port]),
    );
    const resolvePort = (value) => {
      const id = typeof value === 'string' ? value : value?._id;
      const stored = portsById.get(String(id));
      const source = typeof value === 'object' && value ? value : {};
      if (!stored && !source.code) return null;
      return {
        ...source,
        ...stored,
        id: String(id),
        code: source.code || stored?.code || '',
        name: source.name || stored?.name || '',
        city: source.city || stored?.city || source.name || stored?.name || '',
        province: source.province || stored?.province || '',
        latitude: source.latitude ?? stored?.latitude,
        longitude: source.longitude ?? stored?.longitude,
      };
    };
    const isHiddenPort = (port) => (
      HIDDEN_PORT_CODES.has(String(port.code).toUpperCase())
      || ['camalig', 'polangui'].includes(String(port.city || port.name).trim().toLowerCase())
    );
    routes = routeResult.data
      .filter((route) => route.isActive !== false)
      .map((route) => ({
        ...route,
        origin: resolvePort(route.origin),
        destination: resolvePort(route.destination),
      }))
      .filter((route) => (
        route.origin
        && route.destination
        && !isHiddenPort(route.origin)
        && !isHiddenPort(route.destination)
      ));

    const uniquePorts = new Map();
    routes.forEach((route) => {
      uniquePorts.set(route.origin.code, route.origin);
      uniquePorts.set(route.destination.code, route.destination);
    });
    ports = [...uniquePorts.values()].sort((a, b) => a.city.localeCompare(b.city));
    status = 'ready';
  } catch {
    loadError = 'Could not load active routes. Please refresh and try again.';
    status = 'error';
  }
  emit();
}

/** Port by code. Unknown codes fall back to the code itself so labels never break. */
export function getDestination(code) {
  const found = ports.find((port) => port.code === code);
  return found ?? { code: code ?? '', city: code ?? '', name: code ?? '', province: '' };
}

export function getAllPorts() {
  return ports;
}

export function usePorts() {
  const list = useSyncExternalStore(subscribe, () => ports, () => ports);
  const routeList = useSyncExternalStore(subscribe, () => routes, () => routes);
  const state = useSyncExternalStore(subscribe, () => status, () => status);
  return { ports: list, routes: routeList, status: state, error: loadError };
}
