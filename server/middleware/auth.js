const jwt = require('jsonwebtoken');
const User = require('../models/User');

if (!process.env.JWT_SECRET) throw new Error('[FATAL] JWT_SECRET env var is not set. Server cannot start.');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * requireRole(...roles) — middleware factory for role-based access control.
 * Usage: router.delete('/:id', auth, requireRole('admin','manager'), handler)
 *
 * Roles (least → most privileged): viewer < manager < admin
 */
const ROLE_RANK = { viewer: 0, member: 0, manager: 1, admin: 2, owner: 3 };

const requireRole = (...roles) => (req, res, next) => {
  const userRank     = ROLE_RANK[req.user?.role] ?? -1;
  const requiredRank = Math.min(...roles.map(r => ROLE_RANK[r] ?? 99));
  if (userRank >= requiredRank) return next();
  return res.status(403).json({ message: 'You do not have permission to perform this action.' });
};

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token missing' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please log in again' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};


module.exports = auth;
module.exports.requireRole = requireRole;
