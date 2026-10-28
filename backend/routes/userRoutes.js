const express = require('express');
const router = express.Router();
const { createUser, getUsers } = require('../controllers/userController');

// GET all users -> /api/users
router.get('/', getUsers);

// POST a new user -> /api/users
router.post('/', createUser);

module.exports = router;