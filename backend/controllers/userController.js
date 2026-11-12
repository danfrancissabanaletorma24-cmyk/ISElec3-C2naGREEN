// Admin user management (list, view, create, edit, delete)
const User = require('../models/User');
const Booking = require('../models/Booking');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const controller = crud(User, {
  searchFields: ['firstName', 'lastName', 'email', 'contactNumber'],
  filterFields: ['role', 'isActive'],
  prepare: async (data, _req, currentUser) => {
    if (!currentUser || data.email === undefined) return data;
    data.email = String(data.email).trim().toLowerCase();
    const emailOwner = await User.findOne({
      email: data.email,
      _id: { $ne: currentUser._id },
    });
    if (emailOwner) throw httpError(409, 'Email is already registered');
    return data;
  },
  beforeDelete: async (user) => {
    if (await Booking.exists({ user: user._id })) {
      throw httpError(409, 'User has bookings. Deactivate the account instead (isActive: false).');
    }
  },
});

controller.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw httpError(400, 'New password must be at least 6 characters');
  }

  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) throw httpError(404, 'User not found');

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password reset successfully' });
});

module.exports = controller;
