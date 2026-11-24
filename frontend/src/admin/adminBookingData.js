
import { apiRequest, tripRoute } from '../api';
import { formatDate, formatTime, phDate } from '../data/customerData';

const BOOKING_STATUS_LABELS = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  completed: 'Completed',
  reschedule_pending: 'Reschedule pending',
  cancelled: 'Cancelled',
};

const PAYMENT_METHOD_LABELS = {
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
};

function personName(person) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown customer';
}

function mapAdminBooking(booking) {
  const user = booking.user || {};
  const trip = booking.trip || {};
  const route = trip.route || {};

  const origin = route.origin?.city || route.origin?.name || '';
  const destination = route.destination?.city || route.destination?.name || '';

  const tickets = booking.tickets || [];

  const passengers = tickets
    .filter((ticket) => ticket.type === 'passenger')
    .map((ticket) => ({
      name: personName(ticket.passenger),
      seatNumber: ticket.seatNumber || '',
      seatClass: ticket.seatClass || '',
      fareCategory: ticket.fareCategory || '',
      price: ticket.price || 0,
      contactNumber: ticket.passenger?.contactNumber || '',
    }));

  const cargo = tickets
    .filter((ticket) => ticket.type === 'cargo')
    .map((ticket) => ({
      description: ticket.cargo?.description || 'Cargo',
      weightKg: ticket.cargo?.weightKg || 0,
      recipientName: ticket.cargo?.recipientName || '',
      recipientContact: ticket.cargo?.recipientContact || '',
      vipSeatNumber: ticket.seatNumber || '',
      vipSeatPrice: ticket.cargo?.vipSeatPrice || 0,
      price: ticket.price || 0,
    }));

  const payment = booking.payment || null;
  const bookingReference = booking.bookingReference || '';
  const bookedBy = personName(user);
  const routeName = [origin, destination].filter(Boolean).join(' → ') || 'Route unavailable';

  const departureAt = trip.departureAt || '';
  const arrivalAt = trip.arrivalAt || '';

  // Determine whether the trip's arrival time has already passed.
  const arrivalTime = arrivalAt ? new Date(arrivalAt).getTime() : NaN;
  const arrived = Number.isFinite(arrivalTime) && arrivalTime < Date.now();

  // Determine the status displayed on the admin side.
  const displayStatus =
    payment?.status === 'refunded'
      ? 'Refunded'
      : booking.status === 'cancelled'
        ? 'Cancelled'
        : booking.status === 'reschedule_pending'
          ? 'Reschedule pending'
          : booking.status === 'completed' || arrived
            ? 'Completed'
            : BOOKING_STATUS_LABELS[booking.status] || booking.status || 'Unknown';

  const bookingType = booking.bookingType === 'cargo' ? 'Cargo' : 'Passenger';
  const routeCodes = tripRoute(trip);

  const seatDetails = passengers.length
    ? passengers
        .map((item) => `${item.name} · Seat ${item.seatNumber || '—'}`)
        .join(', ')
    : cargo
        .map((item) =>
          `${item.description} · ${item.weightKg} kg${item.vipSeatNumber ? ` · VIP seat ${item.vipSeatNumber}` : ''}`
        )
        .join(', ') || 'No ticket details';

  return {
    id: bookingReference || booking._id,
    bookingRef: bookingReference || 'Reference unavailable',
    rawId: booking._id,
    userId: user._id || '',
    userCreatedAt: user.createdAt || '',
    passenger: bookedBy,
    email: user.email || 'No email on record',
    phone: user.contactNumber || '',
    route: routeName,
    vessel: trip.boat?.name || 'Vessel unavailable',

    date: departureAt
      ? formatDate(departureAt, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Not scheduled',

    time: departureAt ? formatTime(departureAt) : '',
    departureAt,

    bookedAt: booking.createdAt
      ? formatDate(booking.createdAt, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Unknown date',

    createdAt: booking.createdAt || '',

    payment: payment
      ? PAYMENT_METHOD_LABELS[payment.method] ||
        payment.method ||
        payment.channel ||
        'Payment'
      : 'No payment record',

    // why the booking is cancelled / rescheduled (shown in the booking details)
    cancelReason: booking.cancelReason || '',
    cancelledBy: booking.cancelledBy || '',
    cancelledAt: booking.cancelledAt || '',
    tripCancelReason: trip.cancelReason || '',
    rescheduleHistory: (booking.rescheduleHistory || []).map((item) => ({
      reason: item.reason || '',
      by: item.by || '',
      at: item.at || '',
      fromAt: item.fromTrip?.departureAt || '',
      toAt: item.toTrip?.departureAt || '',
    })),

    paymentId: payment?._id || '',
    paymentChannel: payment?.channel || '',
    paymentMethod: payment?.method || '',
    paymentStatus: payment?.status || '',
    refund: payment?.refund?.status ? payment.refund : null,
    bankTransferSenderName: payment?.bankTransferSenderName || '',
    bankTransferSenderBank: payment?.bankTransferSenderBank || '',
    bankTransferReference: payment?.bankTransferReference || '',
    bankTransferProofFileName: payment?.bankTransferProofFileName || '',
    paidAt: payment?.paidAt || '',

    amount: Number(booking.totalAmount) || 0,
    seats: passengers.length + cargo.filter((item) => item.vipSeatNumber).length,
    bookingType,

    // Use the calculated status instead of the raw database status.
    status: displayStatus,
    rawStatus: booking.status,
    refunded: payment?.status === 'refunded',

    passengers,
    cargo,
    seatDetails,

    rescheduleTrip: {
      id: booking._id,
      bookingRef: bookingReference || 'Reference unavailable',
      bookingType: booking.bookingType,
      needsReschedule: booking.status === 'reschedule_pending',
      tripCancelReason: trip.cancelReason || '',
      from: routeCodes.fromCode,
      to: routeCodes.toCode,
      ship: trip.boat?.name || 'Vessel unavailable',
      date: departureAt ? phDate(departureAt) : '',
      departure: departureAt ? formatTime(departureAt) : '',
      arrival: arrivalAt ? formatTime(arrivalAt) : '',
      tickets,
    },

    searchText: [
      bookingReference,
      bookedBy,
      user.email,
      user.contactNumber,
      routeName,
      trip.boat?.name,
      ...passengers.flatMap((item) => [item.name, item.seatNumber]),
      ...cargo.map((item) => item.description),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function isWithinPeriod(value, period) {
  if (!period) return true;
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) &&
    date >= period.start &&
    date < period.end;
}

export function buildAdminRouteMetrics(bookings, period = null) {
  const byRoute = new Map();

  bookings.forEach((booking) => {
    const createdInPeriod = isWithinPeriod(booking.createdAt, period);

    const paidInPeriod =
      booking.paymentStatus === 'paid' &&
      isWithinPeriod(period ? booking.paidAt : booking.createdAt, period);

    if (!createdInPeriod && !paidInPeriod) return;

    const route = byRoute.get(booking.route) || {
      route: booking.route,
      bookings: 0,
      revenue: 0,
    };

    if (createdInPeriod) route.bookings += 1;
    if (paidInPeriod) route.revenue += booking.amount;

    byRoute.set(booking.route, route);
  });

  const totalRevenue = [...byRoute.values()].reduce(
    (sum, route) => sum + route.revenue,
    0
  );

  return [...byRoute.values()]
    .map((route) => ({
      ...route,
      share: totalRevenue
        ? Math.round((route.revenue / totalRevenue) * 100)
        : 0,
    }))
    .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue);
}

export async function loadAllAdminBookings(token) {
  const bookings = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiRequest(
      `/bookings?page=${page}&limit=100`,
      { token }
    );

    if (!Array.isArray(result.data)) {
      throw new Error('The bookings API returned an unexpected response.');
    }

    bookings.push(...result.data);
    pages = Math.max(Number(result.pages) || 1, 1);
    page += 1;
  } while (page <= pages);

  return bookings.map(mapAdminBooking);
}
