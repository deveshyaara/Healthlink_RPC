import transactionService from '../services/transaction.service.js';
import logger from '../utils/logger.js';

/**
 * HealthcareController
 * Handles HTTP requests for Ethereum healthcare smart contract operations
 */
class HealthcareController {
  /**
   * Create a new patient
   * POST /api/v1/patients
   */
  async createPatient(req, res, next) {
    try {
      const { patientId, name, age, bloodType, allergies } = req.body;

      const result = await transactionService.createPatient(
        patientId, name, age, bloodType, allergies || ''
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient information
   * GET /api/v1/patients/:patientId
   */
  async getPatient(req, res, next) {
    try {
      const { patientId } = req.params;

      const result = await transactionService.getPatient(patientId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a medical record
   * POST /api/v1/records
   */
  async createMedicalRecord(req, res, next) {
    try {
      const { recordId, patientId, doctorId, recordType, ipfsHash, metadata } = req.body;

      const result = await transactionService.createMedicalRecord(
        recordId, patientId, doctorId, recordType, ipfsHash, metadata || ''
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a medical record
   * GET /api/v1/records/:recordId
   */
  async getMedicalRecord(req, res, next) {
    try {
      const { recordId } = req.params;

      const result = await transactionService.getMedicalRecord(recordId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all records for a patient
   * GET /api/v1/patients/:patientId/records
   * GET /api/medical-records/patient/:patientId
   */
  async getRecordsByPatient(req, res, next) {
    try {
      const { patientId } = req.params;

      const result = await transactionService.getRecordsByPatient(patientId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all records for current authenticated user
   * GET /api/medical-records
   */
  async getCurrentUserRecords(req, res, next) {
    try {
      // Extract userId from authenticated user (JWT userId is fabric_enrollment_id)
      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'User ID not found in authentication token',
            statusCode: 400,
          },
        });
      }

      logger.info(`Fetching records for user: ${userId}`);
      const result = await transactionService.getRecordsByPatient(userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('getCurrentUserRecords error:', error);
      next(error);
    }
  }

  /**
   * Create consent for data access
   * POST /api/v1/consents
   */
  async createConsent(req, res, next) {
    try {
      const { consentId, patientId, doctorAddress, validityDays } = req.body;

      const result = await transactionService.createConsent(
        consentId, patientId, doctorAddress, validityDays
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create an appointment
   * POST /api/v1/appointments
   */
  async createAppointment(req, res, next) {
    try {
      const { appointmentId, patientId, doctorAddress, timestamp, notes } = req.body;

      const result = await transactionService.createAppointment(
        appointmentId, patientId, doctorAddress, timestamp, notes || ''
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a prescription
   * POST /api/v1/prescriptions
   */
  async createPrescription(req, res, next) {
    try {
      const { prescriptionId, patientId, doctorAddress, medication, dosage, expiryTimestamp } = req.body;

      const result = await transactionService.createPrescription(
        prescriptionId, patientId, doctorAddress, medication, dosage, expiryTimestamp
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register a doctor
   * POST /api/v1/doctors
   */
  async registerDoctor(req, res, next) {
    try {
      const { doctorAddress, name, specialization, licenseNumber, hospitalAffiliation } = req.body;

      const result = await transactionService.registerDoctor(
        doctorAddress, name, specialization, licenseNumber, hospitalAffiliation
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a doctor
   * POST /api/v1/doctors/:doctorAddress/verify
   */
  async verifyDoctor(req, res, next) {
    try {
      const { doctorAddress } = req.params;

      const result = await transactionService.verifyDoctor(doctorAddress);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get verified doctors
   * GET /api/v1/doctors/verified
   */
  async getVerifiedDoctors(req, res, next) {
    try {
      const result = await transactionService.getVerifiedDoctors();

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit records
   * GET /api/v1/audit
   */
  async getAuditRecords(req, res, next) {
    try {
      const { limit } = req.query;

      const result = await transactionService.getAuditRecords(
        parseInt(limit) || 10
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new HealthcareController();
