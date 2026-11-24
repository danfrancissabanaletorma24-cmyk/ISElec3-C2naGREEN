const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

// Requires a valid "Authorization: Bearer <token>" header
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw httpError(401, 'Not authorized, no token');
  const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  if (decoded.purpose) throw httpError(401, 'Not authorized');
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw httpError(401, 'Account not found or deactivated');
  req.user = user;
  next();
});

exports.adminOnly = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : next(httpError(403, 'Admin access only'));
