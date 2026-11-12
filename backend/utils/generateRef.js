const crypto = require('crypto');
// e.g. generateRef('TKT') -> TKT-LZ4K2A9F1B2C
module.exports = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
