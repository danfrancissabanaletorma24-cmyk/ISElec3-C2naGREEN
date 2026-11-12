const Notification = require('../models/Notification');

// Never let a failed notification break the main request.
exports.notify = async (user, { title, message, type = 'system', booking, trip }) => {
  try {
    return await Notification.create({ user, title, message, type, booking, trip });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

exports.notifyMany = async (userIds, payload) => {
  try {
    if (!userIds.length) return;
    await Notification.insertMany(userIds.map((user) => ({ user, type: 'trip', ...payload })));
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};
