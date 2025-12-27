/**
 * Admin Controller
 * Handles admin dashboard statistics and user management
 */

import dbService from '../services/db.service.prisma.js';
import logger from '../utils/logger.js';

function getPrismaClient() {
  if (dbService && dbService.isReady && dbService.isReady()) {
    return dbService.prisma;
  }
  throw new Error('Database not connected. Check DATABASE_URL configuration.');
}

class AdminController {
  /**
     * Get dashboard statistics
     * GET /api/v1/admin/stats
     */
  async getStats(req, res, next) {
    try {
      const db = getPrismaClient();

      // Count users by role
      const [totalUsers, totalDoctors, totalPatients, totalRecords, totalAppointments] = await Promise.all([
        db.user?.count() || 0,
        db.user?.count({ where: { role: 'doctor' } }) || 0,
        db.patientWalletMapping?.count() || 0,
        db.medicalRecord?.count() || 0,
        db.appointment?.count() || 0,
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalDoctors,
          totalPatients,
          totalRecords,
          totalAppointments,
          activeRecords: totalRecords, // Alias for compatibility
        },
      });
    } catch (error) {
      logger.error('Failed to fetch admin stats:', error);
      next(error);
    }
  }

  /**
     * Get all users
     * GET /api/users
     */
  async getUsers(req, res, next) {
    try {
      const db = getPrismaClient();

      const users = await db.user?.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          phoneNumber: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      // Map to frontend format
      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.fullName,
        phone: user.phoneNumber,
        isActive: user.isActive,
        isVerified: user.emailVerified,
        flagged: false, // TODO: Add flagged column to users table
        createdAt: user.createdAt,
        lastLogin: user.lastLoginAt,
      }));

      res.json({
        success: true,
        data: formattedUsers,
      });
    } catch (error) {
      logger.error('Failed to fetch users:', error);
      next(error);
    }
  }

  /**
     * Get all doctors
     * GET /api/v1/admin/users/doctors
     */
  async getDoctors(req, res, next) {
    try {
      const db = getPrismaClient();

      const doctors = await db.user?.findMany({
        where: { role: 'doctor' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          doctorLicenseNumber: true,
          doctorSpecialization: true,
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      logger.error('Failed to fetch doctors:', error);
      next(error);
    }
  }

  /**
     * Get all patients
     * GET /api/v1/admin/users/patients
     */
  async getPatients(req, res, next) {
    try {
      const db = getPrismaClient();

      const patients = await db.patientWalletMapping?.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      // Map to frontend format
      const formattedPatients = patients.map(patient => ({
        id: patient.id,
        email: patient.email,
        name: patient.name,
        walletAddress: patient.walletAddress,
        userId: patient.userId,
        isActive: patient.user?.isActive || false,
        createdAt: patient.createdAt,
      }));

      res.json({
        success: true,
        data: formattedPatients,
      });
    } catch (error) {
      logger.error('Failed to fetch patients:', error);
      next(error);
    }
  }

  /**
     * Get pending doctor verifications
     * GET /api/v1/admin/users/pending
     */
  async getPendingVerifications(req, res, next) {
    try {
      const db = getPrismaClient();

      const pending = await db.user?.findMany({
        where: {
          role: 'doctor',
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          createdAt: true,
          doctorLicenseNumber: true,
          doctorSpecialization: true,
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: pending,
      });
    } catch (error) {
      logger.error('Failed to fetch pending verifications:', error);
      next(error);
    }
  }

  /**
     * Get health status
     * GET /api/health
     */
  async getHealth(req, res) {
    try {
      const db = getPrismaClient();

      // Check database connection
      await db.$queryRaw`SELECT 1`;

      res.json({
        success: true,
        status: 'UP',
        online: true,
        blockchainSync: 'N/A', // Not using blockchain for admin data
        database: 'UP',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        status: 'DOWN',
        online: false,
        error: error.message,
      });
    }
  }
}

export default new AdminController();
