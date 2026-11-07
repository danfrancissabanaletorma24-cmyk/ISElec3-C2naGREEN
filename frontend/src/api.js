const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return payload;
}

export function mapBookingToTicket(booking) {
  const trip = booking.trip || {};
  const route = trip.route || {};
  const tickets = booking.tickets || [];
  const firstTicket = tickets[0] || {};
  const departureAt = trip.departureAt ? new Date(trip.departureAt) : null;
  const departure = departureAt && !Number.isNaN(departureAt.getTime())
    ? departureAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const status = booking.status === 'cancelled'
    ? 'cancelled'
    : booking.status === 'completed' || (departureAt && departureAt < new Date())
      ? 'past'
      : 'upcoming';

  return {
    id: booking._id,
    bookingRef: booking.bookingReference,
    status,
    ship: trip.boat?.name || 'Ferry',
    shipType: trip.boat?.boatType || '',
    seatClass: firstTicket.seatClass || '',
    from: route.origin?.code || route.origin?.name || '',
    to: route.destination?.code || route.destination?.name || '',
    date: departureAt && !Number.isNaN(departureAt.getTime())
      ? departureAt.toISOString().slice(0, 10)
      : '',
    departure,
    arrival: '',
    passenger: firstTicket.passenger
      ? `${firstTicket.passenger.firstName} ${firstTicket.passenger.lastName}`.trim()
      : '',
    seats: tickets.map((ticket) => ticket.seatNumber).filter(Boolean),
    price: booking.totalAmount,
    cancelReason: booking.cancelReason,
  };
}
