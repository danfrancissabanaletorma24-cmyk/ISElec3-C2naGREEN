const Boat = require('../models/Boat');
const Trip = require('../models/Trip');
const Ticket = require('../models/Ticket');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const PREFIX = { economy: 'E', business: 'B', vip: 'V' };

// seatCounts { economy: 50, business: 10 } -> [{seatNumber:'E1',seatClass:'economy'}, ...]
const generateSeats = (seatCounts = {}) =>
  Object.entries(PREFIX).flatMap(([cls, prefix]) =>
    Array.from({ length: Math.max(Number(seatCounts[cls]) || 0, 0) }, (_, i) => ({
      seatNumber: `${prefix}${i + 1}`,
      seatClass: cls,
    }))
  );

const prepareBoat = async (body, req, existing) => {
  if (body.seatCounts) {
    const counts = {};
    for (const seatClass of Object.keys(PREFIX)) {
      const count = Number(body.seatCounts[seatClass] ?? 0);
      if (!Number.isInteger(count) || count < 0) {
        throw httpError(400, `${seatClass} seat count must be a non-negative whole number`);
      }
      counts[seatClass] = count;
    }
    if (Object.values(counts).every((count) => count === 0)) {
      throw httpError(400, 'Boat needs at least one seat');
    }
    body.seats = generateSeats(counts);
    delete body.seatCounts;
  }

  if (body.defaultFares) {
    if (typeof body.defaultFares !== 'object' || Array.isArray(body.defaultFares)) {
      throw httpError(400, 'Default fares must be provided by seat class');
    }
    const seats = body.seats || (existing && existing.seats) || [];
    const seatCounts = seats.reduce((counts, seat) => {
      counts[seat.seatClass] = (counts[seat.seatClass] || 0) + 1;
      return counts;
    }, {});
    for (const seatClass of Object.keys(PREFIX)) {
      const fare = Number(body.defaultFares[seatClass] ?? 0);
      if (!Number.isFinite(fare) || fare < 0) {
        throw httpError(400, `${seatClass} fare must be a non-negative number`);
      }
      if (seatCounts[seatClass] > 0 && fare <= 0) {
        throw httpError(400, `Set a positive ${seatClass} fare because the boat has ${seatClass} seats`);
      }
      body.defaultFares[seatClass] = fare;
    }
    body.defaultFare = body.defaultFares.economy;
  }
  return body;
};

const base = crud(Boat, {
  searchFields: ['name', 'registrationNumber'],
  filterFields: ['status', 'boatType'],
  prepare: prepareBoat,
  beforeDelete: async (boat) => {
    if (await Trip.exists({ boat: boat._id })) {
      throw httpError(409, 'Boat has trips. Set status to "retired" instead.');
    }
  },
});

module.exports = {
  ...base,
  update: asyncHandler(async (req, res) => {
    const boat = await Boat.findById(req.params.id);
    if (!boat) throw httpError(404, 'Boat not found');

    const body = await prepareBoat({ ...req.body }, req, boat);
    delete body._id;

    if (body.seats) {
      const trips = await Trip.find({
        boat: boat._id,
        departureAt: { $gte: new Date() },
        status: { $ne: 'cancelled' },
      }).select('_id').lean();
      const tripIds = trips.map((trip) => trip._id);
      if (tripIds.length) {
        const heldSeats = await Ticket.find({ trip: { $in: tripIds }, holdsSeat: true })
          .select('seatNumber')
          .lean();
        const retainedSeats = new Set(body.seats.map((seat) => seat.seatNumber));
        if (heldSeats.some((ticket) => !retainedSeats.has(ticket.seatNumber))) {
          throw httpError(409, 'Seat counts cannot remove seats already booked on upcoming trips');
        }
      }
    }

    boat.set(body);
    await boat.save();

    if (body.defaultFares) {
      const fareUpdates = {};
      Object.keys(PREFIX).forEach((seatClass) => {
        fareUpdates[`fares.${seatClass}`] = body.defaultFares[seatClass];
      });
      await Trip.updateMany(
        {
          boat: boat._id,
          departureAt: { $gte: new Date() },
          status: { $ne: 'cancelled' },
        },
        { $set: fareUpdates },
      );
    }

    res.json(await Boat.findById(boat._id));
  }),
};
