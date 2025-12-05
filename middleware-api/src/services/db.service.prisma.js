/**
 * Database Service - Prisma ORM Integration (v2.0)
 * 
 * PURPOSE: Type-safe database operations with automatic schema management
 * MIGRATION: Replaced raw Supabase client calls with Prisma Client
 * 
 * ARCHITECTURE:
 * - Prisma Client: Auto-generated type-safe database client
 * - Connection Pooling: Built-in connection management
 * - Type Safety: Full TypeScript/JSDoc type inference
 * 
 * WHY PRISMA OVER RAW SQL:
 * - Type Safety: Catch errors at compile-time, not runtime
 * - Schema Migrations: Version-controlled database changes
 * - Query Builder: Intuitive API vs writing raw SQL
 * - Performance: Optimized queries with automatic batching
 * - Developer Experience: Auto-completion, documentation
 * 
 * CONSTRAINT: ONLY for user authentication data - medical records on Fabric blockchain
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

/**
 * Prisma Client Singleton with connection management
 * 
 * WHY SINGLETON:
 * - Prevents connection pool exhaustion (reuses same client)
 * - Recommended by Prisma best practices
 * - Ensures graceful shutdown handling
 * 
 * CONNECTION LIFECYCLE:
 * 1. Lazy initialization (connects on first query)
 * 2. Reuses connection for all queries
 * 3. Graceful disconnect on app shutdown
 */
class DatabaseService {
  constructor() {
    this.prisma = null;
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize Prisma Client with connection pooling
   * 
   * PRISMA ADVANTAGES:
   * - Automatic connection pooling (default: 10 connections)
   * - Query batching (combines multiple queries)
   * - Connection retry logic (handles transient failures)
   * - Prepared statements (prevents SQL injection)
   * 
   * ENV VARIABLES REQUIRED:
   * - DATABASE_URL: PostgreSQL connection string
   *   Format: postgresql://user:password@host:port/database
   *   Supabase: Use transaction pooler (port 6543) for production
   * 
   * @returns {Promise<boolean>} True if connected, false if DATABASE_URL missing
   * @throws {Error} Never throws - logs errors and returns false for graceful degradation
   * 
   * @example
   * const connected = await dbService.initialize();
   * if (connected) {
   *   console.log('✅ Prisma Client ready');
   * } else {
   *   console.log('⚠️ Falling back to file storage');
   * }
   */
  async initialize() {
    try {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        console.warn('⚠️  DATABASE_URL not configured - running in legacy mode');
        console.warn('   Set DATABASE_URL in .env to enable Prisma database access');
        this.isConnected = false;
        return false;
      }

      // Initialize Prisma Client with PostgreSQL adapter (Prisma 7 requirement)
      // Create connection pool
      this.pool = new pg.Pool({ connectionString: databaseUrl });
      const adapter = new PrismaPg(this.pool);
      
      this.prisma = new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error'] 
          : ['error'], // Detailed logs in dev, errors only in prod
      });

      // Test connection with simple query
      await this.prisma.$queryRaw`SELECT 1`;

      this.isConnected = true;
      console.log('✅ Prisma Client connected to PostgreSQL successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Prisma Client:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if Prisma Client is ready for queries
   * 
   * WHY CHECK BOTH FLAGS:
   * - isConnected: Set after successful connection test
   * - prisma !== null: Ensures client object initialized
   * 
   * USED BY: All database methods before executing queries
   * 
   * @returns {boolean} True if connected and ready, false otherwise
   */
  isReady() {
    return this.isConnected && this.prisma !== null;
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
   * @param {string} password - Plain text password to verify
   * @param {string} hash - Stored bcrypt hash from database
   * @returns {Promise<boolean>} True if password matches, false otherwise
   * 
   * @example
   * const isValid = await dbService.verifyPassword('UserPassword123', user.passwordHash);
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create new user record in PostgreSQL database using Prisma
   * 
   * PRISMA TYPE SAFETY:
   * - Auto-completion for all fields
   * - Compile-time validation of field names and types
   * - Automatic handling of relations
   * 
   * ROLE-SPECIFIC FIELDS:
   * - Doctor: licenseNumber, specialization, hospitalAffiliation, verificationStatus
   * - Patient: dateOfBirth, bloodGroup, emergencyContact
   * - Admin/Government: No extra fields required
   * 
   * WHY fabricEnrollmentId:
   * - Links Prisma user record → Hyperledger Fabric identity
   * - Must be unique (enforced by DB constraint + Prisma)
   * - Created during wallet enrollment (before this call)
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
   * @returns {Promise<Object>} Created user object (without passwordHash)
   * @returns {string} return.id - UUID generated by database
   * @returns {string} return.email - User email
   * @returns {string} return.role - User role
   * @returns {string} return.fabricEnrollmentId - Fabric identity link
   * @returns {string} return.fullName - Full name
   * @returns {Date} return.createdAt - Timestamp of creation
   * 
   * @throws {Prisma.PrismaClientKnownRequestError} P2002: Unique constraint violation (email/fabricId exists)
   * @throws {Error} 'Database not connected' if Prisma not initialized
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

    // Map role string to Prisma enum
    const prismaRole = role.toUpperCase();

    try {
      // Create user with Prisma (type-safe!)
      const user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: prismaRole,
          fabricEnrollmentId,
          fullName,
          phoneNumber: phoneNumber || null,
          // Doctor fields
          doctorLicenseNumber: doctorLicenseNumber || null,
          doctorSpecialization: doctorSpecialization || null,
          doctorHospitalAffiliation: doctorHospitalAffiliation || null,
          doctorVerificationStatus: role === 'doctor' ? 'PENDING' : null,
          // Patient fields
          patientDateOfBirth: patientDateOfBirth ? new Date(patientDateOfBirth) : null,
          patientBloodGroup: patientBloodGroup || null,
          patientEmergencyContact: patientEmergencyContact || null,
        },
        select: {
          id: true,
          email: true,
          role: true,
          fabricEnrollmentId: true,
          fullName: true,
          createdAt: true,
          // Exclude passwordHash for security
        },
      });

      return user;
    } catch (error) {
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          const field = error.meta?.target?.[0] || 'email';
          throw new Error(`User with this ${field} already exists`);
        }
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by email address (used for login authentication)
   * 
   * PRISMA QUERY FEATURES:
   * - Type-safe field selection
   * - Automatic case-insensitive email search
   * - Include/exclude fields easily
   * 
   * SECURITY CONSIDERATIONS:
   * - Returns FULL user object including passwordHash (for verification)
   * - Email lookup is case-insensitive (normalized to lowercase)
   * - Only returns active users (isActive = true)
   * - Do NOT expose passwordHash to frontend/logs
   * 
   * @param {string} email - User email address (case-insensitive)
   * @returns {Promise<Object|null>} User object with passwordHash, or null if not found
   * 
   * @example
   * const user = await dbService.findUserByEmail('doctor@hospital.com');
   * if (user) {
   *   const isValid = await dbService.verifyPassword(password, user.passwordHash);
   * }
   */
  async findUserByEmail(email) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    return user;
  }

  /**
   * Find user by database UUID (internal ID)
   * 
   * PRISMA FEATURES:
   * - Automatic type coercion (string UUID → database UUID type)
   * - Optional field selection (exclude sensitive data)
   * 
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>} User profile (without passwordHash), or null if not found
   */
  async findUserById(userId) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fabricEnrollmentId: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        // Exclude passwordHash
      },
    });

    return user;
  }

  /**
   * Find user by Hyperledger Fabric enrollment ID
   * 
   * WHY THIS METHOD EXISTS:
   * - JWT tokens contain userId (Fabric enrollment ID, not database UUID)
   * - Bridges authentication layer → blockchain identity
   * - Used by /api/auth/me endpoint after JWT verification
   * 
   * PRISMA UNIQUE CONSTRAINT:
   * - fabricEnrollmentId has unique index
   * - Prisma automatically uses efficient index lookup
   * 
   * @param {string} fabricId - Hyperledger Fabric enrollment ID (e.g., 'user1')
   * @returns {Promise<Object|null>} User profile (safe view), or null if not found
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

    const user = await this.prisma.user.findUnique({
      where: { fabricEnrollmentId: fabricId },
      select: {
        id: true,
        email: true,
        role: true,
        fabricEnrollmentId: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        doctorLicenseNumber: true,
        doctorSpecialization: true,
        doctorHospitalAffiliation: true,
        doctorVerificationStatus: true,
        patientDateOfBirth: true,
        patientBloodGroup: true,
        patientEmergencyContact: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        // Exclude passwordHash
      },
    });

    return user;
  }

  /**
   * Update user's last login timestamp
   * 
   * PRISMA UPDATE:
   * - Atomic operation (no race conditions)
   * - Only updates specified fields
   * - updatedAt automatically updated by Prisma
   * 
   * @param {string} userId - User UUID (database id, not fabricEnrollmentId)
   * @returns {Promise<void>} Resolves when update completes
   */
  async updateLastLogin(userId) {
    if (!this.isReady()) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Update user profile fields
   * 
   * PRISMA PARTIAL UPDATES:
   * - Only updates provided fields
   * - Undefined fields are ignored
   * - Type-safe field names
   * 
   * @param {string} userId - User UUID
   * @param {Object} updates - Profile updates (only allowed fields)
   * @returns {Promise<Object>} Updated user data
   */
  async updateUserProfile(userId, updates) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    // Sanitize updates - prevent changing critical fields
    const allowedFields = [
      'fullName',
      'phoneNumber',
      'avatarUrl',
      'doctorSpecialization',
      'doctorHospitalAffiliation',
      'patientEmergencyContact',
    ];

    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: sanitizedUpdates,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
      },
    });

    return user;
  }

  /**
   * Get all users with optional filtering (admin only)
   * 
   * PRISMA QUERY FEATURES:
   * - Flexible filtering (where clause)
   * - Pagination support (skip, take)
   * - Sorting (orderBy)
   * - Type-safe field selection
   * 
   * @param {Object} [filters={}] - Optional filters
   * @param {string} [filters.role] - Filter by role
   * @param {boolean} [filters.isActive] - Filter by active status
   * @returns {Promise<Array>} List of users (without password hashes)
   */
  async getAllUsers(filters = {}) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const where = {};
    if (filters.role) {
      where.role = filters.role.toUpperCase();
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        fabricEnrollmentId: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        // Exclude passwordHash
      },
    });

    return users;
  }

  /**
   * Log authentication event for compliance and security monitoring
   * 
   * PRISMA NESTED CREATE:
   * - Creates audit log with automatic userId relation
   * - Type-safe field names
   * - Handles foreign key constraints automatically
   * 
   * COMPLIANCE:
   * - HIPAA: Requires audit trail of all PHI access
   * - GDPR: Right to access - users can request audit logs
   * - SOC 2: Demonstrates security controls and monitoring
   * 
   * NON-BLOCKING:
   * - Errors are logged but do NOT throw (prevent auth flow breakage)
   * 
   * @param {string} userId - User UUID (database id)
   * @param {string} action - Event type (login, logout, register, password_changed)
   * @param {Object} [metadata={}] - Additional event context
   * @returns {Promise<void>} Resolves when log inserted (errors caught internally)
   * 
   * @example
   * await dbService.logAuditEvent(user.id, 'login', {
   *   ipAddress: req.ip,
   *   userAgent: req.headers['user-agent']
   * });
   */
  async logAuditEvent(userId, action, metadata = {}) {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.prisma.userAuditLog.create({
        data: {
          userId,
          action,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break main flow
    }
  }

  /**
   * Check if email exists in database
   * 
   * PRISMA OPTIMIZATION:
   * - Uses count() instead of findUnique (more efficient)
   * - Only queries database, doesn't fetch data
   * 
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });

    return count > 0;
  }

  /**
   * Deactivate user account (soft delete)
   * 
   * PRISMA SOFT DELETE:
   * - Sets isActive to false (preserves data)
   * - Can be reversed (unlike hard delete)
   * - Maintains referential integrity
   * 
   * @param {string} userId - User UUID
   * @returns {Promise<void>} Resolves when user deactivated
   */
  async deactivateUser(userId) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * Update doctor verification status (admin action)
   * 
   * PRISMA ENUM VALIDATION:
   * - Status must be valid enum value (PENDING, VERIFIED, SUSPENDED)
   * - Type-safe at compile time
   * 
   * @param {string} userId - User UUID
   * @param {string} status - Verification status (verified, suspended, pending)
   * @returns {Promise<void>} Resolves when status updated
   */
  async verifyDoctor(userId, status) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    await this.prisma.user.update({
      where: {
        id: userId,
        role: 'DOCTOR',
      },
      data: {
        doctorVerificationStatus: status.toUpperCase(),
      },
    });
  }

  /**
   * Disconnect Prisma Client gracefully
   * 
   * WHY IMPORTANT:
   * - Closes database connections properly
   * - Prevents "connection pool exhausted" errors
   * - Required for clean app shutdown
   * 
   * WHEN TO CALL:
   * - Application shutdown
   * - Process termination (SIGINT, SIGTERM)
   * - Test cleanup (afterAll)
   * 
   * @returns {Promise<void>} Resolves when disconnected
   * 
   * @example
   * // In server shutdown handler
   * process.on('SIGTERM', async () => {
   *   await dbService.disconnect();
   *   process.exit(0);
   * });
   */
  async disconnect() {
    if (this.prisma && this.isConnected) {
      try {
        await this.prisma.$disconnect();
        if (this.pool) {
          await this.pool.end();
          this.pool = null;
        }
        this.isConnected = false;
        this.prisma = null;
        console.log('✅ Prisma Client disconnected successfully');
      } catch (error) {
        console.error('❌ Error disconnecting Prisma Client:', error);
      }
    }
  }
}

// Export singleton instance
const dbService = new DatabaseService();
export default dbService;
