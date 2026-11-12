const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/', c.createBooking);
router.get('/my', c.getMyBookings); // must stay above '/:id'
router.get('/', adminOnly, c.getAllBookings);
router.get('/:id', c.getBooking);
router.patch('/:id/cancel', c.cancelBooking);
router.get('/:id/reschedule-options', c.getRescheduleOptions);
router.post('/:id/reschedule', c.rescheduleBooking);

module.exports = router;
