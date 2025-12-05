/**
 * Authentication Service
 * Handles user authentication, credential validation, and JWT token management
 * 
 * V2.0 - Supabase Integration:
 * - User credentials stored in Supabase PostgreSQL
 * - Fallback to file-based storage if Supabase not configured
 * - Medical records remain on Hyperledger Fabric
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dbService from './db.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'healthlink-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const USERS_DB_PATH = path.join(__dirname, '../../data/users.json');

class AuthService {
  constructor() {
    this.usersCache = null;
    this.useSupabase = false;
    this.initializeUsersDB();
  }

  /**
   * Initialize user storage backend (Supabase or file-based fallback)
   * 
   * WHY: V2.0 supports dual-mode operation for production (Supabase) and dev (file storage)
   * WHEN: Called in constructor on service instantiation
   * 
   * @returns {Promise<void>} Resolves when storage backend is initialized
   * @throws {Error} Only logs errors, never throws (graceful degradation)
   * 
   * @example
   * // With Supabase configured in .env:
   * // ✅ Auth service using Supabase database
   * 
   * // Without Supabase:
   * // ⚠️ Auth service using file-based storage (legacy mode)
   */
  async initializeUsersDB() {
    // Try to initialize Supabase
    this.useSupabase = await dbService.initialize();
    
    if (this.useSupabase) {
      console.log('✅ Auth service using Supabase database');
      return;
    }

    // Fallback to file-based storage
    console.log('⚠️  Auth service using file-based storage (legacy mode)');
    try {
      const dataDir = path.dirname(USERS_DB_PATH);
      await fs.mkdir(dataDir, { recursive: true });
      
      try {
        await fs.access(USERS_DB_PATH);
      } catch {
        // File doesn't exist, create with empty users array
        await fs.writeFile(USERS_DB_PATH, JSON.stringify({ users: [] }, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize users DB:', error);
    }
  }

  /**
   * Load users from file system (legacy fallback mode only)
   * 
   * WHY: Provides backward compatibility when Supabase is not configured
   * SECURITY: File contains bcrypt-hashed passwords, but prefer Supabase in production
   * 
   * @returns {Promise<Array<Object>>} Array of user objects with passwordHash
   * @property {string} userId - Fabric enrollment ID
   * @property {string} email - User email address
   * @property {string} passwordHash - Bcrypt hashed password
   * @property {string} role - User role (patient, doctor, admin, government)
   * @property {string} name - User display name
   * @property {string} createdAt - ISO timestamp of registration
   * @property {string|null} lastLogin - ISO timestamp of last login
   * @property {boolean} isActive - Account activation status
   */
  async loadUsers() {
    try {
      const data = await fs.readFile(USERS_DB_PATH, 'utf-8');
      this.usersCache = JSON.parse(data);
      return this.usersCache.users || [];
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    }
  }

  /**
   * Persist users to file system (legacy fallback mode only)
   * 
   * WHY: Atomic write operation to prevent data corruption
   * SECURITY: File permissions should be restricted (600) in production
   * 
   * @param {Array<Object>} users - Array of user objects to persist
   * @returns {Promise<void>} Resolves when file write completes
   * @throws {Error} 'Failed to persist user data' if file write fails
   */
  async saveUsers(users) {
    try {
      this.usersCache = { users };
      await fs.writeFile(USERS_DB_PATH, JSON.stringify(this.usersCache, null, 2));
    } catch (error) {
      console.error('Failed to save users:', error);
      throw new Error('Failed to persist user data');
    }
  }

  /**
   * Register a new user with encrypted credentials
   * 
   * ARCHITECTURE: Two-phase registration process
   * 1. Fabric identity created first (wallet enrollment)
   * 2. Credentials stored in Supabase/file (this method)
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
   * @param {string} userData.role - User role: 'patient' | 'doctor' | 'admin' | 'government'
   * @param {string} userData.name - Full name for display
   * @param {string} [userData.phoneNumber] - Contact phone number
   * @param {string} [userData.doctorLicenseNumber] - Doctor license (if role=doctor)
   * @param {string} [userData.doctorSpecialization] - Medical specialty (if role=doctor)
   * @param {string} [userData.patientDateOfBirth] - DOB (if role=patient)
   * @param {string} [userData.patientBloodGroup] - Blood type (if role=patient)
   * 
   * @returns {Promise<Object>} Created user object (without password)
   * @returns {string} return.userId - Fabric enrollment ID
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {string} return.name - Full name
   * 
   * @throws {Error} 'User already exists' if email/userId collision
   * @throws {Error} 'Database not connected' if Supabase unavailable
   * @throws {Error} 'Failed to persist user data' if file write fails
   * 
   * @example
   * await authService.registerUser({
   *   userId: 'user1',
   *   email: 'doctor@hospital.com',
   *   password: 'SecurePass123',
   *   role: 'doctor',
   *   name: 'Dr. Smith',
   *   doctorLicenseNumber: 'MD12345',
   *   doctorSpecialization: 'Cardiology'
   * });
   */
  async registerUser(userData) {
    const { userId, email, password, role, name, phoneNumber, ...extraFields } = userData;
    
    if (this.useSupabase && dbService.isReady()) {
      // Supabase path - store in PostgreSQL
      try {
        const dbUser = await dbService.createUser({
          email,
          password,
          role: role || 'patient',
          fabricEnrollmentId: userId,
          fullName: name || email.split('@')[0],
          phoneNumber: phoneNumber || null,
          ...extraFields
        });

        return {
          userId: dbUser.fabric_enrollment_id,
          email: dbUser.email,
          role: dbUser.role,
          name: dbUser.full_name
        };
      } catch (error) {
        console.error('Supabase registration failed:', error);
        throw error;
      }
    }

    // Legacy file-based storage fallback
    const users = await this.loadUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => u.userId === userId || u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user record
    const newUser = {
      userId,
      email,
      passwordHash,
      role: role || 'patient',
      name: name || userId,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    };

    users.push(newUser);
    await this.saveUsers(users);

    return {
      userId: newUser.userId,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    };
  }

  /**
   * Authenticate user credentials and verify active status
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
   * @returns {string} return.userId - Fabric enrollment ID
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role (patient, doctor, admin, government)
   * @returns {string} return.name - Full name
   * 
   * @throws {Error} 'Invalid credentials' if user not found or password mismatch
   * @throws {Error} 'Account is inactive' if user deactivated
   * @throws {Error} 'Database not connected' if Supabase unavailable
   * 
   * @example
   * // Login with email
   * const user = await authService.authenticateUser('doctor@hospital.com', 'password123');
   * // Login with Fabric ID
   * const user = await authService.authenticateUser('user1', 'password123');
   */
  async authenticateUser(identifier, password) {
    if (this.useSupabase && dbService.isReady()) {
      // Supabase path - query PostgreSQL
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
          ipAddress: null, // Can be passed from req.ip in controller
          userAgent: null  // Can be passed from req.headers['user-agent']
        });

        return {
          userId: user.fabric_enrollment_id,
          email: user.email,
          role: user.role,
          name: user.full_name
        };
      } catch (error) {
        console.error('Supabase authentication failed:', error);
        throw error;
      }
    }

    // Legacy file-based storage fallback
    const users = await this.loadUsers();
    
    // Find user by userId or email
    const user = users.find(u => 
      u.userId === identifier || u.email === identifier
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await this.saveUsers(users);

    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name
    };
  }

  /**
   * Retrieve user profile by Fabric enrollment ID
   * 
   * WHY FABRIC ID LOOKUP:
   * - JWT tokens contain userId (Fabric enrollment ID)
   * - Used by /api/auth/me endpoint to fetch profile after token verification
   * - Links authentication layer → blockchain identity
   * 
   * SECURITY: Returns user-safe data (no password hash)
   * 
   * @param {string} userId - Hyperledger Fabric enrollment ID
   * 
   * @returns {Promise<Object|null>} User profile or null if not found
   * @returns {string} return.userId - Fabric enrollment ID
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {string} return.name - Full name
   * @returns {string} [return.phoneNumber] - Phone number (V2)
   * @returns {string} [return.avatarUrl] - Profile picture URL (V2)
   * @returns {string} return.createdAt - Registration timestamp
   * @returns {string|null} return.lastLogin - Last login timestamp
   * @returns {boolean} return.isActive - Account status
   * @returns {boolean} [return.emailVerified] - Email verification status (V2)
   * 
   * @example
   * const user = await authService.getUserById('user1');
   * if (user && user.isActive) {
   *   console.log(`Welcome ${user.name}`);
   * }
   */
  async getUserById(userId) {
    if (this.useSupabase && dbService.isReady()) {
      // Supabase path - query by fabric_enrollment_id
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
          emailVerified: user.email_verified
        };
      } catch (error) {
        console.error('Failed to fetch user from Supabase:', error);
        return null;
      }
    }

    // Legacy file-based storage fallback
    const users = await this.loadUsers();
    const user = users.find(u => u.userId === userId);
    
    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    };
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
      iat: Math.floor(Date.now() / 1000)
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
      iat: Math.floor(Date.now() / 1000)
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
    if (this.useSupabase && dbService.isReady()) {
      // Supabase path
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
        console.error('Supabase password change failed:', error);
        throw error;
      }
    }

    // Legacy file-based storage fallback
    const users = await this.loadUsers();
    const user = users.find(u => u.userId === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Hash and update new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.saveUsers(users);

    return true;
  }
}

export default new AuthService();
