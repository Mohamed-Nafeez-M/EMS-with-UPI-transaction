const jwt = require('jsonwebtoken');

/**
 * authenticate — verifies Bearer JWT and attaches decoded payload to req.user
 * The token payload contains:
 *   { id, email, name, roles: ['admin','student'], selectedRole: 'admin' }
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * requireAdmin — user must have 'admin' in their roles array.
 * If they have multiple roles, they must also have selected 'admin'
 * as their active session role (selectedRole).
 */
const requireAdmin = (req, res, next) => {
  const roles = req.user.roles || [];

  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // If user has multiple roles, enforce that they selected admin for this session
  if (roles.length > 1 && req.user.selectedRole && req.user.selectedRole !== 'admin') {
    return res.status(403).json({ error: 'Please switch to Admin role to perform this action' });
  }

  next();
};

const requireAdminOrSelf = (req, res, next) => {
  const roles = req.user.roles || [];
  if (!roles.includes('admin') && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const preventSelfRoleChange = (req, res, next) => {
  // Block users from changing their own roles
  if (req.user.id === parseInt(req.params.id) && req.body.roles) {
    return res.status(403).json({ error: 'Cannot change your own roles' });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrSelf,
  preventSelfRoleChange,
};