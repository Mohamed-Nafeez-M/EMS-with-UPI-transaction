const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const sendEmail = require('../utils/sendEmail');
const {
  authenticate,
  requireAdmin,
  requireAdminOrSelf,
  preventSelfRoleChange,
} = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

// Helper: build safe user object (strip password, ensure roles is always array)
const safeUser = (u) => {
  const { password: _, ...rest } = u;
  rest.roles = Array.isArray(rest.roles) ? rest.roles : [rest.roles || 'student'];
  return rest;
};

// Helper: sign JWT with roles array + optional selectedRole
const signToken = (user, selectedRole = null) => {
  const roles = Array.isArray(user.roles) ? user.roles : [user.roles || 'student'];
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
    // selectedRole is the active role the user picked at login (for multi-role users)
    selectedRole: selectedRole || (roles.length === 1 ? roles[0] : null),
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', validateUser, async (req, res) => {
  const { name, email, password, department, student_id } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, roles, department, student_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, roles, department, student_id`,
      [name, email, hashed, ['student'], department || null, student_id || null]
    );

    const user = result.rows[0];
    const token = signToken(user, 'student');

    setImmediate(() => {
      sendEmail(user.email, user.name).catch(err =>
        console.error('Email sending failed:', err)
      );
    });

    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Returns: { token, user, requireRoleSelection: bool }
// If user has multiple roles, frontend should show the role picker modal.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles || 'student'];
    const requireRoleSelection = roles.length > 1;

    // Issue token without selectedRole when multiple roles exist.
    // Frontend will call /api/auth/select-role after user picks.
    const token = signToken(user, requireRoleSelection ? null : roles[0]);

    res.json({
      token,
      user: safeUser(user),
      requireRoleSelection,
      availableRoles: roles,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/select-role
// Called after multi-role login. Returns a new token with selectedRole set.
// Body: { selectedRole: 'admin' | 'student' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/select-role', authenticate, async (req, res) => {
  const { selectedRole } = req.body;

  if (!selectedRole) {
    return res.status(400).json({ error: 'selectedRole is required' });
  }

  const roles = req.user.roles || [];
  if (!roles.includes(selectedRole)) {
    return res.status(403).json({ error: `You do not have the '${selectedRole}' role` });
  }

  try {
    // Fetch fresh user data
    const result = await pool.query(
      'SELECT id, name, email, roles, department, student_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const token = signToken(user, selectedRole);

    res.json({ token, user: safeUser(user), selectedRole });
  } catch (err) {
    console.error('Role selection error:', err);
    res.status(500).json({ error: 'Failed to select role' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, roles, department, student_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: safeUser(result.rows[0]) });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/users  — Admin only: List users with search + role filter
// Query params: page, limit, search, role
// FIXED: search now covers name, email, AND student_id
// FIXED: role filter works with array column using @> operator
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const conditions = ['1=1'];
    const params = [];

    // Search: name, email, student_id
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      params.push(s);
      conditions.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length} OR student_id ILIKE $${params.length})`
      );
    }

    // Role filter: use PostgreSQL array contains operator @>
    if (role && role.trim()) {
      params.push(`{${role.trim()}}`);
      conditions.push(`roles @> $${params.length}::text[]`);
    }

    const where = conditions.join(' AND ');

    // Data query
    const dataParams = [...params, parseInt(limit), offset];
    const dataResult = await pool.query(
      `SELECT id, name, email, roles, department, student_id, created_at
       FROM users
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE ${where}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: dataResult.rows.map(safeUser),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/users/:id  — Admin only: Update user (including multi-role)
// Body: { name, email, roles: ['admin','student'], department, student_id }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/users/:id', authenticate, requireAdmin, preventSelfRoleChange, async (req, res) => {
  const { name, email, roles, department, student_id } = req.body;
  const userId = parseInt(req.params.id);

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Validate roles array
  if (roles !== undefined) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'roles must be a non-empty array' });
    }
    const validRoles = ['admin', 'student'];
    for (const r of roles) {
      if (!validRoles.includes(r)) {
        return res.status(400).json({ error: `Invalid role: ${r}` });
      }
    }
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2,
           roles = COALESCE($3, roles),
           department = $4, student_id = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, roles, department, student_id, updated_at`,
      [name, email, roles || null, department || null, student_id || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: safeUser(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/users/:id  — Admin only
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);

  if (req.user.id === userId) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;