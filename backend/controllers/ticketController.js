const Ticket = require('../models/Ticket');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const ticketPopulate = [
  {
    path: 'trip',
    populate: [
      { path: 'boat', select: 'name boatType operator logoUrl imageUrl' },
      { path: 'route', populate: [{ path: 'origin', select: 'name code city province latitude longitude' }, { path: 'destination', select: 'name code city province latitude longitude' }] },
    ],
  },
  { path: 'booking', select: 'bookingReference status totalAmount' },
];

// GET /api/tickets/my?when=upcoming|past&status=valid
exports.getMyTickets = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  if (req.query.when === 'upcoming' || req.query.when === 'past') {
    const cmp = req.query.when === 'upcoming' ? { $gte: new Date() } : { $lt: new Date() };
    filter.trip = { $in: await Trip.find({ departureAt: cmp }).distinct('_id') };
  }
  const tickets = await Ticket.find(filter).populate(ticketPopulate).sort('-createdAt');
  res.json({ data: tickets, total: tickets.length });
});

// GET /api/tickets/:id  (owner or admin)
exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate(ticketPopulate);
  if (!ticket) throw httpError(404, 'Ticket not found');
  if (req.user.role !== 'admin' && String(ticket.user) !== String(req.user._id)) throw httpError(403, 'Not your ticket');
  res.json(ticket);
});

// GET /api/tickets/verify/:ticketNumber  (admin - scan QR at the gate)
exports.verifyTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ ticketNumber: req.params.ticketNumber }).populate(ticketPopulate);
  if (!ticket) throw httpError(404, 'Ticket not found');
  res.json(ticket);
});

// PATCH /api/tickets/:id/board  (admin - check-in)
exports.boardTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw httpError(404, 'Ticket not found');
  if (ticket.status !== 'valid') throw httpError(400, `Ticket is ${ticket.status}`);
  const booking = await Booking.findById(ticket.booking);
  if (booking.status !== 'confirmed') throw httpError(400, 'Booking is not paid/confirmed yet');
  ticket.status = 'boarded';
  ticket.boardedAt = new Date();
  await ticket.save();
  res.json(ticket);
});
