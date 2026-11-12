const mongoose = require('mongoose');

// A terminal / pier (e.g. "Batangas Port"). Routes connect two ports.
const portSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Port name is required'], trim: true, unique: true },
    code: { type: String, required: [true, 'Port code is required'], trim: true, uppercase: true, unique: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Port', portSchema);
