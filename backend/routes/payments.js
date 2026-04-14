// backend/routes/payments.js

const express                     = require('express');
const router                      = express.Router();
const crypto                      = require('crypto');
const pool                        = require('../db');
const qrcode                      = require('qrcode');
const { authenticate, requireAdmin } = require('../middleware/auth');
const sendPaymentAlert            = require('../utils/sendPaymentAlert');
const sendUserPaymentConfirmation = require('../utils/sendUserPaymentConfirmation');
const sendStatusEmail             = require('../utils/sendStatusEmail');
const sendEmail                   = require('../utils/sendEmail');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/submit-payment  (student)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit-payment', async (req, res) => {
  const { userId, eventId, utr } = req.body;

  if (!userId || !eventId || !utr) {
    return res.status(400).json({
      success: false,
      error: 'userId, eventId, and utr are required.',
    });
  }

  const utrStr = String(utr).trim();
  if (!/^\d{12}$/.test(utrStr)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid UTR. It must be exactly 12 digits.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO payments (user_id, event_id, utr)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, event_id, utr, status, created_at`,
      [userId, eventId, utrStr]
    );

    const payment = result.rows[0];

    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows.length > 0 ? userResult.rows[0] : null;

    Promise.all([
      sendPaymentAlert({
        paymentId: payment.id,
        userId:    payment.user_id,
        eventId:   payment.event_id,
        utr:       payment.utr,
        createdAt: payment.created_at,
      }),
      user
        ? sendUserPaymentConfirmation({
            userEmail: user.email,
            userName:  user.name,
            paymentId: payment.id,
            eventId:   payment.event_id,
            utr:       payment.utr,
            createdAt: payment.created_at,
          })
        : Promise.resolve(false),
    ]).catch(err => console.error('[Payments] Unexpected email error:', err));

    return res.status(201).json({
      success: true,
      message: 'Payment submitted successfully.',
      payment,
    });

  } catch (err) {
    console.error('[Payments] submit-payment error:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit payment. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         p.event_id,
         p.utr,
         p.status,
         p.created_at,
         u.name  AS user_name,
         u.email AS user_email,
         e.title AS event_title
       FROM payments p
       LEFT JOIN users  u ON u.id = p.user_id
       LEFT JOIN events e ON e.id = p.event_id
       ORDER BY p.created_at DESC`
    );

    return res.json({ success: true, payments: result.rows });
  } catch (err) {
    console.error('[Payments] GET / error:', err.message || err);
    return res.status(500).json({ success: false, error: 'Failed to fetch payments.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/status  (admin only)
// Body: { status: 'approved' | 'rejected' }
//
// On APPROVED:
//   1. Update payments.status = 'approved'
//   2. Create confirmed registration with unique ticket_id
//   3. Generate QR code for ticket
//   4. Send ticket confirmation email to student (with QR)
//   5. Send approved status email
//
// On REJECTED:
//   1. Update payments.status = 'rejected'
//   2. Send rejected status email
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  const ALLOWED = ['approved', 'rejected'];
  if (!ALLOWED.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `status must be one of: ${ALLOWED.join(', ')}.`,
    });
  }

  try {
    // ── 1. Update payment status in DB ────────────────────────────────────────
    const result = await pool.query(
      `UPDATE payments
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, event_id, utr, status, created_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }

    const payment = result.rows[0];

    // ── 2. Respond immediately — don't block admin UI ─────────────────────────
    res.json({ success: true, payment });

    // ── 3. Post-response: fetch user + event details ──────────────────────────
    pool.query(
      `SELECT
         u.name  AS user_name,
         u.email AS user_email,
         e.title AS event_title,
         e.date  AS event_date,
         e.venue AS event_venue
       FROM payments p
       LEFT JOIN users  u ON u.id = p.user_id
       LEFT JOIN events e ON e.id = p.event_id
       WHERE p.id = $1`,
      [payment.id]
    )
    .then(async ({ rows }) => {
      if (!rows.length || !rows[0].user_email) {
        console.warn(`[Payments] No user found for payment #${payment.id}, skipping emails.`);
        return;
      }

      const { user_name, user_email, event_title, event_date, event_venue } = rows[0];

      // ── 4. If APPROVED → create registration + generate ticket ────────────────
      if (status === 'approved') {
        try {
          const ticketId        = crypto.randomUUID();
          const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${ticketId}`;

          // Generate QR code as data URL
          const qrCodeDataURL = await qrcode.toDataURL(
            JSON.stringify({
              ticketId,
              eventId:  payment.event_id,
              userId:   payment.user_id,
              verificationUrl,
            })
          );

          // Upsert registration as confirmed with ticket
          await pool.query(
            `INSERT INTO registrations (user_id, event_id, payment_id, payment_status, status, ticket_id)
             VALUES ($1, $2, $3, 'paid', 'confirmed', $4)
             ON CONFLICT (user_id, event_id)
             DO UPDATE SET
               payment_id     = EXCLUDED.payment_id,
               payment_status = 'paid',
               status         = 'confirmed',
               ticket_id      = EXCLUDED.ticket_id`,
            [payment.user_id, payment.event_id, String(payment.id), ticketId]
          );

          console.log(`[Payments] ✅ Registration confirmed — ticketId=${ticketId}`);

          // Send ticket confirmation email with QR code
          sendEmail(user_email, user_name, {
            title:           event_title || `Event #${payment.event_id}`,
            date:            event_date,
            venue:           event_venue,
            ticketId,
            qrCode:          qrCodeDataURL,
            verificationUrl,
          })
          .then(sent => {
            if (sent) console.log(`[Payments] ✅ Ticket email sent to ${user_email}`);
            else      console.error(`[Payments] ❌ Ticket email failed for ${user_email}`);
          })
          .catch(err => console.error('[Payments] ❌ Ticket email error:', err.message));

        } catch (regErr) {
          console.error('[Payments] ❌ Failed to create registration:', regErr.message || regErr);
        }
      }

      // ── 5. Send approved / rejected status email ──────────────────────────────
      sendStatusEmail({
        userEmail:  user_email,
        userName:   user_name,
        paymentId:  payment.id,
        eventTitle: event_title || `Event #${payment.event_id}`,
        utr:        payment.utr,
        status,
        updatedAt:  new Date().toISOString(),
      }).catch(err => console.error('[Payments] ❌ Status email error:', err.message));

    })
    .catch(err => {
      console.error('[Payments] PATCH post-response error:', err.message || err);
    });

  } catch (err) {
    console.error('[Payments] PATCH /:id/status error:', err.message || err);
    return res.status(500).json({ success: false, error: 'Failed to update payment status.' });
  }
});

module.exports = router;