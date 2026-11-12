import { useMemo } from 'react';
import useApiData from './useApiData';
import { tripRoute } from '../api';
import { formatTripDuration } from '../data/customerData';

const HIDDEN_PORT_CODES = new Set(['CAM', 'POL']);

/** Active routes, enriched with real upcoming sailing fares, durations and ship types when available. */
export default function usePopularRoutes(limit = 4) {
  const { data, loading, error } = useApiData('/trips?upcoming=true&status=scheduled&limit=100');
  const { data: routeData } = useApiData('/routes?isActive=true&limit=100');
  const routes = useMemo(() => {
    const byKey = new Map();
    const activeRoutes = (routeData?.data || []).filter((route) => (
      !HIDDEN_PORT_CODES.has(String(route.origin?.code || '').toUpperCase())
      && !HIDDEN_PORT_CODES.has(String(route.destination?.code || '').toUpperCase())
    ));
    const activeRouteIds = new Set(activeRoutes.map((route) => String(route._id)));
    (data?.data || []).forEach((trip) => {
      if (!activeRouteIds.has(String(trip.route?._id ?? trip.route))) return;
      const { fromCode, toCode } = tripRoute(trip);
      const fares = Object.values(trip.fares || {}).filter((f) => f > 0);
      if (!fares.length) return;
      const key = `${fromCode}-${toCode}`;
      const entry = byKey.get(key) || {
        from: fromCode, to: toCode, price: Infinity, sailings: 0, shipType: trip.boat?.boatType, image: trip.boat?.imageUrl, duration: '',
      };
      entry.sailings += 1;
      if (Math.min(...fares) < entry.price) {
        entry.price = Math.min(...fares);
        entry.shipType = trip.boat?.boatType;
        entry.image = trip.boat?.imageUrl;
        entry.duration = formatTripDuration(trip.departureAt, trip.arrivalAt);
      }
      byKey.set(key, entry);
    });
    activeRoutes.forEach((route) => {
      const fromCode = route.origin?.code;
      const toCode = route.destination?.code;
      if (!fromCode || !toCode) return;
      const key = `${fromCode}-${toCode}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          from: fromCode,
          to: toCode,
          price: null,
          sailings: 0,
          shipType: '',
          image: '',
          duration: '',
        });
      }
    });
    return [...byKey.values()]
      .sort((a, b) => b.sailings - a.sailings)
      .slice(0, limit);
  }, [data, routeData, limit]);
  return { routes, loading, error };
}
