const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generates getAll / getOne / create / update / remove for a model.
// options: populate, searchFields, filterFields, prepare(body, req), beforeDelete(doc)
module.exports = (Model, options = {}) => {
  const { populate, searchFields = [], filterFields = [], prepare, beforeDelete } = options;
  const withPopulate = (q) => (populate ? q.populate(populate) : q);

  return {
    getAll: asyncHandler(async (req, res) => {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const sort = typeof req.query.sort === 'string' ? req.query.sort : '-createdAt';

      const filter = {};
      // only accept plain strings (blocks NoSQL operator injection like ?status[$ne]=x)
      filterFields.forEach((f) => {
        if (typeof req.query[f] === 'string') filter[f] = req.query[f];
      });
      if (typeof req.query.search === 'string' && req.query.search && searchFields.length) {
        filter.$or = searchFields.map((f) => ({ [f]: { $regex: escapeRegex(req.query.search), $options: 'i' } }));
      }

      const [data, total] = await Promise.all([
        withPopulate(Model.find(filter)).sort(sort).skip((page - 1) * limit).limit(limit),
        Model.countDocuments(filter),
      ]);
      res.json({ data, total, page, pages: Math.ceil(total / limit) });
    }),

    getOne: asyncHandler(async (req, res) => {
      const doc = await withPopulate(Model.findById(req.params.id));
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      res.json(doc);
    }),

    create: asyncHandler(async (req, res) => {
      const body = prepare ? await prepare({ ...req.body }, req) : req.body;
      const doc = await Model.create(body);
      res.status(201).json(await withPopulate(Model.findById(doc._id)));
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      const body = prepare ? await prepare({ ...req.body }, req, doc) : req.body;
      delete body._id;
      doc.set(body);
      await doc.save(); // runs validators + hooks (e.g. password hashing)
      res.json(await withPopulate(Model.findById(doc._id)));
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      if (beforeDelete) await beforeDelete(doc);
      await doc.deleteOne();
      res.json({ message: `${Model.modelName} deleted` });
    }),
  };
};
