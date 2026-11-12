const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats', protect, adminOnly, c.getStats);

module.exports = router;
