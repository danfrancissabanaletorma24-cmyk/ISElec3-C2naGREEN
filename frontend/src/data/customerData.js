// src/data/customerData.js
// Small shared helpers + labels for the customer side. All trip / booking / ticket data
// now comes from the backend API - nothing in here is sample data.
import { getDestination } from './ports';

export { getDestination };

export const SHIP_TYPES = [
  { id: 'fastcraft', label: 'Fast Craft' },
  { id: 'roro', label: 'RoRo / Ferry' },
  { id: 'cargo', label: 'Cargo Ship' },
];

const BOAT_TYPE_LABELS = {
  fastcraft: 'Fast Craft',
  roro: 'RoRo / Ferry',
  ferry: 'Ferry',
  cargo: 'Cargo Ship',
};

export const SEAT_CLASS_LABELS = { economy: 'Economy', business: 'Business', vip: 'VIP' };

export const FARE_CATEGORY_LABELS = {
  regular: 'Regular',
  student: 'Student',
  senior: 'Senior citizen',
  pwd: 'PWD',
  child: 'Child',
};

// Mirrors backend/config/constants.js DISCOUNT_RATES so the price shown before booking matches the invoice.
export const DISCOUNT_RATES = { regular: 0, student: 0.2, senior: 0.2, pwd: 0.2, child: 0.5 };

export function getShipTypeLabel(id) {
  return BOAT_TYPE_LABELS[id] ?? (SHIP_TYPES.find((type) => type.id === id) ?? SHIP_TYPES[0]).label;
}

export function getSeatClassLabel(id) {
  return SEAT_CLASS_LABELS[id] ?? id ?? '';
}

export function computeFare(basePrice, fareCategory = 'regular') {
  const rate = DISCOUNT_RATES[fareCategory] ?? 0;
  const discountAmount = Math.round(basePrice * rate * 100) / 100;
  return { basePrice, discountAmount, price: Math.round((basePrice - discountAmount) * 100) / 100 };
}

/** Local YYYY-MM-DD (avoids the UTC off-by-one). */
export function toISODate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** "2026-05-20" -> "May 20, 2026" */
export function formatISODate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const MANILA = 'Asia/Manila';

/** ISO timestamp -> "2:00 PM" in Philippine time. */
export function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: MANILA });
}

/** ISO timestamp -> "Nov 14, 2026" in Philippine time. */
export function formatDate(iso, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { ...options, timeZone: MANILA });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** ISO timestamp -> YYYY-MM-DD in Philippine time. */
export function phDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Minutes between two ISO timestamps -> "2h 15m". */
export function formatTripDuration(departureIso, arrivalIso) {
  const minutes = Math.round((new Date(arrivalIso) - new Date(departureIso)) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function hoursUntil(iso) {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

export const CANCEL_WINDOW_HOURS = 4; // keep in sync with backend MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL

export function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

export function fullName(person) {
  if (!person) return '';
  return [person.firstName, person.lastName].filter(Boolean).join(' ');
}
