const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { GENDERS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, trim: true, default: '' },
    age: {
      type: Number,
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age must be 120 or below'],
    },
    gender: {
      type: String,
      enum: { values: GENDERS, message: 'Invalid gender' },
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      validate: {
        validator: (value) => (value.match(/\d/g) || []).length >= 10,
        message: 'Enter a valid mobile number with at least 10 digits',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned unless explicitly asked for
    },
    address: { type: String, trim: true, maxlength: [200, 'Address is too long'], default: '' },
    avatar: { type: String, default: '', maxlength: [3000000, 'Photo is too large'] }, // small image as a data URL
    preferences: {
      notificationsEmail: { type: Boolean, default: true },
      notificationsSms: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      defaultClass: { type: String, enum: ['economy', 'business', 'vip'], default: 'economy' },
      language: { type: String, trim: true },
      currency: { type: String, trim: true },
      wallets: {
        type: [{
          provider: { type: String, enum: ['gcash', 'maya'], required: true },
          accountNumber: { type: String, trim: true, required: true },
        }],
        default: [],
      },
      cards: {
        type: [{
          holderName: { type: String, trim: true, required: true, maxlength: 80 },
          brand: { type: String, trim: true, required: true, minlength: 2, maxlength: 30 },
          last4: { type: String, match: /^\d{4}$/, required: true },
          expiryMonth: { type: Number, min: 1, max: 12, required: true },
          expiryYear: { type: Number, min: 2020, max: 9999, required: true },
          isDefault: { type: Boolean, default: false },
        }],
        default: [],
      },
    },
    adminNotificationSettings: {
      type: new mongoose.Schema({
        newBooking: { type: Boolean, default: true },
        cancellations: { type: Boolean, default: true },
        lowOccupancy: { type: Boolean, default: false },
        dailyDigest: { type: Boolean, default: true },
      }, { _id: false }),
      default: () => ({}),
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    totpSecret: { type: String, select: false },
    totpEnabled: { type: Boolean, default: false },
    totpLastUsedStep: { type: Number, select: false },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

userSchema.virtual('name').get(function () {
  return this.fullName;
});

userSchema.virtual('mobile')
  .get(function () {
    return this.contactNumber;
  })
  .set(function (value) {
    this.contactNumber = value;
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
