import { useMemo } from 'react';
import useApiData from './useApiData';
import { useAuth } from '../auth/AuthContext';
import { mapBooking } from '../data/bookings';

/** The signed-in person's bookings as trip cards, newest first. */
export default function useMyBookings() {
  const { token } = useAuth();
  const { data, error, loading, reload } = useApiData('/bookings/my', { token, enabled: Boolean(token) });
  const bookings = useMemo(() => (data?.data || []).map(mapBooking), [data]);
  return { bookings, error, loading, reload };
}
