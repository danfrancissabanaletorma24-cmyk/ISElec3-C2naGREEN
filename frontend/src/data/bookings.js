
// Turns API bookings into the flat "trip card" objects the pages display.
import { tripRoute } from '../api';
import {
  phDate,
  formatTime,
  fullName,
  getSeatClassLabel,
  getShipTypeLabel,
  hoursUntil,
  CANCEL_WINDOW_HOURS,
} from './customerData';

export function boatImage(boat) {
  return boat?.imageUrl || '/ships/kho-roro.jpg';
}

/**
 * booking: one item of GET /api/bookings/my
 * status: upcoming | past | cancelled
 */
export function mapBooking(booking) {
  const trip = booking.trip || {};
  const { fromCode, toCode } = tripRoute(trip);

  const tickets = (booking.tickets || []).filter(
    (t) => t.status !== 'cancelled' || booking.status === 'cancelled'
  );

  const passengers = tickets.filter((t) => t.type === 'passenger');
  const first = passengers[0] || tickets[0] || {};

  // A trip is completed only after its arrival time has passed.
  const arrived = trip.arrivalAt
    ? new Date(trip.arrivalAt) < new Date()
    : false;

  let status = 'upcoming';

  if (booking.status === 'cancelled') {
    status = 'cancelled';
  } else if (
    booking.status === 'completed' ||
    (arrived && booking.status !== 'reschedule_pending')
  ) {
    status = 'past';
  }

  const payment = booking.payment || null;
  const awaitingPayment =
    booking.status === 'pending' && payment?.status === 'pending';

  const hoursLeft = trip.departureAt
    ? hoursUntil(trip.departureAt)
    : 0;

  return {
    id: booking._id,
    bookingRef: booking.bookingReference,
    rawStatus: booking.status,
    status,
    needsReschedule: booking.status === 'reschedule_pending',
    tripCancelReason: trip.cancelReason || '',
    awaitingPayment,
    payment,
    bookingType: booking.bookingType,
    tripId: trip._id,

    ship: trip.boat?.name || 'Ferry',
    operator: trip.boat?.operator || '',
    image: boatImage(trip.boat),
    shipType: getShipTypeLabel(trip.boat?.boatType),

    seatClass: booking.bookingType === 'cargo'
      ? (first.seatNumber
        ? `Cargo · ${getSeatClassLabel(first.seatClass)}`
        : 'Cargo')
      : getSeatClassLabel(first.seatClass),

    from: fromCode,
    to: toCode,

    departureAt: trip.departureAt,
    arrivalAt: trip.arrivalAt,
    date: trip.departureAt ? phDate(trip.departureAt) : '',
    departure: formatTime(trip.departureAt),
    arrival: formatTime(trip.arrivalAt),

    passenger: booking.bookingType === 'cargo'
      ? `${first.cargo?.description || 'Cargo'}${first.seatNumber ? ` · VIP seat ${first.seatNumber}` : ''}`
      : fullName(first.passenger),

    passengers: passengers.map((t) => ({
      ...t.passenger,
      seat: t.seatNumber,
      fareCategory: t.fareCategory,
      price: t.price,
    })),

    seats: tickets.map((t) => t.seatNumber).filter(Boolean),
    tickets: booking.tickets || [],
    price: booking.totalAmount,

    cancelReason: booking.cancelReason || '',

    refundStatus:
      payment?.status === 'refund_pending'
        ? 'pending'
        : payment?.status === 'refunded'
          ? 'refunded'
          : '',

    paid: payment?.status === 'paid',

    canCancel:
      ['pending', 'confirmed'].includes(booking.status) &&
      hoursLeft >= CANCEL_WINDOW_HOURS,

    canReschedule:
      ['pending', 'confirmed'].includes(booking.status) &&
      hoursLeft >= CANCEL_WINDOW_HOURS,

    cancelLockedReason:
      ['pending', 'confirmed'].includes(booking.status) &&
      hoursLeft < CANCEL_WINDOW_HOURS
        ? `Changes close ${CANCEL_WINDOW_HOURS} hours before departure.`
        : '',
  };
}
