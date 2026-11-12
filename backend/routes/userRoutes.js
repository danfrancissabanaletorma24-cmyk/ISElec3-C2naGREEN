const router = require('express').Router();
const c = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.route('/').get(c.getAll).post(c.create);
router.put('/:id/reset-password', c.resetPassword);
router.route('/:id').get(c.getOne).put(c.update).delete(c.remove);

module.exports = router;
