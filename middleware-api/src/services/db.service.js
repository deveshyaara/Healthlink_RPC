/**
 * Database Service - Supabase Integration
 * 
 * Purpose: Handle user authentication and profile metadata storage
 * Constraint: ONLY for user accounts - medical records stay on Fabric blockchain
 * 
 * Architecture Decision:
 * - Supabase (PostgreSQL) = User credentials, profiles, metadata
 * - Hyperledger Fabric = Medical records, prescriptions, consents, audit trail
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

class DatabaseService {
  constructor() {
    this.supabase = null;
    this.isConnected = false;
  }

  /**
   * Initialize Supabase PostgreSQL client connection
   * 
   * ARCHITECTURE:
   * - Uses service role key (bypasses Row Level Security for backend operations)
   * - Tests connection with read query to users table
   * - Returns false (not throws) to allow graceful fallback to file storage
   * 
   * WHY SERVICE ROLE KEY:
   * - Backend needs full database access (create users, query all records)
   * - RLS policies still active for direct client access
   * - Service key should NEVER be exposed to frontend
   * 
   * ENV VARIABLES REQUIRED:
   * - SUPABASE_URL: Project URL (https://xxxxx.supabase.co)
   * - SUPABASE_SERVICE_KEY: Service role key (starts with eyJ...)
   * 
   * @returns {Promise<boolean>} True if connected, false if credentials missing/invalid
   * @throws {Error} Never throws - logs errors and returns false for graceful degradation
   * 
   * @example
   * const connected = await dbService.initialize();
   * if (connected) {
   *   console.log('✅ Supabase ready');
   * } else {
   *   console.log('⚠️ Falling back to file storage');
   * }
   */
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('⚠️  Supabase credentials not configured - running in legacy mode');
        console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env to enable user management');
        this.isConnected = false;
        return false;
      }

      // Initialize Supabase client with service role key (bypasses RLS)
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Test connection
      const { error } = await this.supabase.from('users').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Supabase connection failed:', error.message);
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      console.log('✅ Supabase database connected successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if database connection is active and ready for queries
   * 
   * WHY CHECK BOTH FLAGS:
   * - isConnected: Set after successful connection test
   * - supabase !== null: Ensures client object initialized
   * 
   * USED BY: All database methods before executing queries
   * 
   * @returns {boolean} True if connected and ready, false otherwise
   * 
   * @example
   * if (!dbService.isReady()) {
   *   throw new Error('Database not connected');
   * }
   */
  isReady() {
    return this.isConnected && this.supabase !== null;
  }

  /**
   * Hash password using bcrypt with salt rounds
   * 
   * SECURITY CONFIGURATION:
   * - Algorithm: bcrypt (designed for passwords, resistant to rainbow tables)
   * - Salt rounds: 10 (balance between security and performance)
   * - Each hash includes random salt (prevents rainbow table attacks)
   * 
   * WHY 10 ROUNDS:
   * - 2^10 = 1024 iterations
   * - ~100ms compute time on modern hardware
   * - Recommended by OWASP (10-12 rounds as of 2024)
   * - Can increase to 12 rounds if performance allows
   * 
   * @param {string} password - Plain text password (never stored directly)
   * @returns {Promise<string>} Hashed password (60 characters, includes salt)
   * 
   * @example
   * const hash = await dbService.hashPassword('SecurePass123');
   * // Returns: $2b$10$N9qo8uLOickgx2ZMRZoMye.ILG7fJYrwXuTUgOJC...
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify plain text password against stored bcrypt hash
   * 
   * SECURITY: Constant-time comparison prevents timing attacks
   * - bcrypt.compare() takes same time whether match or mismatch
   * - Attacker cannot deduce password by measuring response time
   * 
   * HOW IT WORKS:
   * 1. Extract salt from stored hash
   * 2. Hash provided password with same salt
   * 3. Compare resulting hashes byte-by-byte
   * 
   * @param {string} password - Plain text password to verify
   * @param {string} hash - Stored bcrypt hash from database
   * @returns {Promise<boolean>} True if password matches, false otherwise
   * 
   * @example
   * const isValid = await dbService.verifyPassword(
   *   'UserPassword123',
   *   user.password_hash
   * );
   * if (!isValid) throw new Error('Invalid credentials');
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create new user record in PostgreSQL database
   * 
   * ROLE-SPECIFIC FIELDS:
   * - Doctor: licenseNumber, specialization, hospitalAffiliation, verificationStatus
   * - Patient: dateOfBirth, bloodGroup, emergencyContact
   * - Admin/Government: No extra fields required
   * 
   * WHY fabricEnrollmentId:
   * - Links Supabase user record → Hyperledger Fabric identity
   * - Must be unique (enforced by DB constraint)
   * - Created during wallet enrollment (before this call)
   * 
   * DATABASE CONSTRAINTS:
   * - email: UNIQUE, NOT NULL, lowercased
   * - fabric_enrollment_id: UNIQUE, NOT NULL
   * - role: CHECK (patient, doctor, admin, government)
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email (will be lowercased)
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} userData.role - User role: 'patient' | 'doctor' | 'admin' | 'government'
   * @param {string} userData.fabricEnrollmentId - Hyperledger Fabric identity ID
   * @param {string} userData.fullName - Full name for display
   * @param {string} [userData.phoneNumber] - Contact phone number
   * @param {string} [userData.doctorLicenseNumber] - Medical license number (doctors only)
   * @param {string} [userData.doctorSpecialization] - Medical specialty (doctors only)
   * @param {string} [userData.doctorHospitalAffiliation] - Hospital name (doctors only)
   * @param {string} [userData.patientDateOfBirth] - Date of birth in YYYY-MM-DD (patients only)
   * @param {string} [userData.patientBloodGroup] - Blood type (patients only)
   * @param {string} [userData.patientEmergencyContact] - Emergency contact info (patients only)
   * 
   * @returns {Promise<Object>} Created user object (without password_hash)
   * @returns {string} return.id - UUID generated by database
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {string} return.fabric_enrollment_id - Fabric identity link
   * @returns {string} return.full_name - Full name
   * @returns {string} return.created_at - Timestamp of creation
   * 
   * @throws {Error} 'User with this email already exists' if email collision (SQLSTATE 23505)
   * @throws {Error} 'Database not connected' if Supabase not initialized
   * @throws {Error} 'Failed to create user: <details>' for other database errors
   * 
   * @example
   * const user = await dbService.createUser({
   *   email: 'doctor@hospital.com',
   *   password: 'SecurePass123',
   *   role: 'doctor',
   *   fabricEnrollmentId: 'user1',
   *   fullName: 'Dr. Jane Smith',
   *   doctorLicenseNumber: 'MD12345',
   *   doctorSpecialization: 'Cardiology'
   * });
   */
  async createUser(userData) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const {
      email,
      password,
      role,
      fabricEnrollmentId,
      fullName,
      phoneNumber,
      // Doctor fields
      doctorLicenseNumber,
      doctorSpecialization,
      doctorHospitalAffiliation,
      // Patient fields
      patientDateOfBirth,
      patientBloodGroup,
      patientEmergencyContact,
    } = userData;

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Insert user
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        fabric_enrollment_id: fabricEnrollmentId,
        full_name: fullName,
        phone_number: phoneNumber,
        // Doctor fields
        doctor_license_number: doctorLicenseNumber || null,
        doctor_specialization: doctorSpecialization || null,
        doctor_hospital_affiliation: doctorHospitalAffiliation || null,
        doctor_verification_status: role === 'doctor' ? 'pending' : null,
        // Patient fields
        patient_date_of_birth: patientDateOfBirth || null,
        patient_blood_group: patientBloodGroup || null,
        patient_emergency_contact: patientEmergencyContact || null,
      })
      .select('id, email, role, fabric_enrollment_id, full_name, created_at')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User with this email already exists');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  /**
   * Find user by email address (used for login authentication)
   * 
   * SECURITY CONSIDERATIONS:
   * - Returns FULL user object including password_hash (for verification)
   * - Email lookup is case-insensitive (normalized to lowercase)
   * - Only returns active users (is_active = true)
   * - Do NOT expose password_hash to frontend/logs
   * 
   * WHY INCLUDE PASSWORD_HASH:
   * - Required for bcrypt.compare() during login
   * - Caller responsible for not leaking hash
   * - Use users_safe view for non-auth queries
   * 
   * @param {string} email - User email address (case-insensitive)
   * @returns {Promise<Object|null>} User object with password_hash, or null if not found
   * @returns {string} return.id - User UUID
   * @returns {string} return.email - User email (lowercased)
   * @returns {string} return.password_hash - Bcrypt hash (DO NOT EXPOSE)
   * @returns {string} return.role - User role
   * @returns {string} return.fabric_enrollment_id - Fabric identity link
   * @returns {string} return.full_name - Full name
   * @returns {boolean} return.is_active - Account status
   * @returns {string} return.created_at - Registration timestamp
   * @returns {string|null} return.last_login_at - Last login timestamp
   * 
   * @throws {Error} 'Database not connected' if Supabase not initialized
   * @throws {Error} 'Failed to find user: <details>' for database errors
   * 
   * @example
   * const user = await dbService.findUserByEmail('doctor@hospital.com');
   * if (user) {
   *   const isValid = await dbService.verifyPassword(password, user.password_hash);
   * }
   */
  async findUserByEmail(email) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data;
  }

  /**
   * Find user by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>} - User data (without password hash)
   */
  async findUserById(userId) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { data, error } = await this.supabase
      .from('users_safe')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data;
  }

  /**
   * Find user by Hyperledger Fabric enrollment ID
   * 
   * WHY THIS METHOD EXISTS:
   * - JWT tokens contain userId (Fabric enrollment ID, not database UUID)
   * - Bridges authentication layer → blockchain identity
   * - Used by /api/auth/me endpoint after JWT verification
   * 
   * SECURITY: Returns users_safe view (NO password_hash)
   * 
   * FABRIC ENROLLMENT ID STRUCTURE:
   * - Format: 'user1', 'doctor2', 'admin1' (alphanumeric string)
   * - Created during Fabric wallet enrollment
   * - Stored in fabric_enrollment_id column (UNIQUE constraint)
   * - Links Supabase user ↔ Fabric identity in wallet
   * 
   * @param {string} fabricId - Hyperledger Fabric enrollment ID (e.g., 'user1')
   * @returns {Promise<Object|null>} User profile (safe view), or null if not found
   * @returns {string} return.id - User UUID
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {string} return.fabric_enrollment_id - Fabric identity (same as input)
   * @returns {string} return.full_name - Full name
   * @returns {string} [return.phone_number] - Phone number
   * @returns {string} [return.avatar_url] - Profile picture URL
   * @returns {boolean} return.is_active - Account status
   * @returns {boolean} return.email_verified - Email verification status
   * @returns {string} return.created_at - Registration timestamp
   * @returns {string|null} return.last_login_at - Last login timestamp
   * 
   * @throws {Error} 'Database not connected' if Supabase not initialized
   * @throws {Error} 'Failed to find user: <details>' for database errors
   * 
   * @example
   * // After JWT verification
   * const decoded = jwt.verify(token, JWT_SECRET);
   * const user = await dbService.findUserByFabricId(decoded.userId);
   */
  async findUserByFabricId(fabricId) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { data, error } = await this.supabase
      .from('users_safe')
      .select('*')
      .eq('fabric_enrollment_id', fabricId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data;
  }

  /**
   * Update user's last login timestamp
   * @param {string} userId - User UUID
   */
  async updateLastLogin(userId) {
    if (!this.isReady()) {
      return;
    }

    await this.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  }

  /**
   * Update user profile
   * @param {string} userId - User UUID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} - Updated user data
   */
  async updateUserProfile(userId, updates) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    // Sanitize updates - prevent changing critical fields
    const allowedFields = [
      'full_name',
      'phone_number',
      'avatar_url',
      'doctor_specialization',
      'doctor_hospital_affiliation',
      'patient_emergency_contact',
    ];

    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(sanitizedUpdates)
      .eq('id', userId)
      .select('id, email, role, full_name, phone_number, avatar_url')
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all users (admin only)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - List of users (without password hashes)
   */
  async getAllUsers(filters = {}) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    let query = this.supabase
      .from('users_safe')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data;
  }

  /**
   * Log authentication/authorization event for compliance and security monitoring
   * 
   * COMPLIANCE:
   * - HIPAA: Requires audit trail of all PHI access
   * - GDPR: Right to access - users can request audit logs
   * - SOC 2: Demonstrates security controls and monitoring
   * 
   * LOGGED EVENTS:
   * - 'login': User authentication success
   * - 'logout': Session termination
   * - 'register': New account creation
   * - 'password_changed': Password update
   * - 'profile_updated': Profile modifications
   * - 'account_deactivated': Account soft deletion
   * 
   * NON-BLOCKING:
   * - Errors are logged but do NOT throw (prevent auth flow breakage)
   * - Missing metadata is acceptable (graceful degradation)
   * 
   * @param {string} userId - User UUID (database id, not fabric_enrollment_id)
   * @param {string} action - Event type (login, logout, register, password_changed)
   * @param {Object} [metadata={}] - Additional event context
   * @param {string} [metadata.ipAddress] - Client IP address (IPv4/IPv6)
   * @param {string} [metadata.userAgent] - Browser user agent string
   * 
   * @returns {Promise<void>} Resolves when log inserted (errors caught internally)
   * @throws {Error} Never throws - logs error and continues
   * 
   * @example
   * await dbService.logAuditEvent(
   *   user.id,
   *   'login',
   *   {
   *     ipAddress: req.ip,
   *     userAgent: req.headers['user-agent']
   *   }
   * );
   */
  async logAuditEvent(userId, action, metadata = {}) {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.supabase
        .from('user_audit_log')
        .insert({
          user_id: userId,
          action,
          ip_address: metadata.ipAddress || null,
          user_agent: metadata.userAgent || null,
        });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break main flow
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} - True if email exists
   */
  async emailExists(email) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    return !error && data !== null;
  }

  /**
   * Deactivate user account
   * @param {string} userId - User UUID
   */
  async deactivateUser(userId) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { error } = await this.supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  /**
   * Verify doctor (admin action)
   * @param {string} userId - User UUID
   * @param {string} status - Verification status (verified, suspended)
   */
  async verifyDoctor(userId, status) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const { error } = await this.supabase
      .from('users')
      .update({ doctor_verification_status: status })
      .eq('id', userId)
      .eq('role', 'doctor');

    if (error) {
      throw new Error(`Failed to verify doctor: ${error.message}`);
    }
  }
}

// Export singleton instance
const dbService = new DatabaseService();
export default dbService;
