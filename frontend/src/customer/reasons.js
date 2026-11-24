// Same rules as backend/utils/reason.js: 5-300 characters, at least 3 letters, not one repeated character.
export const REASON_MIN = 5;
export const REASON_MAX = 300;

/** Returns an error message, or '' when the reason is valid. */
export function validateReason(value, label = 'reason') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return `Please give a ${label}.`;
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (text.length < REASON_MIN || letters < 3 || /^(.)\1+$/u.test(text.replace(/\s/g, ''))) {
    return `Please give a valid ${label} (at least ${REASON_MIN} characters, in words).`;
  }
  if (text.length > REASON_MAX) return `Keep the ${label} to ${REASON_MAX} characters or fewer.`;
  return '';
}

export const cleanReasonText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
