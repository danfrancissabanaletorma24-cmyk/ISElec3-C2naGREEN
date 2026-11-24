const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', c.register);
router.post('/admin/login', c.adminLogin);
router.post('/verify-mfa', c.verifyMfa);
router.post('/login', c.login);
router.get('/me', protect, c.getMe);
router.put('/me', protect, c.updateMe);
router.put('/change-password', protect, c.changePassword);
router.put('/reset-password', protect, c.resetPassword);

module.exports = router;
