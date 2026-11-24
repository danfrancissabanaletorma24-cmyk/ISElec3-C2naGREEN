// Run:  npm run seed                 -> admin account + real ports, ships, routes and the next 30 days of sailings
//       npm run seed -- --days=60    -> generate sailings 60 days ahead
//       npm run seed -- --reset      -> wipe ports / ships / routes / trips first (only if nobody has booked yet)
//
// Run it again any time (e.g. once a week) to add new days: it never duplicates sailings.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Port = require('../models/Port');
const Boat = require('../models/Boat');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const DAYS = Number((args.find((a) => a.startsWith('--days=')) || '').split('=')[1]) || 30;

// ---------------------------------------------------------------- ports
// Coordinates sit ON the coastline of each port town (checked against the Masbate / Albay / Sorsogon coast outlines),
// so the port markers on the maps are on the shore and the sea routes start in the water. Re-run `npm run seed` to apply.
const PORTS = [
  { code: 'MBO', name: 'Mobo Port', city: 'Mobo', province: 'Masbate', latitude: 12.3479, longitude: 123.6453 },
  { code: 'MSB', name: 'Masbate City Port', city: 'Masbate City', province: 'Masbate', latitude: 12.3663, longitude: 123.6337 },
  { code: 'PDU', name: 'Pio Duran Port', city: 'Pio Duran', province: 'Albay', latitude: 13.0272, longitude: 123.4476 },
  { code: 'PLR', name: 'Pilar Port', city: 'Pilar', province: 'Sorsogon', latitude: 12.9224, longitude: 123.6771 },
];

// ---------------------------------------------------------------- ships (pictures live in frontend/public/ships)
const seats = (economy, business = 0, vip = 0) => [
  ...Array.from({ length: economy }, (_, i) => ({ seatNumber: `E${i + 1}`, seatClass: 'economy' })),
  ...Array.from({ length: business }, (_, i) => ({ seatNumber: `B${i + 1}`, seatClass: 'business' })),
  ...Array.from({ length: vip }, (_, i) => ({ seatNumber: `V${i + 1}`, seatClass: 'vip' })),
];

const KHO = { operator: 'Kho Shipping Lines', logoUrl: '/ships/kho-logo.png' };
const MONTENEGRO = { operator: 'Montenegro Lines', logoUrl: '/ships/montenegro-logo.png' };

// registrationNumber is an internal fleet code - replace it with the vessel's MARINA number if you have it.
const BOATS = [
  {
    key: 'esperanza', ...KHO, name: 'MV Esperanza Star', registrationNumber: 'KSL-ESPERANZA-STAR', boatType: 'roro',
    seats: seats(100, 20), cargoCapacityKg: 60000, imageUrl: '/ships/kho-roro.jpg',
    amenities: ['Air-conditioned cabin', 'Bunk beds', 'Canteen', 'Vehicle deck', 'Life vests'],
    description: 'Roll-on/roll-off passenger and vehicle ferry of Kho Shipping Lines.',
  },
  {
    key: 'ricardo5', ...KHO, name: 'MV Ricardo 5', registrationNumber: 'KSL-RICARDO-5', boatType: 'fastcraft',
    seats: seats(70, 10), cargoCapacityKg: 1500, imageUrl: '/ships/kho-fast-craft.jpg',
    amenities: ['Air-conditioned cabin', 'Open upper deck', 'Life vests'],
    description: 'Twin-hull fast craft for quicker crossings between the Masbate and Sorsogon coasts.',
  },
  {
    key: 'mobo', ...KHO, name: 'MV Mobo', registrationNumber: 'KSL-MOBO', boatType: 'cargo',
    seats: seats(12), cargoCapacityKg: 120000, imageUrl: '/ships/kho-cargo.png',
    amenities: ['Cargo hold', 'Deck cargo space', 'Life vests'],
    description: 'Cargo vessel of Kho Shipping Lines. A few passenger seats are kept for people accompanying their cargo.',
  },
  {
    key: 'mtl-fast', ...MONTENEGRO, name: 'Montenegro Lines Fast Craft', registrationNumber: 'MTL-FASTCRAFT', boatType: 'fastcraft',
    seats: seats(60), cargoCapacityKg: 1000, imageUrl: '/ships/montenegro-fast-craft.jpg',
    amenities: ['Air-conditioned cabin', 'Life vests'],
    description: 'Fast craft of Montenegro Lines for short, quick crossings.',
  },
  {
    key: 'mtl-roro', ...MONTENEGRO, name: 'Montenegro Lines RoRo', registrationNumber: 'MTL-RORO', boatType: 'roro',
    seats: seats(150, 24), cargoCapacityKg: 50000, imageUrl: '/ships/montenegro-roro.jpg',
    amenities: ['Air-conditioned cabin', 'Canteen', 'Vehicle deck', 'Life vests'],
    description: 'Roll-on/roll-off passenger and vehicle ferry of Montenegro Lines.',
  },
];

// ---------------------------------------------------------------- daily sailings (Philippine time)
// fares / times / durations are planning estimates - edit them here to match the operators' real schedules, then re-run with --reset.
const SAILINGS = [
  // Kho - MV Esperanza Star (RoRo)
  { boat: 'esperanza', from: 'MBO', to: 'PDU', at: '05:00', minutes: 300, fares: { economy: 380, business: 560 }, cargo: 6 },
  { boat: 'esperanza', from: 'PDU', to: 'MBO', at: '12:00', minutes: 300, fares: { economy: 380, business: 560 }, cargo: 6 },
  { boat: 'esperanza', from: 'MBO', to: 'PDU', at: '13:00', minutes: 300, fares: { economy: 380, business: 560 }, cargo: 6 },
  { boat: 'esperanza', from: 'PDU', to: 'MBO', at: '18:00', minutes: 300, fares: { economy: 380, business: 560 }, cargo: 6 },
  // Kho - MV Ricardo 5 (fast craft)
  { boat: 'ricardo5', from: 'MBO', to: 'PLR', at: '07:00', minutes: 135, fares: { economy: 320, business: 450 }, cargo: 12 },
  { boat: 'ricardo5', from: 'PLR', to: 'MBO', at: '10:00', minutes: 135, fares: { economy: 320, business: 450 }, cargo: 12 },
  { boat: 'ricardo5', from: 'MBO', to: 'PLR', at: '14:00', minutes: 135, fares: { economy: 320, business: 450 }, cargo: 12 },
  { boat: 'ricardo5', from: 'PLR', to: 'MBO', at: '17:00', minutes: 135, fares: { economy: 320, business: 450 }, cargo: 12 },
  // Kho - MV Mobo (cargo ship, overnight)
  { boat: 'mobo', from: 'MBO', to: 'PDU', at: '20:00', minutes: 330, fares: { economy: 300 }, cargo: 5 },
  { boat: 'mobo', from: 'PDU', to: 'MBO', at: '04:00', minutes: 330, fares: { economy: 300 }, cargo: 5 },
  // Montenegro Lines - fast craft
  { boat: 'mtl-fast', from: 'MSB', to: 'MBO', at: '09:30', minutes: 30, fares: { economy: 150 }, cargo: 5 },
  { boat: 'mtl-fast', from: 'MBO', to: 'MSB', at: '10:30', minutes: 30, fares: { economy: 150 }, cargo: 5 },
  { boat: 'mtl-fast', from: 'MSB', to: 'MBO', at: '15:00', minutes: 30, fares: { economy: 150 }, cargo: 5 },
  { boat: 'mtl-fast', from: 'MBO', to: 'MSB', at: '16:00', minutes: 30, fares: { economy: 150 }, cargo: 5 },
  { boat: 'mtl-fast', from: 'MSB', to: 'PLR', at: '06:30', minutes: 105, fares: { economy: 350 }, cargo: 12 },
  { boat: 'mtl-fast', from: 'PLR', to: 'MSB', at: '09:00', minutes: 105, fares: { economy: 350 }, cargo: 12 },
  { boat: 'mtl-fast', from: 'MSB', to: 'PLR', at: '13:00', minutes: 105, fares: { economy: 350 }, cargo: 12 },
  { boat: 'mtl-fast', from: 'PLR', to: 'MSB', at: '15:30', minutes: 105, fares: { economy: 350 }, cargo: 12 },
  // Montenegro Lines - RoRo
  { boat: 'mtl-roro', from: 'MSB', to: 'PDU', at: '08:00', minutes: 240, fares: { economy: 400, business: 600 }, cargo: 6 },
  { boat: 'mtl-roro', from: 'MSB', to: 'PDU', at: '16:00', minutes: 240, fares: { economy: 400, business: 600 }, cargo: 6 },
  { boat: 'mtl-roro', from: 'PDU', to: 'MSB', at: '14:00', minutes: 240, fares: { economy: 400, business: 600 }, cargo: 6 },
  { boat: 'mtl-roro', from: 'PDU', to: 'MSB', at: '20:00', minutes: 240, fares: { economy: 400, business: 600 }, cargo: 6 },
];

const toRad = (v) => (v * Math.PI) / 180;
const km = (a, b) => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
};

async function removeLegacySamples() {
  // the very first seed created a placeholder ferry + Batangas/Calapan route; real data replaces it
  const legacyBoat = await Boat.findOne({ registrationNumber: 'REG-0001' });
  const legacyPorts = await Port.find({ code: { $in: ['BAT', 'CAL'] }, name: { $in: ['Batangas Port', 'Calapan Port'] } });
  if (!legacyBoat && !legacyPorts.length) return;

  const legacyTrips = legacyBoat ? await Trip.find({ boat: legacyBoat._id }).distinct('_id') : [];
  if (legacyTrips.length && (await Booking.exists({ trip: { $in: legacyTrips } }))) {
    legacyBoat.status = 'retired';
    await legacyBoat.save();
    console.log('Old sample ferry has bookings - marked as retired instead of deleted');
    return;
  }
  const portIds = legacyPorts.map((p) => p._id);
  await Trip.deleteMany({ _id: { $in: legacyTrips } });
  await Route.deleteMany({ $or: [{ origin: { $in: portIds } }, { destination: { $in: portIds } }] });
  if (legacyBoat) await legacyBoat.deleteOne();
  await Port.deleteMany({ _id: { $in: portIds } });
  console.log('Removed the old sample ferry and sample ports');
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // ---- admin
  const email = process.env.ADMIN_EMAIL || 'admin@shipticket.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  if (!(await User.findOne({ email }))) {
    await User.create({ firstName: 'System', lastName: 'Admin', age: 30, gender: 'other', contactNumber: '09170000000', email, password, role: 'admin' });
    console.log(`Admin created: ${email} / ${password}  (change this password!)`);
  } else console.log('Admin already exists');

  // ---- optional wipe
  if (RESET) {
    if (await Booking.exists({})) {
      console.log('--reset skipped: there are already bookings. Cancel/delete them first, or just run the seed without --reset.');
    } else {
      await Promise.all([Trip.deleteMany({}), Route.deleteMany({}), Boat.deleteMany({}), Port.deleteMany({})]);
      console.log('Cleared ports, ships, routes and trips');
    }
  }
  await removeLegacySamples();

  // ---- ports
  const ports = {};
  for (const p of PORTS) {
    ports[p.code] = await Port.findOneAndUpdate({ code: p.code }, { ...p, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  // ---- ships
  const boats = {};
  for (const { key, ...b } of BOATS) {
    boats[key] = await Boat.findOneAndUpdate({ registrationNumber: b.registrationNumber }, { ...b, status: 'active' }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  // ---- routes (both directions)
  const routes = {};
  const pairs = new Set(SAILINGS.map((s) => `${s.from}-${s.to}`));
  for (const pair of pairs) {
    const [from, to] = pair.split('-');
    const minutes = Math.max(...SAILINGS.filter((s) => s.from === from && s.to === to).map((s) => s.minutes));
    routes[pair] = await Route.findOneAndUpdate(
      { origin: ports[from]._id, destination: ports[to]._id },
      { distanceKm: km(PORTS.find((p) => p.code === from), PORTS.find((p) => p.code === to)), estimatedDurationMinutes: minutes, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  // ---- sailings for the next DAYS days
  const now = Date.now();
  const todayPH = new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10); // YYYY-MM-DD in Philippine time
  const existing = new Set(
    (await Trip.find({ departureAt: { $gte: new Date(now - 24 * 3600 * 1000) } }).select('boat route departureAt'))
      .map((t) => `${t.boat}|${t.route}|${t.departureAt.getTime()}`),
  );

  const fresh = [];
  for (let d = 0; d < DAYS; d += 1) {
    const day = new Date(`${todayPH}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + d);
    const ymd = day.toISOString().slice(0, 10);
    for (const s of SAILINGS) {
      const departureAt = new Date(`${ymd}T${s.at}:00+08:00`);
      if (departureAt.getTime() <= now + 30 * 60 * 1000) continue; // no sailings that are about to leave
      const boat = boats[s.boat];
      const route = routes[`${s.from}-${s.to}`];
      if (existing.has(`${boat._id}|${route._id}|${departureAt.getTime()}`)) continue;
      fresh.push({
        boat: boat._id,
        route: route._id,
        departureAt,
        arrivalAt: new Date(departureAt.getTime() + s.minutes * 60000),
        fares: s.fares,
        cargoRatePerKg: s.cargo,
        cargoCapacityKg: boat.cargoCapacityKg,
      });
    }
  }
  if (fresh.length) await Trip.insertMany(fresh);
  console.log(`Ports: ${PORTS.length}, ships: ${BOATS.length}, routes: ${pairs.size}, new sailings added: ${fresh.length}`);

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
