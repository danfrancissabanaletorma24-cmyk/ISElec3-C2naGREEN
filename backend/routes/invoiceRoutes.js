const router = require('express').Router();
const c = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/my', c.getMyInvoices);
router.get('/booking/:bookingId', c.getInvoiceByBooking);
router.get('/:id', c.getInvoice);

module.exports = router;
