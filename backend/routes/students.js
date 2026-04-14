const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/students - admin only
// Returns students with optional search + role filter
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { search = '', role = 'student' } = req.query;

    const conditions = [];
    const params = [];

    // Role filter — default to 'student', 'all' returns every user
    if (role && role !== 'all') {
      params.push([role]); // pass as array for @> operator
      conditions.push(`u.roles @> $${params.length}::text[]`);
    }

    // Search: name, email, department, student_id
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      params.push(s);
      conditions.push(
        `(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.department ILIKE $${params.length} OR u.student_id ILIKE $${params.length})`
      );
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.roles, u.department, u.student_id, u.created_at,
         COUNT(r.id) AS registration_count
       FROM users u
       LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'confirmed'
       ${where}
       GROUP BY u.id
       ORDER BY u.name ASC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/students/stats - admin dashboard stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [eventsRes, registrationsRes, studentsRes, upcomingRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query("SELECT COUNT(*) FROM registrations WHERE status = 'confirmed'"),
      // FIXED: use roles @> ARRAY['student'] instead of role = 'student'
      pool.query("SELECT COUNT(*) FROM users WHERE roles @> ARRAY['student']"),
      pool.query("SELECT COUNT(*) FROM events WHERE date >= NOW() AND status != 'cancelled'"),
    ]);

    const topEvents = await pool.query(`
      SELECT e.title, COUNT(r.id) AS count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
      GROUP BY e.id, e.title
      ORDER BY count DESC
      LIMIT 5
    `);

    const capacityData = await pool.query(`
      SELECT e.title, e.capacity, COUNT(r.id) AS registered
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
      GROUP BY e.id, e.title, e.capacity
      ORDER BY e.date ASC
      LIMIT 6
    `);

    res.json({
      totalEvents: parseInt(eventsRes.rows[0].count),
      totalRegistrations: parseInt(registrationsRes.rows[0].count),
      totalStudents: parseInt(studentsRes.rows[0].count),
      upcomingEvents: parseInt(upcomingRes.rows[0].count),
      topEvents: topEvents.rows,
      capacityData: capacityData.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/students/me - current user's own profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, roles, department, student_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;