
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const generateRef = require('../utils/generateRef');
const { notify } = require('../utils/notify');
const { computeFare, computeCargoPrice, round2 } = require('../utils/pricing');
const C = require('../config/constants');

const bookingPopulate = [
  {
    path: 'trip',
    populate: [
      { path: 'boat', select: 'name boatType operator logoUrl imageUrl' },
      {
        path: 'route',
        populate: [
          { path: 'origin', select: 'name code city province latitude longitude' },
          { path: 'destination', select: 'name code city province latitude longitude' },
        ],
      },
    ],
  },
  { path: 'tickets' },
  {
    path: 'payment',
    select: '+bankTransferProofDataUrl',
  },
];

const isOwnerOrAdmin = (doc, user) => user.role === 'admin' || String(doc.user._id || doc.user) === String(user._id);

// ---- helpers: build ticket docs ----
const buildPassengerTickets = async (trip, passengers, user) => {
  if (!Array.isArray(passengers) || !passengers.length) throw httpError(400, 'Add at least one passenger');
  if (passengers.length > C.MAX_PASSENGERS_PER_BOOKING) throw httpError(400, `Maximum ${C.MAX_PASSENGERS_PER_BOOKING} passengers per booking`);

  const seatNumbers = passengers.map((p) => p.seatNumber);
  if (new Set(seatNumbers).size !== seatNumbers.length) throw httpError(400, 'Each passenger needs a different seat');

  const taken = await Ticket.find({ trip: trip._id, holdsSeat: true, seatNumber: { $in: seatNumbers } }).distinct('seatNumber');
  if (taken.length) throw httpError(409, `Seat already taken: ${taken.join(', ')}`);

  const seatMap = new Map(trip.boat.seats.map((s) => [s.seatNumber, s]));
  return passengers.map((p, i) => {
    const seat = seatMap.get(p.seatNumber);
    if (!seat) throw httpError(400, `Seat "${p.seatNumber}" does not exist on this boat`);
    const fareCategory = p.fareCategory || 'regular';
    if (!C.FARE_CATEGORIES.includes(fareCategory)) throw httpError(400, `Invalid fare category: ${fareCategory}`);

    const info = i === 0 && p.useMyDetails
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          age: user.age ?? p.age,
          gender: user.gender ?? p.gender,
          contactNumber: user.contactNumber,
        }
      : { firstName: p.firstName, lastName: p.lastName, age: p.age, gender: p.gender, contactNumber: p.contactNumber };

    return {
      type: 'passenger',
      passenger: info,
      isBooker: i === 0 && !!p.useMyDetails,
      seatNumber: seat.seatNumber,
      seatClass: seat.seatClass,
      fareCategory,
      holdsSeat: true,
      ...computeFare(trip.fares[seat.seatClass], fareCategory),
    };
  });
};

const buildCargoTicket = async (trip, cargo) => {
  const weightKg = Number(cargo && cargo.weightKg);
  const description = String(cargo && cargo.description || '').trim();
  const recipientName = String(cargo && cargo.recipientName || '').trim();
  const recipientContact = String(cargo && cargo.recipientContact || '').trim();
  if (!(weightKg > 0)) throw httpError(400, 'Cargo weight (kg) must be greater than 0');
  if (!description) throw httpError(400, 'Cargo description is required');
  if (!recipientName) throw httpError(400, 'Recipient name is required');
  if (!recipientContact) throw httpError(400, 'Recipient contact is required');
  if (!(trip.cargoRatePerKg > 0)) throw httpError(400, 'This trip does not accept cargo');

  const [used] = await Ticket.aggregate([
    { $match: { trip: trip._id, type: 'cargo', status: { $in: ['valid', 'boarded'] } } },
    { $group: { _id: null, kg: { $sum: '$cargo.weightKg' } } },
  ]);
  const available = trip.cargoCapacityKg - (used ? used.kg : 0);
  if (weightKg > available) throw httpError(400, `Not enough cargo space. Available: ${available} kg`);

  const seatNumber = String(cargo.vipSeatNumber || '').trim();
  let seat;
  let vipSeatPrice = 0;
  if (seatNumber) {
    seat = trip.boat.seats.find((item) => item.seatNumber === seatNumber);
    if (!seat || seat.seatClass !== 'vip') throw httpError(400, 'Choose a valid VIP seat');
    vipSeatPrice = Number(trip.fares.vip);
    if (!(vipSeatPrice > 0)) throw httpError(400, 'This trip does not offer a priced VIP seat');
    if (await Ticket.exists({ trip: trip._id, holdsSeat: true, seatNumber })) {
      throw httpError(409, `VIP seat ${seatNumber} is already taken`);
    }
  }

  const cargoPrice = computeCargoPrice(weightKg, trip.cargoRatePerKg);
  const price = round2(cargoPrice + vipSeatPrice);
  return [{
    type: 'cargo',
    cargo: {
      description,
      weightKg,
      recipientName,
      recipientContact,
      vipSeatPrice,
    },
    ...(seat ? { seatNumber: seat.seatNumber, seatClass: seat.seatClass, holdsSeat: true } : {}),
    basePrice: price,
    discountAmount: 0,
    price,
  }];
};

// POST /api/bookings
exports.createBooking = asyncHandler(async (req, res) => {
  const { tripId, bookingType, passengers, cargo, payment = {} } = req.body;

  if (!C.BOOKING_TYPES.includes(bookingType)) throw httpError(400, 'bookingType must be "passenger" or "cargo"');
  if (!C.PAYMENT_CHANNELS.includes(payment.channel)) throw httpError(400, 'payment.channel must be "online" or "physical"');
  if (!C.PAYMENT_METHODS[payment.channel].includes(payment.method)) {
    throw httpError(400, `payment.method for ${payment.channel} must be one of: ${C.PAYMENT_METHODS[payment.channel].join(', ')}`);
  }

  let bankTransferDetails;
  if (payment.method === 'bank_transfer') {
    const details = payment.bankTransfer;
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
      throw httpError(400, 'Bank transfer details and proof are required');
    }
    const senderName = String(details.senderName || '').trim();
    const senderBank = String(details.senderBank || '').trim();
    const referenceNumber = String(details.referenceNumber || '').trim();
    const transferDate = new Date(details.transferDate);
    const proofFileName = String(details.proofFileName || '').split(/[\\/]/).pop().slice(0, 200);
    const proofMimeType = String(details.proofMimeType || '');
    const proofDataUrl = String(details.proofDataUrl || '');
    const proofMatch = proofDataUrl.match(/^data:(image\/jpeg|image\/png|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/);

    if (senderName.length < 2 || senderName.length > 100) throw httpError(400, 'Enter the transfer sender name');
    if (senderBank.length < 2 || senderBank.length > 80) throw httpError(400, 'Enter the sender bank');
    if (referenceNumber.length < 2 || referenceNumber.length > 100) throw httpError(400, 'Enter the transfer reference number');
    if (!Number.isFinite(transferDate.getTime()) || transferDate > new Date()) throw httpError(400, 'Enter a valid transfer date');
    if (!proofFileName || proofDataUrl.length > 3000000 || !proofMatch || proofMatch[1] !== proofMimeType) {
      throw httpError(400, 'Upload a JPG, PNG, or PDF proof no larger than 2 MB');
    }
    if (Buffer.from(proofMatch[2], 'base64').length > 2 * 1024 * 1024) {
      throw httpError(400, 'Proof of transfer must be 2 MB or smaller');
    }

    bankTransferDetails = {
      senderName,
      senderBank,
      referenceNumber,
      transferDate,
      proofFileName,
      proofMimeType,
      proofDataUrl,
    };
  }

  let selectedWallet;
  let selectedCard;

  if (payment.walletId) {
    if (payment.channel !== 'online' || !['gcash', 'maya'].includes(payment.method)) {
      throw httpError(400, 'A saved wallet can only be used with its online e-wallet method');
    }
    selectedWallet = (req.user.preferences?.wallets || []).find((wallet) => String(wallet._id) === String(payment.walletId));
    if (!selectedWallet || selectedWallet.provider !== payment.method) {
      throw httpError(400, 'The selected wallet is not available on your account');
    }
  }

  if (payment.cardId) {
    if (payment.channel !== 'online' || payment.method !== 'card') {
      throw httpError(400, 'A saved card can only be used with the online card method');
    }
    selectedCard = (req.user.preferences?.cards || []).find((card) => String(card._id) === String(payment.cardId));
    if (!selectedCard) throw httpError(400, 'The selected card is not available on your account');
  }

  const trip = await Trip.findById(tripId).populate('boat');
  if (!trip) throw httpError(404, 'Trip not found');
  if (trip.status !== 'scheduled') throw httpError(400, `Trip is ${trip.status} and cannot be booked`);
  if (trip.departureAt <= new Date()) throw httpError(400, 'This trip has already departed');

  const ticketDocs = bookingType === 'passenger'
    ? await buildPassengerTickets(trip, passengers, req.user)
    : await buildCargoTicket(trip, cargo);

  const totalAmount = round2(ticketDocs.reduce((sum, t) => sum + t.price, 0));

  const booking = await Booking.create({
    bookingReference: generateRef('BK'),
    user: req.user._id,
    trip: trip._id,
    bookingType,
    totalAmount,
  });

  try {
    const tickets = await Ticket.insertMany(
      ticketDocs.map((t) => ({ ...t, ticketNumber: generateRef('TKT'), booking: booking._id, trip: trip._id, user: req.user._id }))
    );

    const dueAt = payment.channel === 'physical'
      ? new Date(Math.min(Date.now() + C.PAYMENT_WINDOW_HOURS * 3600 * 1000, trip.departureAt.getTime()))
      : undefined;

    const pay = await Payment.create({
      booking: booking._id,
      user: req.user._id,
      channel: payment.channel,
      method: payment.method,
      amount: totalAmount,
      dueAt,
      ...(selectedWallet ? {
        walletProvider: selectedWallet.provider,
        walletAccountLast4: selectedWallet.accountNumber.replace(/\D/g, '').slice(-4),
      } : {}),
      ...(selectedCard ? {
        cardBrand: selectedCard.brand,
        cardAccountLast4: selectedCard.last4,
      } : {}),
      ...(bankTransferDetails ? {
        bankTransferSenderName: bankTransferDetails.senderName,
        bankTransferSenderBank: bankTransferDetails.senderBank,
        bankTransferReference: bankTransferDetails.referenceNumber,
        bankTransferDate: bankTransferDetails.transferDate,
        bankTransferProofFileName: bankTransferDetails.proofFileName,
        bankTransferProofMimeType: bankTransferDetails.proofMimeType,
        bankTransferProofDataUrl: bankTransferDetails.proofDataUrl,
      } : {}),
    });

    await Invoice.create({
      invoiceNumber: generateRef('INV'),
      booking: booking._id,
      payment: pay._id,
      user: req.user._id,
      items: tickets.flatMap((t) => {
        if (t.type === 'cargo' && t.cargo.vipSeatPrice > 0) {
          return [
            {
              description: `Cargo: ${t.cargo.description} (${t.cargo.weightKg} kg)`,
              unitPrice: round2(t.basePrice - t.cargo.vipSeatPrice),
              discount: 0,
              amount: round2(t.price - t.cargo.vipSeatPrice),
            },
            {
              description: `VIP seat ${t.seatNumber}`,
              unitPrice: t.cargo.vipSeatPrice,
              discount: 0,
              amount: t.cargo.vipSeatPrice,
            },
          ];
        }
        return [{
          description: t.type === 'passenger'
            ? `Passenger: ${t.passenger.firstName} ${t.passenger.lastName} - Seat ${t.seatNumber} (${t.seatClass}, ${t.fareCategory})`
            : `Cargo: ${t.cargo.description} (${t.cargo.weightKg} kg)`,
          unitPrice: t.basePrice,
          discount: t.discountAmount,
          amount: t.price,
        }];
      }),
      subtotal: round2(tickets.reduce((s, t) => s + t.basePrice, 0)),
      discountTotal: round2(tickets.reduce((s, t) => s + t.discountAmount, 0)),
      total: totalAmount,
    });

    await notify(req.user._id, {
      title: 'Booking created',
      message: payment.method === 'bank_transfer'
        ? `Booking ${booking.bookingReference} created. Bank transfer proof is awaiting verification.`
        : payment.channel === 'physical'
          ? `Booking ${booking.bookingReference} created. Please pay at the port counter before ${dueAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.`
          : `Booking ${booking.bookingReference} created. Complete your online payment to confirm it.`,
      type: 'booking',
      booking: booking._id,
    });
  } catch (err) {
    await Promise.all([
      Ticket.deleteMany({ booking: booking._id }),
      Payment.deleteMany({ booking: booking._id }),
      Invoice.deleteMany({ booking: booking._id }),
      Booking.findByIdAndDelete(booking._id),
    ]);

    if (err.code === 11000 && err.message.includes('seatNumber')) {
      throw httpError(409, 'One of the seats was just taken by someone else. Please pick another seat.');
    }
    throw err;
  }

  res.status(201).json(await Booking.findById(booking._id).populate(bookingPopulate));
});

// GET /api/bookings/my
exports.getMyBookings = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (typeof req.query.status === 'string') filter.status = req.query.status;

  if (req.query.when === 'upcoming' || req.query.when === 'past') {
    const cmp = req.query.when === 'upcoming' ? { $gte: new Date() } : { $lt: new Date() };
    filter.trip = { $in: await Trip.find({ departureAt: cmp }).distinct('_id') };
  }

  const bookings = await Booking.find(filter).populate(bookingPopulate).sort('-createdAt');
  res.json({ data: bookings, total: bookings.length });
});

// GET /api/bookings
exports.getAllBookings = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};

  ['status', 'bookingType', 'trip', 'user'].forEach((f) => {
    if (typeof req.query[f] === 'string') filter[f] = req.query[f];
  });

  if (typeof req.query.search === 'string' && req.query.search) {
    filter.bookingReference = {
      $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    };
  }

  const [data, total] = await Promise.all([
    Booking.find(filter)
      .populate([
        ...bookingPopulate,
        { path: 'user', select: 'firstName lastName email contactNumber createdAt' },
      ])
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res.json({ data, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/bookings/:id
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate([
    ...bookingPopulate,
    { path: 'user', select: 'firstName lastName email contactNumber' },
  ]);

  if (!booking) throw httpError(404, 'Booking not found');
  if (!isOwnerOrAdmin(booking, req.user)) throw httpError(403, 'Not your booking');

  res.json(booking);
});

// PATCH /api/bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw httpError(404, 'Booking not found');
  if (!isOwnerOrAdmin(booking, req.user)) throw httpError(403, 'Not your booking');
  if (['cancelled', 'completed'].includes(booking.status)) throw httpError(400, `Booking is already ${booking.status}`);

  const trip = await Trip.findById(booking.trip);
  const hoursLeft = (trip.departureAt.getTime() - Date.now()) / 3600000;

  if (req.user.role !== 'admin' && booking.status !== 'reschedule_pending' && hoursLeft < C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL) {
    throw httpError(400, `Bookings can only be cancelled at least ${C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL} hours before departure`);
  }

  if (await Ticket.exists({ booking: booking._id, status: 'boarded' })) throw httpError(400, 'Passengers already boarded');

  await Ticket.updateMany({ booking: booking._id }, { status: 'cancelled', holdsSeat: false });
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelReason = typeof req.body.reason === 'string' ? req.body.reason : undefined;
  await booking.save();

  const payment = await Payment.findOne({ booking: booking._id });
  if (payment) {
    payment.status = payment.status === 'paid' ? 'refund_pending' : 'cancelled';
    await payment.save();
  }

  await notify(booking.user, {
    title: 'Booking cancelled',
    message: `Booking ${booking.bookingReference} was cancelled.${payment && payment.status === 'refund_pending' ? ' Your refund is being processed.' : ''}`,
    type: 'booking',
    booking: booking._id,
  });

  res.json(await Booking.findById(booking._id).populate(bookingPopulate));
});

// ---------- weather / operator cancellation: reschedule ----------
const tripSummaryPopulate = [
  { path: 'boat', select: 'name boatType operator logoUrl imageUrl seats' },
  {
    path: 'route',
    populate: [
      { path: 'origin', select: 'name code city' },
      { path: 'destination', select: 'name code city' },
    ],
  },
];

const loadReschedulableBooking = async (id, user) => {
  const booking = await Booking.findById(id);
  if (!booking) throw httpError(404, 'Booking not found');
  if (!isOwnerOrAdmin(booking, user)) throw httpError(403, 'Not your booking');
  if (!['pending', 'confirmed', 'reschedule_pending'].includes(booking.status)) {
    throw httpError(400, `A ${booking.status} booking cannot be rescheduled`);
  }

  const voluntary = booking.status !== 'reschedule_pending';

  if (voluntary) {
    const trip = await Trip.findById(booking.trip);
    const hoursLeft = (trip.departureAt.getTime() - Date.now()) / 3600000;

    if (user.role !== 'admin' && hoursLeft < C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL) {
      throw httpError(400, `Bookings can only be rescheduled at least ${C.MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL} hours before departure`);
    }

    if (await Ticket.exists({ booking: booking._id, status: 'boarded' })) throw httpError(400, 'Passengers already boarded');
  }

  return { booking, voluntary };
};

// GET /api/bookings/:id/reschedule-options
exports.getRescheduleOptions = asyncHandler(async (req, res) => {
  const { booking, voluntary } = await loadReschedulableBooking(req.params.id, req.user);
  const oldTrip = await Trip.findById(booking.trip);
  const tickets = await Ticket.find({ booking: booking._id, status: 'valid' });

  const tripFilter = {
    route: oldTrip.route,
    status: 'scheduled',
    departureAt: { $gt: new Date() },
    _id: { $ne: oldTrip._id },
  };

  if (typeof req.query.date === 'string') {
    const start = new Date(`${req.query.date}T00:00:00+08:00`);
    if (isNaN(start)) throw httpError(400, 'date must be YYYY-MM-DD');

    tripFilter.departureAt = {
      $gt: new Date(Math.max(start.getTime(), Date.now())),
      $lt: new Date(start.getTime() + 24 * 3600 * 1000),
    };
  }

  const trips = await Trip.find(tripFilter).populate(tripSummaryPopulate).sort('departureAt').limit(30);
  const tripIds = trips.map((t) => t._id);

  const heldSeats = await Ticket.find({ trip: { $in: tripIds }, holdsSeat: true }).select('trip seatNumber');
  const takenByTrip = new Map();

  heldSeats.forEach((h) => {
    const k = String(h.trip);
    if (!takenByTrip.has(k)) takenByTrip.set(k, new Set());
    takenByTrip.get(k).add(h.seatNumber);
  });

  const cargoUsed = await Ticket.aggregate([
    { $match: { trip: { $in: tripIds }, type: 'cargo', status: { $in: ['valid', 'boarded'] } } },
    { $group: { _id: '$trip', kg: { $sum: '$cargo.weightKg' } } },
  ]);

  const cargoByTrip = new Map(cargoUsed.map((c) => [String(c._id), c.kg]));

  const needed = {};
  tickets.filter((t) => t.type === 'passenger').forEach((t) => {
    needed[t.seatClass] = (needed[t.seatClass] || 0) + 1;
  });

  const cargoWeight = tickets.filter((t) => t.type === 'cargo').reduce((s, t) => s + t.cargo.weightKg, 0);

  const options = trips.map((trip) => {
    const plain = trip.toObject();
    delete plain.boat.seats;

    if (booking.bookingType === 'passenger') {
      const taken = takenByTrip.get(String(trip._id)) || new Set();
      const free = {};

      trip.boat.seats.forEach((s) => {
        if (!taken.has(s.seatNumber)) free[s.seatClass] = (free[s.seatClass] || 0) + 1;
      });

      const fareOk = tickets
        .filter((t) => t.type === 'passenger')
        .every((t) => (trip.fares[t.seatClass] || 0) <= t.basePrice);

      return {
        trip: plain,
        availableSeatsByClass: free,
        fareOk,
        canAccommodate: fareOk && Object.entries(needed).every(([cls, n]) => (free[cls] || 0) >= n),
      };
    }

    const availableKg = Math.max(trip.cargoCapacityKg - (cargoByTrip.get(String(trip._id)) || 0), 0);

    const cargoSeatsFit = tickets
      .filter((ticket) => ticket.type === 'cargo' && ticket.holdsSeat && ticket.seatNumber)
      .every((ticket) => {
        const seat = trip.boat.seats.find((item) => item.seatNumber === ticket.seatNumber);
        const taken = takenByTrip.get(String(trip._id)) || new Set();

        return seat?.seatClass === 'vip'
          && !taken.has(ticket.seatNumber)
          && trip.fares.vip > 0
          && trip.fares.vip <= (ticket.cargo.vipSeatPrice || 0);
      });

    return {
      trip: plain,
      availableKg,
      canAccommodate: trip.cargoRatePerKg > 0 && cargoWeight <= availableKg && cargoSeatsFit,
    };
  });

  res.json({
    bookingId: booking._id,
    voluntary,
    bookingType: booking.bookingType,
    neededSeatsByClass: needed,
    cargoWeightKg: cargoWeight,
    options,
  });
});

// POST /api/bookings/:id/reschedule
exports.rescheduleBooking = asyncHandler(async (req, res) => {
  const { booking, voluntary } = await loadReschedulableBooking(req.params.id, req.user);
  const oldTrip = await Trip.findById(booking.trip);
  const { newTripId, seats } = req.body;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

  if (voluntary && reason.length < 3) throw httpError(400, 'Please give a reason for rescheduling');

  const newTrip = await Trip.findById(newTripId).populate('boat');
  if (!newTrip) throw httpError(404, 'New trip not found');
  if (String(newTrip._id) === String(oldTrip._id)) throw httpError(400, 'Choose a different trip');
  if (String(newTrip.route) !== String(oldTrip.route)) throw httpError(400, 'New trip must be on the same route');
  if (newTrip.status !== 'scheduled') throw httpError(400, `New trip is ${newTrip.status}`);
  if (newTrip.departureAt <= new Date()) throw httpError(400, 'New trip has already departed');

  const tickets = await Ticket.find({ booking: booking._id, status: 'valid' });
  if (!tickets.length) throw httpError(400, 'No active tickets to move');

  const updates = [];

  if (booking.bookingType === 'passenger') {
    if (!Array.isArray(seats) || seats.length !== tickets.length) {
      throw httpError(400, `Choose a new seat for each of the ${tickets.length} passenger(s)`);
    }

    const chosen = new Map(seats.map((s) => [String(s.ticketId), s.seatNumber]));
    const seatNumbers = tickets.map((t) => chosen.get(String(t._id)));

    if (seatNumbers.some((s) => !s)) throw httpError(400, 'Every ticket needs a new seat (ticketId + seatNumber)');
    if (new Set(seatNumbers).size !== seatNumbers.length) throw httpError(400, 'Each passenger needs a different seat');

    const taken = await Ticket.find({
      trip: newTrip._id,
      holdsSeat: true,
      seatNumber: { $in: seatNumbers },
    }).distinct('seatNumber');

    if (taken.length) throw httpError(409, `Seat already taken: ${taken.join(', ')}`);

    const seatMap = new Map(newTrip.boat.seats.map((s) => [s.seatNumber, s]));

    tickets.forEach((t, i) => {
      const seat = seatMap.get(seatNumbers[i]);
      if (!seat) throw httpError(400, `Seat "${seatNumbers[i]}" does not exist on the new boat`);
      if (newTrip.fares[seat.seatClass] > t.basePrice) throw httpError(400, 'The fare on that trip is higher than what you paid. Choose another trip.');
      if (seat.seatClass !== t.seatClass) throw httpError(400, `Seat ${seat.seatNumber} is ${seat.seatClass}; this ticket is ${t.seatClass}. Pick a seat in the same class.`);

      updates.push({
        ticket: t,
        set: { trip: newTrip._id, seatNumber: seat.seatNumber },
      });
    });
  } else {
    const cargoTickets = tickets.filter((ticket) => ticket.type === 'cargo');
    const weight = cargoTickets.reduce((sum, ticket) => sum + ticket.cargo.weightKg, 0);

    if (!cargoTickets.length) throw httpError(400, 'No active cargo tickets to move');
    if (!(newTrip.cargoRatePerKg > 0)) throw httpError(400, 'New trip does not accept cargo');

    const [used] = await Ticket.aggregate([
      { $match: { trip: newTrip._id, type: 'cargo', status: { $in: ['valid', 'boarded'] } } },
      { $group: { _id: null, kg: { $sum: '$cargo.weightKg' } } },
    ]);

    const available = newTrip.cargoCapacityKg - (used ? used.kg : 0);
    if (weight > available) throw httpError(400, `Not enough cargo space on the new trip. Available: ${available} kg`);

    const seatedCargoTickets = cargoTickets.filter((ticket) => ticket.holdsSeat && ticket.seatNumber);
    const seatNumbers = seatedCargoTickets.map((ticket) => ticket.seatNumber);

    const taken = seatNumbers.length
      ? await Ticket.find({
          trip: newTrip._id,
          holdsSeat: true,
          seatNumber: { $in: seatNumbers },
        }).distinct('seatNumber')
      : [];

    if (taken.length) throw httpError(409, `VIP seat already taken: ${taken.join(', ')}`);

    seatedCargoTickets.forEach((ticket) => {
      const seat = newTrip.boat.seats.find((item) => item.seatNumber === ticket.seatNumber);

      if (!seat || seat.seatClass !== 'vip') {
        throw httpError(400, `VIP seat ${ticket.seatNumber} is not available on the new vessel`);
      }

      if (!(newTrip.fares.vip > 0) || newTrip.fares.vip > (ticket.cargo.vipSeatPrice || 0)) {
        throw httpError(400, 'The VIP fare on that trip is higher than what you paid. Choose another trip.');
      }
    });

    cargoTickets.forEach((ticket) => updates.push({
      ticket,
      set: { trip: newTrip._id },
    }));
  }

  const done = [];

  try {
    for (const u of updates) {
      const original = {
        trip: u.ticket.trip,
        seatNumber: u.ticket.seatNumber,
      };

      await Ticket.updateOne({ _id: u.ticket._id }, u.set);
      done.push({ id: u.ticket._id, original });
    }
  } catch (err) {
    await Promise.all(done.map((d) => Ticket.updateOne({ _id: d.id }, d.original)));

    if (err.code === 11000) throw httpError(409, 'One of the seats was just taken by someone else. Please pick another seat.');
    throw err;
  }

  const payment = await Payment.findOne({ booking: booking._id });

  booking.rescheduleHistory.push({
    fromTrip: oldTrip._id,
    toTrip: newTrip._id,
    reason: voluntary ? reason : (reason || oldTrip.cancelReason),
  });

  booking.trip = newTrip._id;
  booking.status = payment && payment.status === 'paid' ? 'confirmed' : 'pending';
  await booking.save();

  if (payment && payment.status === 'pending' && payment.channel === 'physical') {
    payment.dueAt = new Date(Math.min(Date.now() + C.PAYMENT_WINDOW_HOURS * 3600 * 1000, newTrip.departureAt.getTime()));
    await payment.save();
  }

  await notify(booking.user, {
    title: 'Booking rescheduled',
    message: `Booking ${booking.bookingReference} was moved to ${newTrip.departureAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.`,
    type: 'booking',
    booking: booking._id,
    trip: newTrip._id,
  });

  res.json(await Booking.findById(booking._id).populate(bookingPopulate));
});
