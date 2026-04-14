// backend/middleware/validation.js
const validator = require('validator');

// Fields that must never be HTML-escaped: Razorpay IDs/signatures use
// underscores and pipe characters that validator.escape() mangles, which
// caused HMAC mismatches on every payment and broke bcrypt password comparison.
const SKIP_ESCAPE_KEYS = new Set([
  'password',
  'razorpay_order_id',
  'razorpay_payment_id',
  'razorpay_signature',
  'ticketId',    // UUID with hyphens — escape() would corrupt it
  'ticket_id',   // snake_case variant used in some queries
]);

// Input sanitization middleware
// FIX #3 & #4: Previously called validator.escape() on every string field,
// including razorpay_* fields and password. This corrupted the Razorpay HMAC
// signature (pipes and underscores were entity-encoded) so every payment failed
// verification, and it corrupted passwords so bcrypt.compare() failed after the
// first sanitized login attempt, causing session breaks that only cleared on
// backend restart. Now those fields bypass escaping.
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (key, str) => {
    if (typeof str !== 'string') return str;
    if (SKIP_ESCAPE_KEYS.has(key)) return str.trim();
    return validator.escape(str.trim());
  };

  const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return email;
    return validator.normalizeEmail(email, { gmail_remove_dots: false });
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = sanitizeEmail(value);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(key, value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  };

  if (req.body)  req.body  = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);

  next();
};

// Validation rules
const validateRegistration = (req, res, next) => {
  // Accept both event_id (free registration) and eventId (payment)
  const eventId = req.body.event_id || req.body.eventId;

  if (!eventId || !Number.isInteger(Number(eventId))) {
    return res.status(400).json({ error: 'Valid event_id is required' });
  }

  next();
};

const validateEvent = (req, res, next) => {
  const { title, date, venue, capacity, price } = req.body;

  if (!title || title.length < 3 || title.length > 255) {
    return res.status(400).json({ error: 'Title must be between 3 and 255 characters' });
  }

  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Valid date is required' });
  }

  if (!venue || venue.length < 3 || venue.length > 255) {
    return res.status(400).json({ error: 'Venue must be between 3 and 255 characters' });
  }

  if (capacity !== undefined && (!Number.isInteger(Number(capacity)) || capacity < 1 || capacity > 10000)) {
    return res.status(400).json({ error: 'Capacity must be a positive integer between 1 and 10000' });
  }

  if (price !== undefined && (!Number.isInteger(Number(price)) || price < 0 || price > 100000)) {
    return res.status(400).json({ error: 'Price must be between 0 and 100000 rupees' });
  }

  next();
};

const validateUser = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || name.length < 2 || name.length > 255) {
    return res.status(400).json({ error: 'Name must be between 2 and 255 characters' });
  }

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  next();
};

const validatePayment = (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !eventId) {
    return res.status(400).json({ error: 'All payment fields are required' });
  }

  if (!/^order_[a-zA-Z0-9]+$/.test(razorpay_order_id)) {
    return res.status(400).json({ error: 'Invalid order ID format' });
  }

  if (!/^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id)) {
    return res.status(400).json({ error: 'Invalid payment ID format' });
  }

  if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
    return res.status(400).json({ error: 'Invalid signature format' });
  }

  if (!Number.isInteger(Number(eventId))) {
    return res.status(400).json({ error: 'Valid eventId is required' });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateRegistration,
  validateEvent,
  validateUser,
  validatePayment
};