const mongoose = require('mongoose');
const { BOOKING_TYPES, SEAT_CLASSES, FARE_CATEGORIES, TICKET_STATUS, GENDERS } = require('../config/constants');

const isPassenger = function () {
  return this.type === 'passenger';
};
const isCargo = function () {
  return this.type === 'cargo';
};

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true }, // use this for the QR code
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who booked
    type: { type: String, enum: BOOKING_TYPES, required: true },

    // ---- passenger ticket ----
    passenger: {
      firstName: { type: String, trim: true, required: [isPassenger, 'Passenger first name is required'] },
      lastName: { type: String, trim: true, required: [isPassenger, 'Passenger last name is required'] },
      age: { type: Number, min: 0, max: 120, required: [isPassenger, 'Passenger age is required'] },
      gender: { type: String, enum: GENDERS },
      // required for adults only (children may not have a number)
      contactNumber: {
        type: String,
        trim: true,
        required: [
          function () {
            return this.type === 'passenger' && this.passenger && this.passenger.age >= 18;
          },
          'Passenger contact number is required',
        ],
      },
    },
    isBooker: { type: Boolean, default: false }, // true if this passenger is the account holder
    seatNumber: { type: String, required: [isPassenger, 'Seat is required'] },
    seatClass: { type: String, enum: SEAT_CLASSES },
    fareCategory: { type: String, enum: FARE_CATEGORIES, default: 'regular' },
    holdsSeat: { type: Boolean, default: false }, // true while the seat is reserved (used by the unique index)

    // ---- cargo ticket ----
    cargo: {
      description: { type: String, trim: true, required: [isCargo, 'Cargo description is required'] },
      weightKg: { type: Number, min: [0.1, 'Weight must be greater than 0'], required: [isCargo, 'Cargo weight (kg) is required'] },
      recipientName: { type: String, trim: true, required: [isCargo, 'Recipient name is required'] },
      recipientContact: { type: String, trim: true, required: [isCargo, 'Recipient contact is required'] },
      vipSeatPrice: { type: Number, min: 0, default: 0 },
    },

    basePrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },

    status: { type: String, enum: TICKET_STATUS, default: 'valid' },
    boardedAt: Date,
  },
  { timestamps: true }
);

// Database-level protection against double-booking the same seat on the same trip.
ticketSchema.index({ trip: 1, seatNumber: 1 }, { unique: true, partialFilterExpression: { holdsSeat: true } });
ticketSchema.index({ trip: 1, type: 1, status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
