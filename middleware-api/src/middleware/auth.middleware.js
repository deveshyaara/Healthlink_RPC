/**
 * Authentication Middleware
 * JWT token validation and Fabric identity loading
 */

import authService from '../services/auth.service.js';
import logger from '../utils/logger.js';

/**
 * Authenticate JWT token and load Fabric identity
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'No authentication token provided',
        error: {
          code: 'AUTH_TOKEN_MISSING',
          details: 'Authorization header with Bearer token is required',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = authService.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Invalid or expired token',
        error: {
          code: 'AUTH_TOKEN_INVALID',
          details: error.message,
        },
      });
    }

    // Get user details (with fallback for Supabase issues)
    let user;
    try {
      user = await authService.getUserById(decoded.userId);
    } catch (error) {
      logger.warn('⚠️  Supabase user lookup failed, using JWT data as fallback: %s', error.message);

      // Fallback: Create minimal user object from JWT data
      // This allows the API to work even when Supabase is down
      user = {
        userId: decoded.userId,
        email: decoded.email || `${decoded.userId}@healthlink.local`,
        role: decoded.role || 'patient',
        name: decoded.name || decoded.userId,
        phoneNumber: null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true,
        emailVerified: true, // Assume verified for JWT users
      };
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'User not found',
        error: {
          code: 'USER_NOT_FOUND',
          details: 'User associated with token does not exist',
        },
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Account is inactive',
        error: {
          code: 'ACCOUNT_INACTIVE',
          details: 'User account has been deactivated',
        },
      });
    }

    // Note: Blockchain operations now use admin identity
    // User wallet identity check is no longer required
    try {
      // Attach user to request (Fabric identity will be admin)
      req.user = user;
      req.fabricIdentity = {
        userId: 'admin', // Use admin for blockchain operations
        mspId: 'Org1MSP',
        type: 'X.509',
      };

      // Add wallet address for permission checks
      req.user.walletAddress = user.fabric_enrollment_id;

      next();
    } catch (error) {
      logger.error('Failed to load Fabric identity:', error);
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Failed to load blockchain identity',
        error: {
          code: 'IDENTITY_LOAD_ERROR',
          details: error.message,
        },
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Authentication failed',
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated users
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token, continue without user context
    req.user = null;
    req.fabricIdentity = null;
    return next();
  }

  // Token provided, try to authenticate
  return authenticateJWT(req, res, next);
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required',
        error: {
          code: 'AUTH_REQUIRED',
          details: 'This endpoint requires authentication',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Insufficient permissions',
        error: {
          code: 'PERMISSION_DENIED',
          details: `Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
        },
      });
    }

    next();
  };
};

/**
 * Admin-only access
 */
export const requireAdmin = requireRole('admin');

/**
 * Doctor or admin access
 */
export const requireDoctor = requireRole('doctor', 'admin');

/**
 * Patient access (for their own records)
 */
export const requirePatient = requireRole('patient', 'client', 'admin');
