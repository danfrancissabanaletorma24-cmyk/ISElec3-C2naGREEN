const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Trip = require('../models/Trip');
const C = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const generateRef = require('../utils/generateRef');
const { notify } = require('../utils/notify');

const paymentPopulate = [{ path: 'booking', select: 'bookingReference status totalAmount bookingType' }];

const markPaid = async (payment, extra = {}) => {
  const booking = await Booking.findById(payment.booking);
  if (booking.status === 'cancelled') throw httpError(400, 'Booking was cancelled');
  if (booking.status === 'reschedule_pending') throw httpError(400, 'Trip was cancelled. Reschedule or cancel the booking first');
  payment.status = 'paid';
  payment.paidAt = new Date();
  Object.assign(payment, extra);
  await payment.save();
  booking.status = 'confirmed';
  await booking.save();
  await notify(payment.user, {
    title: 'Payment received',
    message: `Payment for booking ${booking.bookingReference} is confirmed. Your ticket is ready.`,
    type: 'payment',
    booking: booking._id,
  });
};

// GET /api/payments/my
exports.getMyPayments = asyncHandler(async (req, res) => {
  const data = await Payment.find({ user: req.user._id }).populate(paymentPopulate).sort('-createdAt');
  res.json({ data, total: data.length });
});

// GET /api/payments  (admin)
exports.getAllPayments = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};
  ['status', 'channel', 'method'].forEach((f) => { if (typeof req.query[f] === 'string') filter[f] = req.query[f]; });
  const [data, total] = await Promise.all([
    Payment.find(filter).populate([...paymentPopulate, { path: 'user', select: 'firstName lastName email' }]).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(filter),
  ]);
  res.json({ data, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/payments/:id
exports.getPayment = asyncHandler(async (req, res) => {
  let query = Payment.findById(req.params.id);
  if (req.user.role === 'admin') query = query.select('+bankTransferProofDataUrl');
  const payment = await query.populate(paymentPopulate);
  if (!payment) throw httpError(404, 'Payment not found');
  if (req.user.role !== 'admin' && String(payment.user) !== String(req.user._id)) throw httpError(403, 'Not your payment');
  res.json(payment);
});

// POST /api/payments/:id/pay-online  (user)
// NOTE: gateway is SIMULATED for the school project. Replace the marked block with PayMongo/Xendit later.
exports.payOnline = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (String(payment.user) !== String(req.user._id)) throw httpError(403, 'Not your payment');
  if (payment.channel !== 'online') throw httpError(400, 'This is a pay-at-counter booking');
  if (payment.method === 'bank_transfer') throw httpError(400, 'Bank transfer is awaiting administrator verification');
  if (payment.status !== 'pending') throw httpError(400, `Payment is already ${payment.status}`);

  const verificationCode = typeof req.body?.verificationCode === 'string'
    ? req.body.verificationCode
    : '';
  if (payment.method === 'card' && !/^\d{3,4}$/.test(verificationCode)) {
    throw httpError(400, 'Enter a valid 3- or 4-digit CVV');
  }
  if (['gcash', 'maya'].includes(payment.method) && !/^\d{4}$/.test(verificationCode)) {
    throw httpError(400, 'Enter a valid 4-digit wallet PIN');
  }

  // ---- simulated gateway success ----
  await markPaid(payment, { transactionRef: generateRef('TXN') });
  res.json(await Payment.findById(payment._id).populate(paymentPopulate));
});

// PATCH /api/payments/:id/confirm  (admin/cashier received cash at the counter)
exports.confirmPhysical = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.channel !== 'physical' && payment.method !== 'bank_transfer') {
    throw httpError(400, 'Only counter payments or bank transfers can be confirmed here');
  }
  if (payment.status !== 'pending') throw httpError(400, `Payment is already ${payment.status}`);

  await markPaid(payment, { confirmedBy: req.user._id, receiptNumber: req.body.receiptNumber || generateRef('OR') });
  res.json(await Payment.findById(payment._id).populate(paymentPopulate));
});

const cleanReason = (value) => {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 5) throw httpError(400, 'Please give a reason (at least 5 characters)');
  if (reason.length > 500) throw httpError(400, 'Reason must be 500 characters or fewer');
  return reason;
};

const withPopulate = (id) => Payment.findById(id).populate(paymentPopulate);

// POST /api/payments/:id/refund-request  { reason }  (the customer who paid)
exports.requestRefund = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (String(payment.user) !== String(req.user._id)) throw httpError(403, 'Not your payment');
  const reason = cleanReason(req.body.reason);

  if (payment.status === 'refund_pending') throw httpError(400, 'A refund for this booking is already being processed');
  if (payment.status === 'refunded') throw httpError(400, 'This booking was already refunded');
  if (payment.status !== 'paid') throw httpError(400, 'Only paid bookings can be refunded');

  const booking = await Booking.findById(payment.booking);
  if (!booking) throw httpError(404, 'Booking not found');
  if (['cancelled', 'completed'].includes(booking.status)) throw httpError(400, `Booking is already ${booking.status}`);
  if (await Ticket.exists({ booking: booking._id, status: 'boarded' })) throw httpError(400, 'Passengers already boarded');

  const trip = await Trip.findById(booking.trip);
  const hoursLeft = trip ? (trip.departureAt.getTime() - Date.now()) / 3600000 : 0;
  if (booking.status !== 'reschedule_pending' && hoursLeft < C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL) {
    throw httpError(400, `Refunds can only be requested at least ${C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL} hours before departure`);
  }

  payment.status = 'refund_pending';
  payment.refund = {
    status: 'requested',
    requestedBy: 'user',
    requestedByUser: req.user._id,
    reason,
    requestedAt: new Date(),
    amount: payment.amount,
  };
  await payment.save();

  await notify(payment.user, {
    title: 'Refund requested',
    message: `Your refund request for booking ${booking.bookingReference} was sent. We will review it shortly.`,
    type: 'payment',
    booking: booking._id,
  });
  res.status(201).json(await withPopulate(payment._id));
});

// PATCH /api/payments/:id/refund  { reason, decision?: 'approve' | 'reject' }  (admin)
// - approve: refunds a customer's request, or refunds a paid booking directly. The booking is cancelled
//   and its seats are released.
// - reject: declines a customer's request (the payment goes back to "paid").
// The admin must always give a reason; the customer can read it.
exports.markRefunded = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  const reason = cleanReason(req.body.reason);
  const decision = req.body.decision === 'reject' ? 'reject' : 'approve';
  const booking = await Booking.findById(payment.booking);

  if (decision === 'reject') {
    if (payment.status !== 'refund_pending' || payment.refund?.status !== 'requested') {
      throw httpError(400, 'There is no pending refund request to reject');
    }

    // A cancelled booking can only stay cancelled if the refund is approved, otherwise it would be paid and
    // cancelled at the same time. Reopening it is only safe while the trip is still scheduled and the seats are free.
    let reopened = false;
    if (booking && booking.status === 'cancelled') {
      const trip = await Trip.findById(booking.trip);
      if (!trip || trip.status !== 'scheduled' || trip.departureAt <= new Date()) {
        throw httpError(400, 'This trip has already departed or was cancelled, so the refund cannot be rejected. Approve it instead.');
      }

      const tickets = await Ticket.find({ booking: booking._id });
      const seatNumbers = tickets.map((ticket) => ticket.seatNumber).filter(Boolean);
      const taken = seatNumbers.length
        ? await Ticket.find({
            trip: booking.trip,
            holdsSeat: true,
            seatNumber: { $in: seatNumbers },
            _id: { $nin: tickets.map((ticket) => ticket._id) },
          }).distinct('seatNumber')
        : [];

      if (taken.length) {
        throw httpError(409, `Seat(s) ${taken.join(', ')} are already taken, so the refund cannot be rejected. Approve it instead.`);
      }

      try {
        for (const ticket of tickets) {
          ticket.status = 'valid';
          ticket.holdsSeat = Boolean(ticket.seatNumber);
          await ticket.save();
        }
      } catch (err) {
        if (err.code === 11000) throw httpError(409, 'One of the seats was already taken, so the refund cannot be rejected. Approve it instead.');
        throw err;
      }

      booking.status = 'confirmed';
      booking.cancelledAt = null;
      booking.cancelReason = null;
      booking.cancelledBy = null;
      await booking.save();
      reopened = true;
    }

    payment.status = 'paid';
    payment.refund.status = 'rejected';
    payment.refund.adminReason = reason;
    payment.refund.processedBy = req.user._id;
    payment.refund.processedAt = new Date();
    await payment.save();
    await notify(payment.user, {
      title: 'Refund request declined',
      message: `Your refund request for booking ${booking?.bookingReference || ''} was declined. Reason: ${reason}${reopened ? '. Your booking is active again.' : ''}`,
      type: 'payment',
      booking: payment.booking,
    });
    return res.json(await withPopulate(payment._id));
  }

  if (payment.status === 'refunded') {
    return res.json(await withPopulate(payment._id));
  }
  if (!['paid', 'refund_pending'].includes(payment.status)) {
    throw httpError(400, `A ${payment.status} payment cannot be refunded`);
  }
  if (booking && (await Ticket.exists({ booking: booking._id, status: 'boarded' }))) {
    throw httpError(400, 'Passengers already boarded');
  }

  // release the seats if the booking is still active
  if (booking && booking.status !== 'cancelled') {
    await Ticket.updateMany({ booking: booking._id }, { status: 'cancelled', holdsSeat: false });
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    booking.cancelReason = reason;
    await booking.save();
  }

  if (!payment.refund?.status) {
    // admin-initiated refund, or an older cancellation that has no refund record yet
    payment.refund = {
      requestedBy: payment.status === 'paid' ? 'admin' : 'user',
      requestedByUser: payment.status === 'paid' ? req.user._id : payment.user,
      reason: payment.status === 'paid' ? reason : (booking?.cancelReason || 'Booking cancelled'),
      requestedAt: new Date(),
      amount: payment.amount,
    };
  }
  payment.refund.status = 'refunded';
  payment.refund.adminReason = reason;
  payment.refund.processedBy = req.user._id;
  payment.refund.processedAt = new Date();
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();

  await notify(payment.user, {
    title: 'Refund successful',
    message: `Your refund of ₱${Number(payment.amount || 0).toLocaleString('en-PH')} for booking ${booking?.bookingReference || ''} was successful. Reason: ${reason}`,
    type: 'payment',
    booking: payment.booking,
  });
  res.json(await withPopulate(payment._id));
});
