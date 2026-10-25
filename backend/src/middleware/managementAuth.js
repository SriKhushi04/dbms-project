// ============================================================================
// HOSTELHUB MANAGEMENT AUTHENTICATION & RBAC MIDDLEWARE
// Strict token verification, role enforcement, and student ownership protection
// ============================================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hostelhub_management_jwt_secret_key_minimum_32_characters';

/**
 * Verifies JWT token from Authorization header (Bearer <token>)
 */
export function verifyManagementToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Missing or invalid Authorization Bearer header.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }
}

/**
 * Enforces role-based permissions (one of allowed roles)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Operation requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * Enforces student role and binds verified student identity
 */
export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. This action is restricted to students only.'
    });
  }
  req.studentId = req.user.sub;
  next();
}

/**
 * Generates signed JWT for student or staff
 */
export function generateToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
