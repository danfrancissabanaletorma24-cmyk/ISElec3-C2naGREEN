// Wraps async controllers so thrown errors go to the error middleware (no try/catch everywhere).
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
