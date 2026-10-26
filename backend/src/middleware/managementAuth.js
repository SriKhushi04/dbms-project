// ============================================================================
// HOSTELHUB MANAGEMENT AUTHORIZATION MIDDLEWARE (DEMO MODE)
// Enforces role-based permissions and student ownership without passwords.
// Uses existing registration-number identity conventions and demo staff roles.
// ============================================================================

import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return secret;
}

/**
 * Verifies demo session token from Authorization header (Bearer <token>)
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
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Demo session has expired. Please select your demo identity again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }
}

/**
 * Enforces role-based restrictions (Warden, Accountant, Mess Supervisor, Security Guard)
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
        message: `Forbidden. Operation requires role in: [${allowedRoles.join(', ')}]. Active demo role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * Enforces student role and binds student ID
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
 * Generates signed JWT session token
 */
export function generateToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}
