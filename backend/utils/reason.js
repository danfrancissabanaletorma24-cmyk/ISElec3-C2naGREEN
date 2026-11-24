const httpError = require('./httpError');

const MIN_LENGTH = 5;
const MAX_LENGTH = 300;

// Cleans and validates a reason typed by a customer or an admin (cancel / reschedule).
// A valid reason: 5-300 characters, at least 3 letters, and not one character repeated ("aaaaa", "-----").
// Returns the trimmed text, or '' when it is optional and empty. Throws a 400 otherwise.
exports.cleanReason = (value, { label = 'reason', required = true } = {}) => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) {
    if (!required) return '';
    throw httpError(400, `Please give a ${label}`);
  }
  const letters = (text.match(/\p{L}/gu) || []).length;
  const compact = text.replace(/\s/g, '');
  if (text.length < MIN_LENGTH || letters < 3 || /^(.)\1+$/u.test(compact)) {
    throw httpError(400, `Please give a valid ${label} (at least ${MIN_LENGTH} characters, in words)`);
  }
  if (text.length > MAX_LENGTH) throw httpError(400, `The ${label} must be ${MAX_LENGTH} characters or fewer`);
  return text;
};
