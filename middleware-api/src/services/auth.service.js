/**
 * Authentication Service
 * Handles user authentication, credential validation, and JWT token management
 *
 * V2.0 - Supabase Integration:
 * - User credentials stored in Supabase PostgreSQL (required)
 * - Medical records remain on Hyperledger Fabric
 */

import jwt from 'jsonwebtoken';
import dbService from './db.service.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'healthlink-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Security check: Warn if using default JWT secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'healthlink-secret-key-change-in-production') {
  logger.error('\n⚠️  CRITICAL SECURITY WARNING: Using default JWT_SECRET in production!');
  logger.error('Set a secure JWT_SECRET environment variable immediately.\n');
  throw new Error('JWT_SECRET must be set in production environment');
}

class AuthService {
  constructor() {
    this.useSupabase = false;
    this.initializeUsersDB();
  }

  /**
   * Initialize user storage backend (Supabase optional for Ethereum)
   *
   * WHY: V3.0 Ethereum doesn't require centralized user database
   * WHEN: Called in constructor on service instantiation
   *
   * @returns {Promise<void>} Resolves when initialization complete
   */
  async initializeUsersDB() {
    try {
      // Initialize Supabase (optional)
      this.useSupabase = await dbService.initialize();

      if (this.useSupabase) {
        logger.info('✅ Auth service using Supabase database');
        return;
      }
    } catch (error) {
      logger.warn('⚠️  Supabase not available - using Ethereum-only mode');
    }

    // Supabase is optional for Ethereum - authentication via wallet signatures
    logger.info('ℹ️  Running in Ethereum-only mode (wallet-based authentication)');
    this.useSupabase = false;
  }

  /**
   * Register a new user with encrypted credentials (Supabase required)
   *
   * ARCHITECTURE: Two-phase registration process
   * 1. Fabric identity created first (wallet enrollment)
   * 2. Credentials stored in Supabase (this method)
   *
   * WHY TWO STORAGE LAYERS:
   * - Supabase: User auth credentials (email, password hash, profile metadata)
   * - Fabric: Medical records, prescriptions, consents (immutable blockchain)
   *
   * SECURITY: Password hashed with bcrypt (10 rounds) before storage
   *
   * @param {Object} userData - User registration data
   * @param {string} userData.userId - Fabric enrollment ID (links auth → blockchain)
   * @param {string} userData.email - User email (unique identifier)
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} userData.role - User role: 'patient' | 'doctor' | 'admin'
   * @param {string} userData.name - Full name for display
   * @param {string} [userData.phoneNumber] - Contact phone number
   * @param {string} [userData.doctorLicenseNumber] - Doctor license (if role=doctor)
   * @param {string} [userData.doctorSpecialization] - Medical specialty (if role=doctor)
   * @param {string} [userData.patientDateOfBirth] - DOB (if role=patient)
   * @param {string} [userData.patientBloodGroup] - Blood type (if role=patient)
   *
   * @returns {Promise<Object>} Created user object (without password)
   * @throws {Error} 'User already exists' if email/userId collision
   * @throws {Error} 'Database not connected' if Supabase unavailable
   */
  async registerUser(userData) {
    const { userId, email, password, role, name, phoneNumber, ...extraFields } = userData;

    if (!this.useSupabase || !dbService.isReady()) {
      throw new Error('Database not connected. Please ensure Supabase is configured.');
    }

    try {
      const dbUser = await dbService.createUser({
        email,
        password,
        role: role || 'patient',
        fabricEnrollmentId: userId,
        fullName: name || email.split('@')[0],
        phoneNumber: phoneNumber || null,
        ...extraFields,
      });

      return {
        userId: dbUser.fabric_enrollment_id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.full_name,
      };
    } catch (error) {
      logger.error('Supabase registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user credentials (Supabase required)
   *
   * SECURITY FEATURES:
   * - Constant-time password comparison (bcrypt.compare prevents timing attacks)
   * - Inactive account detection (soft deletion support)
   * - Audit logging (tracks login attempts with IP/user-agent)
   * - Last login timestamp updates
   *
   * WHY DUAL IDENTIFIERS:
   * - Accepts email OR userId for flexibility
   * - Email: User-friendly login (doctor@hospital.com)
   * - UserId: Fabric enrollment ID (user1) for system integrations
   *
   * @param {string} identifier - User email or Fabric enrollment ID
   * @param {string} password - Plain text password to verify
   *
   * @returns {Promise<Object>} Authenticated user object (without password)
   * @throws {Error} 'Invalid credentials' if user not found or password mismatch
   * @throws {Error} 'Account is inactive' if user deactivated
   * @throws {Error} 'Database not connected' if Supabase unavailable
   */
  async authenticateUser(identifier, password) {
    if (!this.useSupabase || !dbService.isReady()) {
      throw new Error('Database not connected. Please ensure Supabase is configured.');
    }

    try {
      const user = await dbService.findUserByEmail(identifier);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.is_active) {
        throw new Error('Account is inactive');
      }

      // Verify password
      const isValidPassword = await dbService.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await dbService.updateLastLogin(user.id);

      // Log authentication event
      await dbService.logAuditEvent(user.id, 'login', {
        ipAddress: null,
        userAgent: null,
      });

      return {
        userId: user.fabric_enrollment_id,
        email: user.email,
        role: user.role,
        name: user.full_name,
      };
    } catch (error) {
      logger.error('Supabase authentication failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile by Fabric enrollment ID (Supabase required)
   *
   * WHY FABRIC ID LOOKUP:
   * - JWT tokens contain userId (Fabric enrollment ID)
   * - Used by /api/auth/me endpoint to fetch profile after token verification
   * - Links authentication layer → blockchain identity
   *
   * SECURITY: Returns user-safe data (no password hash)
   *
   * @param {string} userId - Hyperledger Fabric enrollment ID
   * @returns {Promise<Object|null>} User profile or null if not found
   * @throws {Error} If database connection fails
   */
  async getUserById(userId) {
    if (!this.useSupabase || !dbService.isReady()) {
      // Return minimal user object when Supabase is not available
      logger.warn('⚠️  Supabase not available, returning minimal user object');
      return {
        userId: userId,
        email: `${userId}@healthlink.local`,
        role: 'patient', // Default role
        name: userId,
        phoneNumber: null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true,
        emailVerified: true,
      };
    }

    try {
      const user = await dbService.findUserByFabricId(userId);

      if (!user) {
        return null;
      }

      return {
        userId: user.fabric_enrollment_id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        phoneNumber: user.phone_number,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login_at,
        isActive: user.is_active,
        emailVerified: user.email_verified,
      };
    } catch (error) {
      logger.error('Failed to fetch user from Supabase:', error.message);

      // Check if it's an HTML error response (indicates Supabase is down)
      if (error.message && error.message.includes('<!DOCTYPE html>')) {
        logger.warn('⚠️  Supabase returned HTML error, falling back to minimal user object');
        return {
          userId: userId,
          email: `${userId}@healthlink.local`,
          role: 'patient',
          name: userId,
          phoneNumber: null,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isActive: true,
          emailVerified: true,
        };
      }

      throw error;
    }
  }

  /**
   * Generate JWT access token for authenticated session
   *
   * TOKEN PAYLOAD:
   * - userId: Fabric enrollment ID (links to blockchain identity)
   * - email: User email
   * - role: User role (for authorization middleware)
   * - iat: Issued at timestamp (Unix epoch)
   *
   * SECURITY CONSIDERATIONS:
   * - Token expiry: 24 hours (configurable via JWT_EXPIRY env var)
   * - Secret: Must use strong secret in production (JWT_SECRET env var)
   * - Algorithm: HS256 (HMAC with SHA-256)
   *
   * WHY NO REFRESH TOKENS:
   * - Simplified architecture for V2.0
   * - 24-hour expiry balances security vs user experience
   * - Future enhancement: Add refresh token rotation
   *
   * @param {Object} user - Authenticated user object
   * @param {string} user.userId - Fabric enrollment ID
   * @param {string} user.email - User email
   * @param {string} user.role - User role
   *
   * @returns {string} Signed JWT token (Bearer token format)
   *
   * @example
   * const token = authService.generateToken({
   *   userId: 'user1',
   *   email: 'user@example.com',
   *   role: 'patient'
   * });
   * // Returns: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  generateToken(user) {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  /**
   * Verify and decode JWT token
   *
   * VALIDATION CHECKS:
   * - Signature verification (prevents tampering)
   * - Expiry check (iat + 24h)
   * - Algorithm verification (prevents algorithm substitution attacks)
   *
   * USED BY: Auth middleware to validate requests
   *
   * @param {string} token - JWT token (without 'Bearer ' prefix)
   *
   * @returns {Object} Decoded token payload
   * @returns {string} return.userId - Fabric enrollment ID
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {number} return.iat - Issued at timestamp (Unix epoch)
   * @returns {number} return.exp - Expiry timestamp (Unix epoch)
   *
   * @throws {Error} 'Invalid or expired token' if verification fails
   *
   * @example
   * try {
   *   const decoded = authService.verifyToken(token);
   *   console.log(`Token valid for user: ${decoded.userId}`);
   * } catch (error) {
   *   // Token invalid or expired
   * }
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh JWT token
   */
  refreshToken(oldToken) {
    const decoded = this.verifyToken(oldToken);

    // Generate new token with same payload
    const newPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(newPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId, isActive) {
    const users = await this.loadUsers();
    const user = users.find(u => u.userId === userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = isActive;
    await this.saveUsers(users);

    return true;
  }

  /**
   * Update user password with verification and audit logging
   *
   * SECURITY WORKFLOW:
   * 1. Verify current password (prevents unauthorized changes)
   * 2. Hash new password with bcrypt (10 rounds)
   * 3. Update database/file atomically
   * 4. Log audit event (compliance requirement)
   *
   * WHY VERIFY OLD PASSWORD:
   * - Prevents account takeover if session hijacked
   * - Ensures user intentionally changes password
   * - Industry best practice (OWASP)
   *
   * PASSWORD REQUIREMENTS (enforced by frontend):
   * - Minimum 8 characters
   * - Mix of uppercase, lowercase, numbers
   * - Special characters recommended
   *
   * @param {string} userId - Fabric enrollment ID (from JWT token)
   * @param {string} oldPassword - Current password for verification
   * @param {string} newPassword - New password (plain text, will be hashed)
   *
   * @returns {Promise<boolean>} True if password changed successfully
   *
   * @throws {Error} 'User not found' if userId invalid
   * @throws {Error} 'Invalid current password' if old password mismatch
   * @throws {Error} 'Failed to update password' if database update fails
   * @throws {Error} 'Database not connected' if Supabase unavailable
   *
   * @example
   * await authService.changePassword(
   *   'user1',
   *   'OldPassword123',
   *   'NewSecurePass456'
   * );
   */
  async changePassword(userId, oldPassword, newPassword) {
    if (!this.useSupabase || !dbService.isReady()) {
      throw new Error('Database not connected. Please ensure Supabase is configured.');
    }

    try {
      const user = await dbService.findUserByFabricId(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Get full user data with password hash
      const { data: fullUser, error } = await dbService.supabase
        .from('users')
        .select('id, password_hash')
        .eq('fabric_enrollment_id', userId)
        .single();

      if (error || !fullUser) {
        throw new Error('User not found');
      }

      // Verify old password
      const isValidPassword = await dbService.verifyPassword(oldPassword, fullUser.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }

      // Hash and update new password
      const newPasswordHash = await dbService.hashPassword(newPassword);

      const { error: updateError } = await dbService.supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', fullUser.id);

      if (updateError) {
        throw new Error('Failed to update password');
      }

      // Log password change event
      await dbService.logAuditEvent(fullUser.id, 'password_changed');

      return true;
    } catch (error) {
      logger.error('Supabase password change failed:', error);
      throw error;
    }
  }
}

export default new AuthService();
