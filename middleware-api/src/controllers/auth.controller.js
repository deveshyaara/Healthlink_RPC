/**
 * Authentication Controller
 * Handles login, logout, registration, and session management
 */

import authService from '../services/auth.service.js';
import logger from '../utils/logger.js';

class AuthController {
  /**
   * @route   POST /api/auth/login
   * @desc    Authenticate user and return JWT token
   * @access  Public
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Email and password are required',
          error: {
            code: 'MISSING_CREDENTIALS',
            details: 'Both email and password must be provided',
          },
        });
      }

      // Authenticate user
      const user = await authService.authenticateUser(email, password);

      // Note: Blockchain operations now use admin identity, so user wallet identity is not required for login
      // This allows authentication to work without individual user blockchain identities

      // Generate JWT token
      const token = authService.generateToken(user);

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            walletAddress: user.fabric_enrollment_id,
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);

      if (error.message === 'Invalid credentials' || error.message === 'Account is inactive') {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: error.message,
          error: {
            code: 'AUTH_FAILED',
            details: error.message,
          },
        });
      }

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Login failed',
        error: {
          code: 'LOGIN_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   POST /api/auth/register
   * @desc    Register new user with password and blockchain identity
   * @access  Public
   */
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Name, email, and password are required',
          error: {
            code: 'MISSING_FIELDS',
            details: 'All registration fields must be provided',
          },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Invalid email format',
          error: {
            code: 'INVALID_EMAIL',
            details: 'Please provide a valid email address',
          },
        });
      }

      // Validate password strength (min 6 characters)
      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Password must be at least 6 characters',
          error: {
            code: 'WEAK_PASSWORD',
            details: 'Password must be at least 6 characters long',
          },
        });
      }

      // Sanitize email to create userId (alphanumeric only)
      const userId = email.replace(/[^a-zA-Z0-9]/g, '');

      // Check if user already exists
      const existingUser = await authService.getUserById(userId);
      if (existingUser) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: 'User already exists',
          error: {
            code: 'USER_EXISTS',
            details: 'An account with this email already exists',
          },
        });
      }

      // Note: Blockchain operations use admin identity
      // User blockchain identity registration is no longer required
      // Users will authenticate via JWT and blockchain operations use admin credentials

      // Register user with password
      const user = await authService.registerUser({
        userId,
        email,
        password,
        role: role || 'client',
        name,
      });

      // Generate JWT token
      const token = authService.generateToken(user);

      return res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Registration successful',
        data: {
          token,
          user: {
            id: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            walletAddress: user.fabric_enrollment_id,
          },
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error.message === 'User already exists') {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: 'User already exists',
          error: {
            code: 'USER_EXISTS',
            details: error.message,
          },
        });
      }

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Registration failed',
        error: {
          code: 'REGISTRATION_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout user (client-side token removal)
   * @access  Private
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // You could implement token blacklisting here if needed

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Logout successful',
        data: {
          message: 'Token invalidated on client side',
        },
      });
    } catch (error) {
      logger.error('Logout error:', error);

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Logout failed',
        error: {
          code: 'LOGOUT_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   GET /api/auth/me
   * @desc    Get current user profile
   * @access  Private
   */
  async getMe(req, res) {
    try {
      // User is already attached to req by authenticateJWT middleware
      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          status: 'error',
          statusCode: 404,
          message: 'User not found',
          error: {
            code: 'USER_NOT_FOUND',
            details: 'User profile does not exist',
          },
        });
      }

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'User profile retrieved successfully',
        data: {
          user: {
            id: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            walletAddress: user.fabric_enrollment_id,
          },
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Failed to retrieve profile',
        error: {
          code: 'PROFILE_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   POST /api/auth/refresh
   * @desc    Refresh JWT token
   * @access  Private
   */
  async refreshToken(req, res) {
    try {
      // Extract current token
      const authHeader = req.headers.authorization;
      const token = authHeader.substring(7);

      // Generate new token
      const newToken = authService.refreshToken(token);

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Token refresh failed',
        error: {
          code: 'REFRESH_ERROR',
          details: error.message,
        },
      });
    }
  }

  /**
   * @route   POST /api/auth/change-password
   * @desc    Change user password
   * @access  Private
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Old and new passwords are required',
          error: {
            code: 'MISSING_PASSWORDS',
            details: 'Both old and new passwords must be provided',
          },
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'New password must be at least 6 characters',
          error: {
            code: 'WEAK_PASSWORD',
            details: 'Password must be at least 6 characters long',
          },
        });
      }

      await authService.changePassword(req.user.userId, oldPassword, newPassword);

      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Password changed successfully',
        data: {
          message: 'Your password has been updated',
        },
      });
    } catch (error) {
      logger.error('Change password error:', error);

      if (error.message === 'Invalid current password') {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Invalid current password',
          error: {
            code: 'INVALID_PASSWORD',
            details: 'The current password is incorrect',
          },
        });
      }

      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Password change failed',
        error: {
          code: 'PASSWORD_CHANGE_ERROR',
          details: error.message,
        },
      });
    }
  }
}

export default new AuthController();
