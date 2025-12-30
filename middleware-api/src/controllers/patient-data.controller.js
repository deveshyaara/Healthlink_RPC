/**
 * Patient Data Controller
 * Handles database queries for patient-specific data
 * Routes patient data requests to Supabase instead of blockchain
 */

import dbService from '../services/db.service.prisma.js';
import logger from '../utils/logger.js';

function getPrismaClient() {
  if (dbService && dbService.isReady && dbService.isReady()) {
    return dbService.prisma;
  }
  throw new Error('Database not connected. Check DATABASE_URL configuration.');
}

class PatientDataController {
  /**
     * Get all consent requests for current patient
     * GET /api/consents
     */
  async getConsents(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      const db = getPrismaClient();

      // Find patient record linked to this user
      const patient = await db.patientWalletMapping?.findFirst({
        where: { userId: userId },
      });

      if (!patient) {
        // No patient record found - return empty array (not an error)
        return res.json({
          success: true,
          data: [],
          count: 0,
        });
      }

      // Query consent requests for this patient
      const consents = await db.consentRequest?.findMany({
        where: { patientId: patient.id },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: consents,
        count: consents.length,
      });
    } catch (error) {
      logger.error('Failed to fetch consents:', error);
      next(error);
    }
  }

  /**
     * Get all medical records for current patient
     * GET /api/medical-records
     */
  async getMedicalRecords(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      const db = getPrismaClient();

      // Find patient record linked to this user
      const patient = await db.patientWalletMapping?.findFirst({
        where: { userId: userId },
      });

      if (!patient) {
        return res.json({
          success: true,
          data: [],
          records: [],
          count: 0,
        });
      }

      // Query medical records for this patient
      const records = await db.medicalRecord?.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: records,
        records: records, // Alias for compatibility
        count: records.length,
      });
    } catch (error) {
      logger.error('Failed to fetch medical records:', error);
      next(error);
    }
  }

  /**
     * Get all appointments for current patient
     * GET /api/appointments
     */
  async getAppointments(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      const db = getPrismaClient();

      // Find patient record linked to this user
      const patient = await db.patientWalletMapping?.findFirst({
        where: { userId: userId },
      });

      if (!patient) {
        return res.json({
          success: true,
          data: [],
          appointments: [],
          count: 0,
        });
      }

      // Query appointments for this patient
      const appointments = await db.appointment?.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      }) || [];

      // Flatten response for easier frontend consumption
      const flattenedAppointments = appointments.map(apt => ({
        ...apt,
        doctorName: apt.doctor?.fullName || apt.doctor?.name || 'Unknown Doctor',
        doctorEmail: apt.doctor?.email || '',
      }));

      res.json({
        success: true,
        data: flattenedAppointments,
        appointments: flattenedAppointments, // Alias for compatibility
        count: flattenedAppointments.length,
      });
    } catch (error) {
      logger.error('Failed to fetch appointments:', error);
      next(error);
    }
  }

  /**
     * Get all prescriptions for current patient
     * GET /api/prescriptions
     */
  async getPrescriptions(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      const db = getPrismaClient();

      // Find patient record linked to this user
      const patient = await db.patientWalletMapping?.findFirst({
        where: { userId: userId },
      });

      if (!patient) {
        return res.json({
          success: true,
          data: [],
          prescriptions: [],
          count: 0,
        });
      }

      // Query prescriptions for this patient
      const prescriptions = await db.prescription?.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: prescriptions,
        prescriptions: prescriptions, // Alias for compatibility
        count: prescriptions.length,
      });
    } catch (error) {
      logger.error('Failed to fetch prescriptions:', error);
      next(error);
    }
  }

  /**
     * Get all lab tests for current patient
     * GET /api/lab-tests
     */
  async getLabTests(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      const db = getPrismaClient();

      // Find patient record linked to this user
      const patient = await db.patientWalletMapping?.findFirst({
        where: { userId: userId },
      });

      if (!patient) {
        return res.json({
          success: true,
          data: [],
          labTests: [],
          count: 0,
        });
      }

      // Query lab tests for this patient
      const labTests = await db.labTest?.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) || [];

      res.json({
        success: true,
        data: labTests,
        labTests: labTests, // Alias for compatibility
        count: labTests.length,
      });
    } catch (error) {
      logger.error('Failed to fetch lab tests:', error);
      next(error);
    }
  }
}

export default new PatientDataController();
