const router = require('express').Router();
const c = require('../controllers/ticketController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/my', c.getMyTickets);
router.get('/verify/:ticketNumber', adminOnly, c.verifyTicket);
router.get('/:id', c.getTicket);
router.patch('/:id/board', adminOnly, c.boardTicket);

module.exports = router;
