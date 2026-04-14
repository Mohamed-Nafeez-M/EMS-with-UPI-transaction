// utils/mailer.js
// Single shared Gmail transporter — created once, reused across all email utils.

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Returns a verified Gmail transporter.
 * Creates it once and caches it for the lifetime of the process.
 * Throws if credentials are missing or auth fails.
 */
async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not set in .env');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s+/g, ''), // strip spaces from App Password
    },
  });

  await transporter.verify(); // fail fast if credentials are wrong
  console.log('[Mailer] ✅ Gmail transporter ready.');
  return transporter;
}

module.exports = { getTransporter };
