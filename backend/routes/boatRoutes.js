const router = require('express').Router();
const c = require('../controllers/boatController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', c.getAll);
router.get('/:id', c.getOne);
router.post('/', protect, adminOnly, c.create);
router.put('/:id', protect, adminOnly, c.update);
router.delete('/:id', protect, adminOnly, c.remove);

module.exports = router;
