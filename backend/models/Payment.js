const mongoose = require('mongoose');
const { PAYMENT_CHANNELS, PAYMENT_STATUS } = require('../config/constants');

const ALL_METHODS = ['cash', 'gcash', 'maya', 'card', 'bank_transfer'];

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: PAYMENT_CHANNELS, required: true }, // online | physical
    method: { type: String, enum: ALL_METHODS, required: true },
    walletProvider: { type: String, enum: ['gcash', 'maya'] },
    walletAccountLast4: { type: String, match: /^\d{4}$/ },
    cardBrand: { type: String, trim: true, maxlength: 30 },
    cardAccountLast4: { type: String, match: /^\d{4}$/ },
    bankTransferSenderName: { type: String, trim: true, maxlength: 100 },
    bankTransferSenderBank: { type: String, trim: true, maxlength: 80 },
    bankTransferReference: { type: String, trim: true, maxlength: 100 },
    bankTransferDate: Date,
    bankTransferProofFileName: { type: String, trim: true, maxlength: 200 },
    bankTransferProofMimeType: { type: String, enum: ['image/jpeg', 'image/png', 'application/pdf'] },
    bankTransferProofDataUrl: { type: String, maxlength: 3000000, select: false },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_STATUS, default: 'pending' },
    transactionRef: String, // gateway reference (online)
    receiptNumber: String, // official receipt (physical)
    dueAt: Date, // pay-at-counter deadline; unpaid bookings can be released after this
    paidAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin/cashier who received cash
    refundedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
