// ============================================================================
// Authentication & Role-Based Authorization Middleware
// Supports JWT tokens passed in Authorization header: Bearer <token>
// ============================================================================

import jwt from 'jsonwebtoken';

/**
 * Validates and retrieves the JWT secret key from the environment.
 * Rejects execution if the secret is missing or insufficiently random (< 32 chars).
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing, empty, or insecure. ' +
      'A secret of at least 32 characters is required for secure cryptographic signing.'
    );
  }
  return secret.trim();
};

// Verify JWT and attach user object to req
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded; // { id, role, registration_number/email, merit_rank, name }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session. Please log in again.'
    });
  }
};

// Enforce specific role (e.g. 'ADMIN', 'STUDENT')
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

export const signToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

