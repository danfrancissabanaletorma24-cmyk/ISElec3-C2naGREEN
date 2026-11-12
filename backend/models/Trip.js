const mongoose = require('mongoose');
const { TRIP_STATUS } = require('../config/constants');

// A Trip = one scheduled sailing: a boat running a route at a specific date/time.
// This is what passengers actually book (they pick boat -> date/time -> seat).
const tripSchema = new mongoose.Schema(
  {
    boat: { type: mongoose.Schema.Types.ObjectId, ref: 'Boat', required: [true, 'Boat is required'] },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: [true, 'Route is required'] },
    departureAt: { type: Date, required: [true, 'Departure date/time is required'] },
    arrivalAt: { type: Date, required: [true, 'Arrival date/time is required'] },
    fares: {
      economy: { type: Number, min: 0, default: 0 },
      business: { type: Number, min: 0, default: 0 },
      vip: { type: Number, min: 0, default: 0 },
    },
    cargoRatePerKg: { type: Number, min: 0, default: 0 }, // cargo price = weightKg * this
    cargoCapacityKg: { type: Number, min: 0, default: 0 }, // defaults to the boat's capacity
    status: { type: String, enum: TRIP_STATUS, default: 'scheduled' },
    cancelReason: { type: String, trim: true }, // e.g. "Bad weather" (set by PATCH /api/trips/:id/cancel)
    cancelledAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

tripSchema.index({ departureAt: 1, status: 1 });
tripSchema.index({ route: 1, departureAt: 1 });

tripSchema.pre('validate', function () {
  if (this.departureAt && this.arrivalAt && this.arrivalAt <= this.departureAt) {
    this.invalidate('arrivalAt', 'Arrival must be after departure');
  }
});

module.exports = mongoose.model('Trip', tripSchema);
