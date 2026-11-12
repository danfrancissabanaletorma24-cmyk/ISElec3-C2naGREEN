// Central place for enums + business rules so models, controllers and the frontend agree.
module.exports = {
  GENDERS: ['male', 'female', 'other', 'prefer_not_to_say'],
  SEAT_CLASSES: ['economy', 'business', 'vip'],
  BOAT_TYPES: ['ferry', 'fastcraft', 'roro', 'cargo'],
  BOAT_STATUS: ['active', 'maintenance', 'retired'],
  TRIP_STATUS: ['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled'],
  BOOKING_TYPES: ['passenger', 'cargo'],
  // reschedule_pending = the trip was cancelled by the operator (e.g. bad weather); user must reschedule or cancel/refund
  BOOKING_STATUS: ['pending', 'confirmed', 'reschedule_pending', 'cancelled', 'completed'],
  TICKET_STATUS: ['valid', 'boarded', 'cancelled'],

  // Discounts per fare category (editable defaults - confirm with your operator's actual policy)
  FARE_CATEGORIES: ['regular', 'student', 'senior', 'pwd', 'child'],
  DISCOUNT_RATES: { regular: 0, student: 0.2, senior: 0.2, pwd: 0.2, child: 0.5 },

  PAYMENT_CHANNELS: ['online', 'physical'],
  PAYMENT_METHODS: { online: ['gcash', 'maya', 'card', 'bank_transfer'], physical: ['cash'] },
  PAYMENT_STATUS: ['pending', 'paid', 'failed', 'cancelled', 'refund_pending', 'refunded'],

  NOTIFICATION_TYPES: ['booking', 'payment', 'trip', 'system'],

  MAX_PASSENGERS_PER_BOOKING: 10,
  MIN_HOURS_BEFORE_DEPARTURE_TO_CANCEL: 4,
  PAYMENT_WINDOW_HOURS: 24, // how long a physical (pay-at-counter) booking is held
};
