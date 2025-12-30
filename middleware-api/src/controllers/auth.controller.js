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
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS',
          details: 'Both email and password must be provided',
        });
      }

      // Authenticate user
      const user = await authService.authenticateUser(email, password);

      // Note: Blockchain operations now use admin identity, so user wallet identity is not required for login
      // This allows authentication to work without individual user blockchain identities

      // Generate JWT token
      const token = authService.generateToken(user);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.fabric_enrollment_id,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);

      if (error.message === 'Invalid credentials' || error.message === 'Account is inactive') {
        return res.status(401).json({
          success: false,
          error: error.message,
          code: 'AUTH_FAILED',
        });
      }

      if (error.message && (error.message.includes('Database not connected') || error.message.includes('Supabase'))) {
        return res.status(503).json({
          success: false,
          error: 'Database not connected',
          code: 'DB_NOT_CONNECTED',
          details: 'Supabase is not configured or currently unavailable. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR',
        details: error.message,
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
          success: false,
          error: 'Name, email, and password are required',
          code: 'MISSING_FIELDS',
          details: 'All registration fields must be provided',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          code: 'INVALID_EMAIL',
          details: 'Please provide a valid email address',
        });
      }

      // Validate password strength (min 6 characters)
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
          code: 'WEAK_PASSWORD',
          details: 'Password must be at least 6 characters long',
        });
      }

      // Sanitize email to create userId (alphanumeric only)
      const userId = email.replace(/[^a-zA-Z0-9]/g, '');

      // Check if user already exists
      const existingUser = await authService.getUserById(userId);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          code: 'USER_EXISTS',
          details: 'An account with this email already exists',
        });
      }

      // Check if this email exists in patient_wallet_mappings (created by a doctor)
      // If so, use that wallet address instead of the sanitized email
      let walletAddress = userId; // Default to sanitized email
      let existingPatient = null;

      try {
        const dbService = (await import('../services/db.service.prisma.js')).default;
        const db = dbService.prisma;

        if (db?.patientWalletMapping) {
          existingPatient = await db.patientWalletMapping.findUnique({
            where: { email },
            select: { walletAddress: true, id: true }
          });

          if (existingPatient) {
            walletAddress = existingPatient.walletAddress;
            logger.info(`Found existing patient record for ${email}, using wallet: ${walletAddress}`);
          }
        }
      } catch (patientLookupError) {
        logger.warn(`Could not lookup patient wallet mapping: ${patientLookupError.message}`);
        // Continue with sanitized email as fallback
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
        walletAddress, // Use the wallet address from patient mapping or sanitized email
      });

      // Generate JWT token
      const token = authService.generateToken(user);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.fabric_enrollment_id || walletAddress,
        },
        message: 'Registration successful',
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error.message === 'User already exists') {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          code: 'USER_EXISTS',
        });
      }

      if (error.message && (error.message.includes('Database not connected') || error.message.includes('Supabase'))) {
        return res.status(503).json({
          success: false,
          error: 'Database not connected',
          code: 'DB_NOT_CONNECTED',
          details: 'Supabase is not configured or currently unavailable. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR',
        details: error.message,
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
        success: true,
        message: 'Token invalidated on client side',
      });
    } catch (error) {
      logger.error('Logout error:', error);

      return res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR',
        details: error.message,
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
      // For patient role, user data is in PatientWalletMapping, not User table
      // So we return the user data from JWT directly
      if (req.user && req.user.role === 'patient') {
        return res.status(200).json({
          success: true,
          user: {
            id: req.user.id || req.user.userId,
            name: req.user.name || req.user.fullName || 'Patient',
            email: req.user.email,
            role: req.user.role,
            walletAddress: req.user.walletAddress || req.user.fabric_enrollment_id,
          },
        });
      }

      // For doctor/admin roles, fetch from User table
      const userId = req.user.userId || req.user.id;
      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          details: 'User profile does not exist',
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.fabric_enrollment_id,
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);

      if (error.message && (error.message.includes('Database not connected') || error.message.includes('Supabase'))) {
        return res.status(503).json({
          success: false,
          error: 'Database not connected',
          code: 'DB_NOT_CONNECTED',
          details: 'Supabase is not configured or currently unavailable. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve profile',
        code: 'PROFILE_ERROR',
        details: error.message,
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
        success: true,
        token: newToken,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      return res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR',
        details: error.message,
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
          success: false,
          error: 'Old and new passwords are required',
          code: 'MISSING_PASSWORDS',
          details: 'Both old and new passwords must be provided',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters',
          code: 'WEAK_PASSWORD',
          details: 'Password must be at least 6 characters long',
        });
      }

      await authService.changePassword(req.user.userId, oldPassword, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);

      if (error.message === 'Invalid current password') {
        return res.status(400).json({
          success: false,
          error: 'Invalid current password',
          code: 'INVALID_PASSWORD',
        });
      }

      if (error.message && (error.message.includes('Database not connected') || error.message.includes('Supabase'))) {
        return res.status(503).json({
          success: false,
          error: 'Database not connected',
          code: 'DB_NOT_CONNECTED',
          details: 'Supabase is not configured or currently unavailable. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Password change failed',
        code: 'PASSWORD_CHANGE_ERROR',
        details: error.message,
      });
    }
  }
}

export default new AuthController();
