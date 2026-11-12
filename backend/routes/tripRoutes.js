const router = require('express').Router();
const c = require('../controllers/tripController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', c.getTrips);
router.get('/:id', c.getTrip);
router.get('/:id/seats', c.getSeats);
router.post('/', protect, adminOnly, c.createTrip);
router.put('/:id', protect, adminOnly, c.updateTrip);
router.patch('/:id/cancel', protect, adminOnly, c.cancelTrip);
router.delete('/:id', protect, adminOnly, c.deleteTrip);

module.exports = router;
