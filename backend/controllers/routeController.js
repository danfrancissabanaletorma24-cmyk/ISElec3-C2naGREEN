const Route = require('../models/Route');
const crud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const controller = crud(Route, {
  populate: [
    { path: 'origin', select: 'name code city' },
    { path: 'destination', select: 'name code city' },
  ],
  filterFields: ['origin', 'destination', 'isActive'],
});

controller.remove = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw httpError(404, 'Route not found');
  route.isActive = false;
  await route.save();
  res.json({ message: 'Route deleted' });
});

module.exports = controller;
