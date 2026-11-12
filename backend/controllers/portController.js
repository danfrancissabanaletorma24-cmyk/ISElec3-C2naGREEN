const Port = require('../models/Port');
const Route = require('../models/Route');
const crud = require('./crudFactory');
const httpError = require('../utils/httpError');

module.exports = crud(Port, {
  searchFields: ['name', 'code', 'city', 'province'],
  filterFields: ['isActive'],
  beforeDelete: async (port) => {
    if (await Route.exists({ $or: [{ origin: port._id }, { destination: port._id }] })) {
      throw httpError(409, 'Port is used by a route. Delete the route first or set isActive: false.');
    }
  },
});
