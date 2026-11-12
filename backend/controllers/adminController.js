const User = require('../models/User');
const Boat = require('../models/Boat');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/stats  - numbers for the admin dashboard
exports.getStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [users, activeBoats, upcomingTrips, bookingsByStatus, bookingsToday, revenueAgg, pendingCounterPayments, recentBookings] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Boat.countDocuments({ status: 'active' }),
    Trip.countDocuments({ departureAt: { $gte: new Date() }, status: { $in: ['scheduled', 'delayed', 'boarding'] } }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.countDocuments({ createdAt: { $gte: startOfToday } }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.countDocuments({ channel: 'physical', status: 'pending' }),
    Booking.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('user', 'firstName lastName email contactNumber'),
  ]);

  res.json({
    users,
    activeBoats,
    upcomingTrips,
    bookingsToday,
    pendingCounterPayments,
    totalRevenue: revenueAgg[0] ? revenueAgg[0].total : 0,
    bookingsByStatus: Object.fromEntries(bookingsByStatus.map((b) => [b._id, b.count])),
    recentBookings,
  });
});
