const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Boat = require('../models/Boat');
const Route = require('../models/Route');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Port = require('../models/Port');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { notify, notifyMany } = require('../utils/notify');

const tripPopulate = [
  { path: 'boat', select: 'name boatType operator logoUrl description amenities imageUrl status seatCapacity seats cargoCapacityKg' },
  {
    path: 'route',
    populate: [
      { path: 'origin', select: 'name code city' },
      { path: 'destination', select: 'name code city' },
    ],
  },
];

// Validates boat/route and fills in defaults
const prepare = async (body, req, existing) => {
  const boatId = body.boat || (existing && existing.boat);
  const routeId = body.route || (existing && existing.route);
  const boat = await Boat.findById(boatId);
  if (!boat) throw httpError(400, 'Boat not found');
  if (boat.status !== 'active') throw httpError(400, `Boat is ${boat.status}`);
  if (!(await Route.exists({ _id: routeId, isActive: true }))) throw httpError(400, 'Route not found or inactive');

  const fares = { ...(existing ? existing.fares.toObject() : {}), ...(body.fares || {}) };
  [...new Set(boat.seats.map((s) => s.seatClass))].forEach((cls) => {
    const defaultFare = boat.defaultFares?.[cls] || (cls === 'economy' ? boat.defaultFare : 0);
    if (!(fares[cls] > 0) && defaultFare > 0) {
      fares[cls] = defaultFare;
    }
    if (!(fares[cls] > 0)) throw httpError(400, `Set a fare for the "${cls}" class (boat has ${cls} seats)`);
  });
  body.fares = fares;
  if (body.cargoCapacityKg === undefined && !existing) body.cargoCapacityKg = boat.cargoCapacityKg;
  if (!existing) body.createdBy = req.user._id;
  return body;
};

const base = crud(Trip, { populate: tripPopulate, prepare });
exports.getTrip = base.getOne;
exports.createTrip = base.create;

// GET /api/trips?origin=<portId|code>&destination=<portId|code>&date=2026-11-05&status=scheduled&upcoming=true&boatType=roro
// Each trip also carries seatsTotal / seatsAvailable / seatsAvailableByClass / cargoAvailableKg.
exports.getTrips = asyncHandler(async (req, res) => {
  const { origin, destination, date, status, upcoming, boat, boatType } = req.query;
  const filter = {};
  const routeFilter = { isActive: true };
  if (typeof status === 'string') filter.status = status;
  if (typeof boat === 'string') filter.boat = boat;
  if (typeof boatType === 'string' && boatType !== 'any') {
    filter.boat = { $in: await Boat.find({ boatType }).distinct('_id') };
  }
  if (typeof origin === 'string') {
    const port = await resolvePort(origin);
    if (!port) {
      filter.route = { $in: [] };
    } else {
      routeFilter.origin = port._id;
    }
  }
  if (typeof destination === 'string') {
    const port = await resolvePort(destination);
    if (!port) {
      filter.route = { $in: [] };
    } else {
      routeFilter.destination = port._id;
    }
  }
  if (!filter.route) filter.route = { $in: await Route.find(routeFilter).distinct('_id') };
  if (typeof date === 'string') {
    // day range in Philippine time (UTC+8); never list sailings that already left
    const start = new Date(`${date}T00:00:00+08:00`);
    if (isNaN(start)) throw httpError(400, 'date must be YYYY-MM-DD');
    const from = new Date(Math.max(start.getTime(), Date.now()));
    filter.departureAt = { $gte: from, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  } else if (upcoming === 'true') {
    filter.departureAt = { $gte: new Date() };
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate(tripPopulate).sort('departureAt').skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);

  // availability for every trip in this page (2 queries total, not 2 per trip)
  const ids = trips.map((t) => t._id);
  const [held, cargoUsed] = await Promise.all([
    Ticket.find({ trip: { $in: ids }, holdsSeat: true }).select('trip seatNumber'),
    Ticket.aggregate([
      { $match: { trip: { $in: ids }, type: 'cargo', status: { $in: ['valid', 'boarded'] } } },
      { $group: { _id: '$trip', kg: { $sum: '$cargo.weightKg' } } },
    ]),
  ]);
  const heldByTrip = new Map();
  held.forEach((h) => {
    const k = String(h.trip);
    if (!heldByTrip.has(k)) heldByTrip.set(k, new Set());
    heldByTrip.get(k).add(h.seatNumber);
  });
  const cargoByTrip = new Map(cargoUsed.map((c) => [String(c._id), c.kg]));

  const data = trips.map((trip) => {
    const plain = trip.toObject();
    const taken = heldByTrip.get(String(trip._id)) || new Set();
    const byClass = {};
    const boatSeats = trip.boat?.seats || []; // a trip can outlive its boat (deleted/retired) - never assume it is populated
    boatSeats.forEach((s) => {
      if (!taken.has(s.seatNumber)) byClass[s.seatClass] = (byClass[s.seatClass] || 0) + 1;
    });
    plain.seatsTotal = boatSeats.length;
    plain.seatsAvailable = Object.values(byClass).reduce((a, b) => a + b, 0);
    plain.seatsAvailableByClass = byClass;
    plain.cargoAvailableKg = Math.max(trip.cargoCapacityKg - (cargoByTrip.get(String(trip._id)) || 0), 0);
    if (plain.boat) delete plain.boat.seats; // the seat map is loaded per trip from /api/trips/:id/seats
    return plain;
  });
  res.json({ data, total, page, pages: Math.ceil(total / limit) });
});

const resolvePort = async (value) => {
  const normalized = value.trim().toUpperCase();
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    const portById = await Port.findById(normalized);
    if (portById) return portById;
  }
  return Port.findOne({ code: normalized, isActive: true });
};

// GET /api/trips/:id/seats -> seat map with availability + cargo space left
exports.getSeats = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate('boat');
  if (!trip) throw httpError(404, 'Trip not found');

  const taken = new Set(await Ticket.find({ trip: trip._id, holdsSeat: true }).distinct('seatNumber'));
  if (!trip.boat) throw httpError(409, 'The boat for this trip is no longer available');
  const seats = trip.boat.seats.map((s) => ({
    seatNumber: s.seatNumber,
    seatClass: s.seatClass,
    price: trip.fares[s.seatClass],
    isAvailable: !taken.has(s.seatNumber),
  }));

  const [used] = await Ticket.aggregate([
    { $match: { trip: trip._id, type: 'cargo', status: { $in: ['valid', 'boarded'] } } },
    { $group: { _id: null, kg: { $sum: '$cargo.weightKg' } } },
  ]);
  res.json({
    tripId: trip._id,
    seats,
    cargo: {
      ratePerKg: trip.cargoRatePerKg,
      capacityKg: trip.cargoCapacityKg,
      availableKg: Math.max(trip.cargoCapacityKg - (used ? used.kg : 0), 0),
    },
  });
});

// PUT /api/trips/:id  (admin) - also notifies passengers on delay/cancel/reschedule
exports.updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw httpError(404, 'Trip not found');
  if (['cancelled', 'arrived'].includes(trip.status)) throw httpError(409, `Trip is ${trip.status} and can no longer be edited`);
  if (req.body.status === 'cancelled') throw httpError(400, 'Use PATCH /api/trips/:id/cancel (with a reason) so affected bookings are handled');

  const body = await prepare({ ...req.body }, req, trip);
  if (body.boat && String(body.boat) !== String(trip.boat) && (await Ticket.exists({ trip: trip._id, status: { $ne: 'cancelled' } }))) {
    throw httpError(409, 'Cannot change the boat: passengers already booked this trip');
  }

  const oldStatus = trip.status;
  const oldDeparture = trip.departureAt.getTime();
  ['boat', 'route', 'departureAt', 'arrivalAt', 'fares', 'cargoRatePerKg', 'cargoCapacityKg', 'status'].forEach((k) => {
    if (body[k] !== undefined) trip.set(k, body[k]);
  });
  await trip.save();

  const rescheduled = trip.departureAt.getTime() !== oldDeparture;
  if (trip.status !== oldStatus || rescheduled) {
    const userIds = await Ticket.find({ trip: trip._id, status: 'valid' }).distinct('user');
    const when = trip.departureAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    if (trip.status === 'delayed' || rescheduled) {
      await notifyMany(userIds, { title: 'Trip schedule update', message: `Your trip is now scheduled for ${when}.`, trip: trip._id });
    } else if (trip.status === 'boarding') {
      await notifyMany(userIds, { title: 'Now boarding', message: 'Boarding has started for your trip.', trip: trip._id });
    }
    if (trip.status === 'arrived') {
      await Booking.updateMany({ trip: trip._id, status: 'confirmed' }, { status: 'completed' });
    }
  }
  res.json(await Trip.findById(trip._id).populate(tripPopulate));
});

exports.deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw httpError(404, 'Trip not found');
  if (await Booking.exists({ trip: trip._id })) throw httpError(409, 'Trip has bookings. Set status to "cancelled" instead.');
  await trip.deleteOne();
  res.json({ message: 'Trip deleted' });
});

// PATCH /api/trips/:id/cancel  (admin) body: { reason: "Bad weather" }
// Cancels the trip and moves every pending/confirmed booking to "reschedule_pending".
// Each affected user is notified and chooses: reschedule to another trip, or cancel for a refund.
exports.cancelTrip = asyncHandler(async (req, res) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason) throw httpError(400, 'A cancellation reason is required (e.g. "Bad weather")');

  const trip = await Trip.findById(req.params.id);
  if (!trip) throw httpError(404, 'Trip not found');
  if (['departed', 'arrived', 'cancelled'].includes(trip.status)) throw httpError(400, `Trip is already ${trip.status}`);

  trip.status = 'cancelled';
  trip.cancelReason = reason;
  trip.cancelledAt = new Date();
  await trip.save();

  const affected = await Booking.find({ trip: trip._id, status: { $in: ['pending', 'confirmed'] } }).select('user bookingReference');
  await Booking.updateMany({ _id: { $in: affected.map((b) => b._id) } }, { status: 'reschedule_pending' });

  const when = trip.departureAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  await Promise.all(
    affected.map((b) =>
      notify(b.user, {
        title: 'Trip cancelled - choose what to do',
        message: `Booking ${b.bookingReference}: your trip on ${when} was cancelled (${reason}). You can reschedule to another trip on the same route, or cancel for a refund.`,
        type: 'booking',
        booking: b._id,
        trip: trip._id,
      })
    )
  );
  res.json({ message: 'Trip cancelled', affectedBookings: affected.length, trip });
});
