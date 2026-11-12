const mongoose = require('mongoose');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../config/constants');

// One checkout = one Booking. It owns 1..n Tickets (one per passenger, or one cargo ticket).
const bookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    bookingType: { type: String, enum: BOOKING_TYPES, required: true },
    status: { type: String, enum: BOOKING_STATUS, default: 'pending' },
    totalAmount: { type: Number, required: true, min: 0 },
    cancelledAt: Date,
    cancelReason: { type: String, trim: true },
    rescheduleHistory: [
      {
        fromTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
        toTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
        reason: String,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

bookingSchema.virtual('tickets', { ref: 'Ticket', localField: '_id', foreignField: 'booking' });
bookingSchema.virtual('payment', { ref: 'Payment', localField: '_id', foreignField: 'booking', justOne: true });
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
