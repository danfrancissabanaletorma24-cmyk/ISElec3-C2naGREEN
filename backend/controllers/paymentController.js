const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
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

// PATCH /api/payments/:id/refund  (admin)
exports.markRefunded = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status !== 'refund_pending') throw httpError(400, 'Only payments with refund_pending can be refunded');
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();
  await notify(payment.user, { title: 'Refund completed', message: 'Your refund has been processed.', type: 'payment', booking: payment.booking });
  res.json(payment);
});
