const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'anraone_attendance_fallback_secret';

/**
 * authMiddleware — Verifies Bearer JWT token from Authorization header.
 * Attaches decoded user to req.user for downstream handlers.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user from DB to ensure they still exist and are active
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`Auth Middleware Error: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please log in again.',
    });
  }
};

/**
 * roleMiddleware — Factory function that checks if req.user has one of
 * the allowed roles. Must be used AFTER authMiddleware.
 *
 * Usage: roleMiddleware('Admin', 'Manager')
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
