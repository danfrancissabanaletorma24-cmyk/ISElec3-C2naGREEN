
const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/my', c.getMyNotifications);

router.get('/all', adminOnly, c.getAllNotifications);

// Admin marks a notification as read in the admin view only
router.patch('/all/:id/read', adminOnly, c.adminMarkRead);

router.patch('/read-all', c.markAllRead);

router.post('/broadcast', adminOnly, c.broadcast);

router.patch('/:id/read', c.markRead);

router.delete('/:id', c.deleteNotification);

module.exports = router;