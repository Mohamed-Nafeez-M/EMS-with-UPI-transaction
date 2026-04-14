// backend/config/razorpay.js
// ── [NEW] Razorpay SDK initializer ────────────────────────────────────────────
// Initializes and exports a single Razorpay instance using environment variables.
// Import this wherever you need to create orders or verify payments.
//
// Required .env variables:
//   RAZORPAY_KEY_ID      → your Razorpay Key ID     (from Razorpay Dashboard)
//   RAZORPAY_KEY_SECRET  → your Razorpay Key Secret  (from Razorpay Dashboard)

const Razorpay = require('razorpay');

// Verify that required credentials are set
if (!process.env.RAZORPAY_KEY_ID) {
  console.warn('⚠️  WARNING: RAZORPAY_KEY_ID is not set in .env file. Payment functionality will not work.');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  WARNING: RAZORPAY_KEY_SECRET is not set in .env file. Payment functionality will not work.');
}

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

module.exports = razorpay;
