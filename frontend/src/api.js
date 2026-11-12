const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// AuthContext registers a callback here so an expired / invalid token signs the person out everywhere.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and that the backend is running.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return payload;
}

/** Port codes / names of a trip's route, e.g. { fromCode: 'MBO', toCode: 'PDU', from: {...}, to: {...} }. */
export function tripRoute(trip) {
  const origin = trip?.route?.origin || {};
  const destination = trip?.route?.destination || {};
  return {
    fromCode: origin.code || '',
    toCode: destination.code || '',
    from: origin,
    to: destination,
  };
}
