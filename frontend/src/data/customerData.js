// src/data/customerData.js
// Mock data for the customer side of LayagExpress. No backend — everything is in-memory.

export const DESTINATIONS = [
  { code: 'MNL', city: 'Manila', region: 'Luzon' },
  { code: 'CEB', city: 'Cebu', region: 'Visayas' },
  { code: 'TAG', city: 'Bohol', region: 'Visayas' },
  { code: 'MPH', city: 'Caticlan', region: 'Visayas' },
  { code: 'BOR', city: 'Boracay', region: 'Visayas' },
  { code: 'BCD', city: 'Bacolod', region: 'Visayas' },
  { code: 'ILO', city: 'Iloilo', region: 'Visayas' },
  { code: 'DGT', city: 'Dumaguete', region: 'Visayas' },
  { code: 'BTG', city: 'Batangas', region: 'Luzon' },
  { code: 'CPL', city: 'Calapan', region: 'Luzon' },
];

export const SHIP_TYPES = [
  { id: 'any', label: 'Any Type' },
  { id: 'fast-craft', label: 'Fast Craft' },
  { id: 'roro', label: 'RoRo / Ferry' },
  { id: 'cargo', label: 'Cargo' },
];

export const POPULAR_ROUTES = [
  { from: 'MNL', to: 'CEB', duration: '2h 30m', price: 840, shipType: 'fast-craft' },
  { from: 'CEB', to: 'TAG', duration: '2h 00m', price: 650, shipType: 'roro' },
  { from: 'MPH', to: 'BOR', duration: '1h 00m', price: 550, shipType: 'fast-craft' },
  { from: 'BCD', to: 'ILO', duration: '1h 30m', price: 420, shipType: 'roro' },
];

export const TRIPS = [
  {
    id: 1,
    name: 'SuperCat 2',
    shipType: 'fast-craft',
    type: 'Fast Craft',
    departure: '2:00 PM',
    arrival: '4:30 PM',
    duration: '2h 30m',
    price: 840,
    class: 'Economy',
    availableSeats: 45,
  },
  {
    id: 2,
    name: 'OceanJet 888',
    shipType: 'fast-craft',
    type: 'Fast Craft',
    departure: '3:00 PM',
    arrival: '5:15 PM',
    duration: '2h 15m',
    price: 780,
    class: 'Tourist',
    availableSeats: 12,
  },
  {
    id: 3,
    name: '2GO Maligaya',
    shipType: 'roro',
    type: 'RoRo / Ferry',
    departure: '6:00 PM',
    arrival: '6:00 AM',
    duration: '12h 00m',
    price: 660,
    class: 'Economy',
    availableSeats: 120,
  },
  {
    id: 4,
    name: 'Lite Ferry 5',
    shipType: 'roro',
    type: 'RoRo / Ferry',
    departure: '8:00 AM',
    arrival: '4:30 PM',
    duration: '8h 30m',
    price: 540,
    class: 'Economy',
    availableSeats: 86,
  },
  {
    id: 5,
    name: 'SuperCargo 1',
    shipType: 'cargo',
    type: 'Cargo',
    departure: '9:00 PM',
    arrival: '4:00 PM',
    duration: '19h 00m',
    price: 420,
    class: 'Deck',
    availableSeats: 200,
  },
];

export function getDestination(code) {
  return DESTINATIONS.find((destination) => destination.code === code) ?? DESTINATIONS[0];
}

export function getShipTypeLabel(id) {
  return (SHIP_TYPES.find((type) => type.id === id) ?? SHIP_TYPES[0]).label;
}

/** "2:00 PM" -> minutes since midnight */
export function timeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value ?? '');
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return hours * 60 + Number(match[2]);
}

/** "2h 30m" -> minutes */
export function durationToMinutes(value) {
  const match = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i.exec((value ?? '').trim());
  if (!match) return 0;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
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

export const TICKETS = [
  {
    id: 't1',
    bookingRef: 'TRZ-20260520-001234',
    status: 'upcoming',
    ship: 'SuperCat 2',
    shipType: 'Fast Craft',
    seatClass: 'Economy',
    from: 'MNL',
    to: 'CEB',
    date: '2026-05-20',
    departure: '2:00 PM',
    arrival: '4:30 PM',
    passenger: 'Kerwin Tagle',
    seats: ['B1', 'B2'],
    price: 1680,
  },
  {
    id: 't2',
    bookingRef: 'TRZ-20260302-000871',
    status: 'past',
    ship: 'OceanJet 888',
    shipType: 'Fast Craft',
    seatClass: 'Tourist',
    from: 'CEB',
    to: 'TAG',
    date: '2026-03-02',
    departure: '9:00 AM',
    arrival: '11:00 AM',
    passenger: 'Kerwin Tagle',
    seats: ['A1'],
    price: 780,
  },
  {
    id: 't3',
    bookingRef: 'TRZ-20260118-000412',
    status: 'past',
    ship: '2GO Maligaya',
    shipType: 'RoRo / Ferry',
    seatClass: 'Economy',
    from: 'BCD',
    to: 'ILO',
    date: '2026-01-18',
    departure: '6:00 PM',
    arrival: '7:30 PM',
    passenger: 'Kerwin Tagle',
    seats: ['C3'],
    price: 420,
  },
];

export const PAYMENT_METHODS = [
  {
    id: 'pm1',
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    holder: 'KERWIN TAGLE',
    expiry: '12/28',
    isDefault: true,
    gradient: 'from-blue-900 to-slate-800',
  },
  {
    id: 'pm2',
    type: 'card',
    brand: 'Mastercard',
    last4: '8812',
    holder: 'KERWIN TAGLE',
    expiry: '05/27',
    isDefault: false,
    gradient: 'from-slate-700 to-slate-900',
  },
  {
    id: 'pm3',
    type: 'ewallet',
    brand: 'GCash',
    account: '+63 912 *** 6789',
    isDefault: false,
  },
];

