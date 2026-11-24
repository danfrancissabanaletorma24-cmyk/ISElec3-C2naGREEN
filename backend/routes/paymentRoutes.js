const router = require('express').Router();
const c = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/my', c.getMyPayments);
router.get('/', adminOnly, c.getAllPayments);
router.get('/:id', c.getPayment);
router.post('/:id/pay-online', c.payOnline);
router.patch('/:id/confirm', adminOnly, c.confirmPhysical);
router.post('/:id/refund-request', c.requestRefund);
router.patch('/:id/refund', adminOnly, c.markRefunded);

module.exports = router;
