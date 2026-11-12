
const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

// GET /api/notifications/my?unread=true
// Get notifications for the logged-in customer
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.unread === 'true') {
    filter.isRead = false;
  }

  const [data, unreadCount] = await Promise.all([
    Notification.find(filter).sort('-createdAt').limit(100),
    Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    }),
  ]);

  res.json({ data, unreadCount });
});

// GET /api/notifications/all (admin)
// Get all notifications across all users
exports.getAllNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

  const [data, total, unreadCount] = await Promise.all([
    Notification.find()
      .populate('user', 'firstName lastName email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),

    Notification.countDocuments(),

    // Count unread notifications in the admin view only
    // Also includes older notifications without adminIsRead
    Notification.countDocuments({
      $or: [
        { adminIsRead: false },
        { adminIsRead: { $exists: false } },
      ],
    }),
  ]);

  res.json({
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
    unreadCount,
  });
});

// PATCH /api/notifications/read-all
// Mark all customer notifications as read
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  res.json({ message: 'All notifications marked as read' });
});

// PATCH /api/notifications/:id/read
// Mark one customer's notification as read
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
    },
    {
      isRead: true,
    },
    {
      new: true,
    }
  );

  if (!n) {
    throw httpError(404, 'Notification not found');
  }

  res.json(n);
});

// PATCH /api/notifications/all/:id/read
// Mark one notification as read in the admin view only
exports.adminMarkRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    {
      adminIsRead: true,
    },
    {
      new: true,
    }
  );

  if (!notification) {
    throw httpError(404, 'Notification not found');
  }

  res.json(notification);
});

// DELETE /api/notifications/:id
// Delete a customer's own notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!n) {
    throw httpError(404, 'Notification not found');
  }

  res.json({ message: 'Notification deleted' });
});

// POST /api/notifications/broadcast
// Send notifications to selected users or all active users
exports.broadcast = asyncHandler(async (req, res) => {
  const { title, message, userIds } = req.body;

  if (!title || !message) {
    throw httpError(400, 'title and message are required');
  }

  const ids =
    Array.isArray(userIds) && userIds.length
      ? userIds
      : await User.find({
          role: 'user',
          isActive: true,
        }).distinct('_id');

  await Notification.insertMany(
    ids.map((user) => ({
      user,
      title,
      message,
      type: 'system',
    }))
  );

  res.status(201).json({
    message: `Sent to ${ids.length} user(s)`,
  });
});
