const mongoose = require('mongoose');
const { SEAT_CLASSES, BOAT_TYPES, BOAT_STATUS } = require('../config/constants');

const seatSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true, trim: true },
    seatClass: { type: String, enum: SEAT_CLASSES, default: 'economy' },
  },
  { _id: false }
);

const boatSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Boat name is required'], trim: true },
    registrationNumber: { type: String, required: [true, 'Registration number is required'], trim: true, unique: true },
    boatType: { type: String, enum: BOAT_TYPES, default: 'ferry' },
    seats: {
      type: [seatSchema],
      validate: [(arr) => arr.length > 0, 'Boat needs at least one seat'],
    },
    defaultFare: { type: Number, min: 0, default: 0 },
    defaultFares: {
      economy: { type: Number, min: 0, default: 0 },
      business: { type: Number, min: 0, default: 0 },
      vip: { type: Number, min: 0, default: 0 },
    },
    cargoCapacityKg: { type: Number, default: 0, min: 0 },
    amenities: [{ type: String, trim: true }], // e.g. "Aircon", "Cafeteria"
    imageUrl: { type: String, trim: true },
    operator: { type: String, trim: true }, // shipping company, e.g. "Kho Shipping Lines"
    logoUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: BOAT_STATUS, default: 'active' },
  },
  { timestamps: true }
);

boatSchema.virtual('seatCapacity').get(function () {
  return this.seats ? this.seats.length : undefined; // seats may not be selected in a populate
});
boatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Boat', boatSchema);
