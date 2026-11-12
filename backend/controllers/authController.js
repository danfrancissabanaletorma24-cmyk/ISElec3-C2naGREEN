const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const generateToken = require('../utils/generateToken');

const pick = (obj, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? { ...o, [k]: obj[k] } : o), {});

// POST /api/auth/register  (role is always "user" - admins are created via seed/admin panel)
exports.register = asyncHandler(async (req, res) => {
  const { name, mobile, ...body } = req.body;
  const data = pick(body, ['firstName', 'lastName', 'age', 'gender', 'contactNumber', 'email', 'password']);
  if (typeof name === 'string') {
    const [firstName, ...lastName] = name.trim().split(/\s+/);
    data.firstName = data.firstName || firstName;
    data.lastName = data.lastName || lastName.join(' ');
  }
  if (typeof mobile === 'string' && data.contactNumber === undefined) {
    data.contactNumber = mobile.trim();
  }
  if (await User.findOne({ email: String(data.email || '').toLowerCase() })) {
    throw httpError(409, 'Email is already registered');
  }
  const user = await User.create(data);
  res.status(201).json({ token: generateToken(user._id), user });
});

async function authenticate(req, requiredRole) {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') throw httpError(400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw httpError(401, 'Invalid email or password');
  if (!user.isActive) throw httpError(403, 'Your account has been deactivated');
  if (requiredRole && user.role !== requiredRole) {
    throw httpError(403, requiredRole === 'admin' ? 'Administrator access required' : 'Customer account required');
  }
  return user;
}

// POST /api/auth/login - customer and administrator accounts
exports.login = asyncHandler(async (req, res) => {
  const user = await authenticate(req);
  res.json({ token: generateToken(user._id), user });
});

// POST /api/auth/admin/login - administrator accounts only
exports.adminLogin = asyncHandler(async (req, res) => {
  const user = await authenticate(req, 'admin');
  res.json({ token: generateToken(user._id), user });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/me  - the logged-in user edits their own profile (never role / isActive / password here)
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, mobile, ...body } = req.body;
  const data = pick(body, ['firstName', 'lastName', 'age', 'gender', 'contactNumber', 'email', 'address', 'avatar']);
  if (typeof name === 'string' && name.trim()) {
    const [firstName, ...lastName] = name.trim().split(/\s+/);
    data.firstName = firstName;
    data.lastName = lastName.join(' ');
  }
  if (typeof mobile === 'string' && data.contactNumber === undefined) data.contactNumber = mobile.trim();

  if (data.email !== undefined) {
    data.email = String(data.email).trim().toLowerCase();
    const taken = await User.findOne({ email: data.email, _id: { $ne: req.user._id } });
    if (taken) throw httpError(409, 'Email is already registered');
  }
  // empty strings from the form mean "not set"
  ['age', 'gender'].forEach((k) => { if (data[k] === '' || data[k] === null) data[k] = undefined; });

  const user = await User.findById(req.user._id);
  user.set(data);
  if (body.preferences && typeof body.preferences === 'object') {
    const preferencePatch = pick(body.preferences, ['notificationsEmail', 'notificationsSms', 'promotions', 'defaultClass', 'language', 'currency', 'wallets', 'cards']);
    if (preferencePatch.wallets !== undefined) {
      if (!Array.isArray(preferencePatch.wallets) || preferencePatch.wallets.length > 10) {
        throw httpError(400, 'Wallets must be an array with no more than 10 entries');
      }
      const seen = new Set();
      preferencePatch.wallets = preferencePatch.wallets.map((wallet) => {
        if (!wallet || typeof wallet !== 'object' || Array.isArray(wallet)) {
          throw httpError(400, 'Each wallet must include a provider and mobile number');
        }
        const provider = String(wallet.provider || '').toLowerCase();
        const accountNumber = String(wallet.accountNumber || '').trim();
        const digits = accountNumber.replace(/\D/g, '');
        if (!['gcash', 'maya'].includes(provider)) throw httpError(400, 'Wallet provider must be GCash or Maya');
        if (digits.length < 10 || digits.length > 15) throw httpError(400, 'Enter a valid wallet mobile number');
        const key = `${provider}:${digits}`;
        if (seen.has(key)) throw httpError(409, 'This wallet is already saved');
        seen.add(key);
        return {
          ...(wallet._id && /^[a-f\d]{24}$/i.test(String(wallet._id)) ? { _id: wallet._id } : {}),
          provider,
          accountNumber,
        };
      });
    }
    if (preferencePatch.cards !== undefined) {
      if (!Array.isArray(preferencePatch.cards) || preferencePatch.cards.length > 10) {
        throw httpError(400, 'Cards must be an array with no more than 10 entries');
      }
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const defaultCards = preferencePatch.cards.filter((card) => card?.isDefault === true);
      if (defaultCards.length > 1) throw httpError(400, 'Only one card can be set as the default');
      preferencePatch.cards = preferencePatch.cards.map((card) => {
        if (!card || typeof card !== 'object' || Array.isArray(card)) {
          throw httpError(400, 'Each card must include its holder, brand, last four digits, and expiry');
        }
        const holderName = String(card.holderName || '').trim();
        const brand = String(card.brand || '').trim();
        const last4 = String(card.last4 || '');
        const expiryMonth = Number(card.expiryMonth);
        const expiryYear = Number(card.expiryYear);
        if (holderName.length < 2 || holderName.length > 80) throw httpError(400, 'Enter a valid card holder name');
        if (brand.length < 2 || brand.length > 30) throw httpError(400, 'Enter a card brand between 2 and 30 characters');
        if (!/^\d{4}$/.test(last4)) throw httpError(400, 'Only the last four card digits can be saved');
        if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12
          || !Number.isInteger(expiryYear) || expiryYear < currentYear
          || (expiryYear === currentYear && expiryMonth < currentMonth)) {
          throw httpError(400, 'Enter a valid, unexpired card expiry date');
        }
        return {
          ...(card._id && /^[a-f\d]{24}$/i.test(String(card._id)) ? { _id: card._id } : {}),
          holderName,
          brand,
          last4,
          expiryMonth,
          expiryYear,
          isDefault: card.isDefault === true,
        };
      });
    }
    user.set('preferences', {
      ...user.preferences.toObject(),
      ...preferencePatch,
    });
  }
  if (req.user.role === 'admin' && body.adminNotificationSettings && typeof body.adminNotificationSettings === 'object') {
    user.set('adminNotificationSettings', {
      ...user.adminNotificationSettings.toObject(),
      ...pick(body.adminNotificationSettings, ['newBooking', 'cancellations', 'lowOccupancy', 'dailyDigest']),
    });
  }
  await user.save();
  res.json(user);
});

// PUT /api/auth/change-password  body: { currentPassword, newPassword }
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw httpError(400, 'Current and new password are required');
  }
  if (newPassword.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw httpError(400, 'Current password is incorrect');
  user.password = newPassword; // hashed by the pre-save hook
  await user.save();
  res.json({ message: 'Password updated' });
});
