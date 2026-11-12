const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const invoicePopulate = [
  { path: 'user', select: 'firstName lastName email contactNumber' },
  { path: 'payment', select: 'channel method status paidAt transactionRef receiptNumber dueAt' },
  {
    path: 'booking',
    select: 'bookingReference bookingType status trip',
    populate: {
      path: 'trip',
      select: 'departureAt arrivalAt route boat',
      populate: [
        { path: 'boat', select: 'name operator' },
        { path: 'route', populate: [{ path: 'origin', select: 'name code city' }, { path: 'destination', select: 'name code city' }] },
      ],
    },
  },
];

const check = (invoice, user) => {
  if (!invoice) throw httpError(404, 'Invoice not found');
  if (user.role !== 'admin' && String(invoice.user._id) !== String(user._id)) throw httpError(403, 'Not your invoice');
};

// GET /api/invoices/my
exports.getMyInvoices = asyncHandler(async (req, res) => {
  const data = await Invoice.find({ user: req.user._id }).populate(invoicePopulate).sort('-issuedAt');
  res.json({ data, total: data.length });
});

// GET /api/invoices/booking/:bookingId  (shown right after checkout)
exports.getInvoiceByBooking = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ booking: req.params.bookingId }).populate(invoicePopulate);
  check(invoice, req.user);
  res.json(invoice);
});

// GET /api/invoices/:id
exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate(invoicePopulate);
  check(invoice, req.user);
  res.json(invoice);
});
