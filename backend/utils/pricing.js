const { DISCOUNT_RATES } = require('../config/constants');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Passenger fare after discount
exports.computeFare = (basePrice, fareCategory = 'regular') => {
  const rate = DISCOUNT_RATES[fareCategory] || 0;
  const discountAmount = round2(basePrice * rate);
  return { basePrice, discountAmount, price: round2(basePrice - discountAmount) };
};

// Cargo price depends on weight (kg)
exports.computeCargoPrice = (weightKg, ratePerKg) => round2(weightKg * ratePerKg);

exports.round2 = round2;
