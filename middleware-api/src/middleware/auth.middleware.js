/**
 * Authentication Middleware
 * JWT token validation and Fabric identity loading
 */

import authService from '../services/auth.service.js';
import { getWalletServiceInstance } from '../services/wallet.service.js';

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
          details: 'Authorization header with Bearer token is required'
        }
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
          details: error.message
        }
      });
    }

    // Get user details
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'User not found',
        error: {
          code: 'USER_NOT_FOUND',
          details: 'User associated with token does not exist'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Account is inactive',
        error: {
          code: 'ACCOUNT_INACTIVE',
          details: 'User account has been deactivated'
        }
      });
    }

    // Load Fabric wallet identity
    try {
      const walletService = await getWalletServiceInstance();
      const identity = await walletService.getIdentity(user.userId);
      if (!identity) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: 'Blockchain identity not found',
          error: {
            code: 'IDENTITY_NOT_FOUND',
            details: 'No Fabric wallet identity exists for this user'
          }
        });
      }

      // Attach user and identity to request
      req.user = user;
      req.fabricIdentity = {
        userId: user.userId,
        mspId: identity.mspId,
        type: identity.type
      };

      next();
    } catch (error) {
      console.error('Failed to load Fabric identity:', error);
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Failed to load blockchain identity',
        error: {
          code: 'IDENTITY_LOAD_ERROR',
          details: error.message
        }
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Authentication failed',
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        details: error.message
      }
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
          details: 'This endpoint requires authentication'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Insufficient permissions',
        error: {
          code: 'PERMISSION_DENIED',
          details: `Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
        }
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
