const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    origin: { type: mongoose.Schema.Types.ObjectId, ref: 'Port', required: [true, 'Origin is required'] },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Port', required: [true, 'Destination is required'] },
    distanceKm: { type: Number, min: 0 },
    estimatedDurationMinutes: { type: Number, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

routeSchema.index({ origin: 1, destination: 1 }, { unique: true });

routeSchema.pre('validate', function () {
  if (this.origin && this.destination && this.origin.equals(this.destination)) {
    this.invalidate('destination', 'Destination must be different from origin');
  }
});

module.exports = mongoose.model('Route', routeSchema);
