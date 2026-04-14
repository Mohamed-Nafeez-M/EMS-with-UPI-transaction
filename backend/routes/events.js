const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validation');

// GET /api/events - all events with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, category, status, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = '';
    let params = [limit, offset];
    let paramIndex = 3;

    if (category) {
      whereClause += ` AND e.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.venue ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT e.*,
        COUNT(r.id) as registration_count,
        u.name as creator_name
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1 ${whereClause}
      GROUP BY e.id, u.name
      ORDER BY e.date ASC
      LIMIT $1 OFFSET $2
    `, params);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM events e WHERE 1=1 ${whereClause}
    `, params.slice(2));

    res.json({
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// GET /api/events/upcoming - upcoming events with pagination
router.get('/upcoming', authenticate, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(`
      SELECT e.*, COUNT(r.id) as registration_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
      WHERE e.date >= NOW() AND e.status != 'cancelled'
      GROUP BY e.id
      ORDER BY e.date ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM events e
      WHERE e.date >= NOW() AND e.status != 'cancelled'
    `);

    res.json({
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get upcoming events error:', err);
    res.status(500).json({ error: 'Failed to get upcoming events' });
  }
});

// GET /api/events/stats/overview - admin stats
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
        SUM(capacity) as total_capacity,
        AVG(price) as avg_price
      FROM events
    `);

    const regStats = await pool.query(`
      SELECT
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_registrations,
        COUNT(CASE WHEN r.status = 'checked_in' THEN 1 END) as checked_in_registrations,
        SUM(CASE WHEN payment_status = 'paid' THEN e.price ELSE 0 END) as total_revenue
      FROM registrations r
      JOIN events e ON r.event_id = e.id
    `);

    res.json({
      events: stats.rows[0],
      registrations: regStats.rows[0]
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// GET /api/events/:id - single event with stats
router.get('/:id', authenticate, async (req, res) => {
  const eventId = parseInt(req.params.id);

  try {
    const result = await pool.query(`
      SELECT e.*,
        COUNT(r.id) as registration_count,
        COUNT(CASE WHEN r.payment_status = 'paid' THEN 1 END) as paid_registrations,
        COUNT(CASE WHEN r.status = 'checked_in' THEN 1 END) as checked_in_count,
        u.name as creator_name
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status IN ('confirmed', 'checked_in')
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
      GROUP BY e.id, u.name
    `, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// POST /api/events - admin only, create event
router.post('/', authenticate, requireAdmin, validateEvent, async (req, res) => {
  const { title, description, date, venue, category, capacity, organizer, price } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, date, venue, category, capacity, organizer, price, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [title, description, date, venue, category, capacity || 100, organizer, price || 0, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id - admin only, update event
// validateEvent is intentionally omitted so partial updates are allowed.
// Only fields present in the request body are updated; missing fields retain
// their current DB values via a dynamic SET clause.
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const { title, description, date, venue, category, capacity, organizer, status, price } = req.body;

  try {
    // Build SET clause dynamically from only the fields that were actually sent
    const UPDATABLE_FIELDS = { title, description, date, venue, category, capacity, organizer, status, price };
    const setClauses = [];
    const params = [];

    for (const [field, value] of Object.entries(UPDATABLE_FIELDS)) {
      if (value !== undefined) {
        params.push(value);
        setClauses.push(`${field}=$${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    params.push(eventId);

    const result = await pool.query(
      `UPDATE events SET ${setClauses.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - admin only
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id);

  try {
    // Fetch the event to check its date
    const eventResult = await pool.query(
      'SELECT date FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventDate = new Date(eventResult.rows[0].date);
    const isCompleted = eventDate < new Date(); // past date = completed event

    if (!isCompleted) {
      // Only block deletion of upcoming/active events that have registrations
      const regCheck = await pool.query(
        'SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status IN (\'confirmed\', \'checked_in\')',
        [eventId]
      );

      if (parseInt(regCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot delete active event with registrations. Cancel the event instead.'
        });
      }
    }
    // Completed events (past date) are always deletable regardless of registrations

    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;