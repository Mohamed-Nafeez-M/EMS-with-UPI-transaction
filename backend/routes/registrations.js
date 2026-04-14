// backend/routes/registrations.js

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
// const https    = require('https');           // ← REMOVED: was only used by Razorpay order creation
const pool     = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const sendEmail  = require('../utils/sendEmail');
const qrcode    = require('qrcode');
const { validateRegistration } = require('../middleware/validation');  // ← removed validatePayment (Razorpay only)

// ─────────────────────────────────────────────────────────────────────────────
// REMOVED: createRazorpayOrder() helper (lines 13-75 in original)
// Entire function that called api.razorpay.com has been removed.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ROUTES  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/registrations/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, e.title, e.date, e.venue, e.category, e.price
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1
       ORDER BY r.registered_at DESC`,
      [req.user.id]
    );
    res.json({ registrations: result.rows });
  } catch (err) {
    console.error('Get my registrations error:', err);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

// GET /api/registrations  (admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              u.department, u.student_id,
              e.title as event_title, e.date as event_date,
              e.venue as event_venue, e.price as event_price
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       ORDER BY r.registered_at DESC`
    );
    res.json({ registrations: result.rows });
  } catch (err) {
    console.error('Get all registrations error:', err);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

// POST /api/registrations  — free events only
router.post('/', authenticate, validateRegistration, async (req, res) => {
  const { event_id } = req.body;

  try {
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    // Paid events go through the manual payment flow, NOT direct registration
    if (parseInt(event.price) > 0) {
      return res.status(400).json({
        error: 'This is a paid event. Please complete payment first.',
      });
    }

    const dupCheck = await pool.query(
      "SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'",
      [req.user.id, event_id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'You are already registered for this event.' });
    }

    const regCountResult = await pool.query(
      "SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'confirmed'",
      [event_id]
    );
    if (parseInt(regCountResult.rows[0].count) >= parseInt(event.capacity)) {
      return res.status(400).json({ error: 'Event is at full capacity' });
    }

    const ticketId = crypto.randomUUID();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${ticketId}`;
    const qrCodeDataURL = await qrcode.toDataURL(
      JSON.stringify({ ticketId, eventId: event_id, userId: req.user.id, verificationUrl })
    );

    const regResult = await pool.query(
      `INSERT INTO registrations (user_id, event_id, payment_status, status, ticket_id)
       VALUES ($1, $2, 'pending', 'confirmed', $3)
       RETURNING *`,
      [req.user.id, event_id, ticketId]
    );

    const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    sendEmail(user.email, user.name, {
      title: event.title,
      date: event.date,
      venue: event.venue,
      ticketId,
      qrCode: qrCodeDataURL,
      verificationUrl,
    })
      .then(sent => {
        if (sent) console.log(`[Email] ✅ Free-event confirmation sent to ${user.email}`);
        else console.error(`[Email] ❌ Failed to send to ${user.email}`);
      })
      .catch(err => console.error('[Email] ❌ Unexpected error:', err));

    res.status(201).json({
      success: true,
      registration: regResult.rows[0],
      message: `Successfully registered for "${event.title}". A confirmation email has been sent.`,
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You are already registered for this event.' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// DELETE /api/registrations/:eventId
router.delete('/:eventId', authenticate, async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM registrations WHERE user_id = $1 AND event_id = $2 AND status != 'checked_in' RETURNING *",
      [req.user.id, eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found or cannot be cancelled' });
    }
    res.json({ success: true, message: 'Registration cancelled successfully' });
  } catch (err) {
    console.error('Cancel registration error:', err);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// GET /api/registrations/event/:eventId  (admin)
router.get('/event/:eventId', authenticate, requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              u.department, u.student_id
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY r.registered_at DESC`,
      [eventId]
    );
    res.json({ registrations: result.rows });
  } catch (err) {
    console.error('Get event registrations error:', err);
    res.status(500).json({ error: 'Failed to get event registrations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REMOVED: RAZORPAY PAYMENT ROUTES (original lines 312–532)
//
//   POST /create-order          — called Razorpay API, created Razorpay order
//   POST /verify-payment        — verified Razorpay HMAC signature
//   POST /handle-payment-failure — logged Razorpay failure to registrations table
//
// Replaced by: POST /api/payments/submit-payment (in backend/routes/payments.js)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TICKET VERIFICATION  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/verify/:ticketId', async (req, res) => {
  const { ticketId } = req.params;

  try {
    const result = await pool.query(`
      SELECT r.ticket_id, r.payment_status, r.status, r.registered_at,
        u.name as user_name, u.email as user_email, u.department, u.student_id,
        e.title as event_name, e.date as event_date, e.venue as event_venue,
        e.organizer, e.category
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE r.ticket_id = $1 AND r.status IN ('confirmed', 'checked_in')
    `, [ticketId]);

    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Ticket not found or invalid' });
    }

    const ticket = result.rows[0];
    const isUpcoming = new Date(ticket.event_date) > new Date();

    res.json({
      valid: true,
      ticket: {
        ticketId:         ticket.ticket_id,
        userName:         ticket.user_name,
        userEmail:        ticket.user_email,
        department:       ticket.department,
        studentId:        ticket.student_id,
        eventName:        ticket.event_name,
        eventDate:        ticket.event_date,
        eventVenue:       ticket.event_venue,
        eventOrganizer:   ticket.organizer,
        eventCategory:    ticket.category,
        paymentStatus:    ticket.payment_status,
        status:           ticket.status,
        registrationDate: ticket.registered_at,
        isUpcoming,
      },
    });
  } catch (err) {
    console.error('Ticket verification error:', err);
    res.status(500).json({ error: 'Ticket verification failed' });
  }
});

// POST /api/registrations/check-in  (admin)
router.post('/check-in', authenticate, requireAdmin, async (req, res) => {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    const existing = await pool.query(
      'SELECT status FROM registrations WHERE ticket_id = $1',
      [ticketId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (existing.rows[0].status === 'checked_in') {
      return res.status(409).json({ error: 'Already checked in', alreadyCheckedIn: true });
    }

    if (existing.rows[0].status !== 'confirmed') {
      return res.status(400).json({ error: 'Ticket is not in a valid state for check-in' });
    }

    const result = await pool.query(
      "UPDATE registrations SET status = 'checked_in' WHERE ticket_id = $1 RETURNING *",
      [ticketId]
    );

    res.json({ success: true, message: 'Check-in successful', registration: result.rows[0] });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Check-in failed', detail: err.message });
  }
});

module.exports = router;