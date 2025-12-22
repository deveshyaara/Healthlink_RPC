import transactionService from '../services/transaction.service.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * HealthcareController
 * Handles HTTP requests for Ethereum healthcare smart contract operations
 */
class HealthcareController {
  /**
   * Create a new patient
   * POST /api/v1/healthcare/patients
   */
  async createPatient(req, res, next) {
    try {
      const { patientAddress, name, age, gender, email } = req.body;

      // Validate required fields
      if (!patientAddress || !name || age === undefined || !gender) {
        return res.status(400).json({
          error: 'Missing required fields: patientAddress, name, age, gender'
        });
      }

      // Parse age to number
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
        return res.status(400).json({ error: 'Age must be a valid number between 0 and 150' });
      }

      // Upload patient metadata to IPFS using Pinata
      const PinataSDK = (await import('@pinata/sdk')).default;
      const pinata = new PinataSDK(
        process.env.PINATA_API_KEY,
        process.env.PINATA_SECRET_API_KEY
      );

      const patientMetadata = {
        email: email || '',
        name,
        age: parsedAge,
        gender,
        walletAddress: patientAddress,
        createdAt: new Date().toISOString(),
      };

      let ipfsHash;
      try {
        const pinataResult = await pinata.pinJSONToIPFS(patientMetadata, {
          pinataMetadata: {
            name: `patient-${email || patientAddress}-${Date.now()}`,
          },
          pinataOptions: {
            cidVersion: 1,
          },
        });
        ipfsHash = pinataResult.IpfsHash;
      } catch (ipfsError) {
        logger.error('Failed to upload patient data to IPFS:', ipfsError);
        return res.status(500).json({ error: 'Failed to upload patient data to IPFS' });
      }

      // Create patient on blockchain
      const result = await transactionService.createPatient(
        patientAddress, name, parsedAge, gender, ipfsHash,
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.data?.id || patientAddress,
          patientAddress,
          name,
          age: parsedAge,
          gender,
          email: email || '',
          ipfsHash,
          createdAt: new Date().toISOString(),
        },
        message: 'Patient created successfully',
      });
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
      const userRole = req.user.role;
      const userWalletAddress = req.user.walletAddress;

      // Check permissions
      if (userRole === 'patient' && userWalletAddress !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Patients can only access their own data',
            statusCode: 403,
          },
        });
      }

      // Doctors and admins can access any patient data (with consent checks for doctors to be implemented later)

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
        recordId, patientId, doctorId, recordType, ipfsHash, metadata || '',
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
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

      // First get the record to check ownership
      const record = await transactionService.getMedicalRecord(recordId);

      if (!record.data || !record.data.exists) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Medical record not found',
            statusCode: 404,
          },
        });
      }

      // Check permissions
      if (userRole === 'patient' && record.data.patientId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Patients can only access their own records',
            statusCode: 403,
          },
        });
      }

      // Doctors need consent to access patient records (to be implemented)
      // Admins can access any records

      res.status(200).json(record);
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
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

      // Check permissions
      if (userRole === 'patient' && userId !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Patients can only access their own records',
            statusCode: 403,
          },
        });
      }

      // Doctors need consent to access patient records
      if (userRole === 'doctor') {
        const consents = await transactionService.getConsentsByPatient(patientId);
        const hasConsent = consents.data.some((consent) =>
          consent.granteeAddress === userId && // doctor's wallet address
          consent.status === 0 && // active status
          consent.validUntil > Math.floor(Date.now() / 1000), // not expired
        );

        if (!hasConsent) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'PermissionError',
              message: 'Access denied: Patient consent required to view records',
              statusCode: 403,
            },
          });
        }
      }

      // Admins can access any records

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
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

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

      logger.info(`Fetching records for user: ${userId} with role: ${userRole}`);

      let records = [];

      if (userRole === 'patient') {
        // Patients can only see their own records
        const result = await transactionService.getRecordsByPatient(userId);
        records = result?.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see records of patients who have granted consent
        // For now, return empty array - will implement consent checking later
        records = [];
      } else if (userRole === 'admin') {
        // Admins can see all records (for audit purposes)
        // This would need a different method to get all records
        records = [];
      } else {
        return res.status(403).json({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Invalid user role for accessing medical records',
            statusCode: 403,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: records,
        count: Array.isArray(records) ? records.length : 0,
      });
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
        consentId, patientId, doctorAddress, validityDays,
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
      const { appointmentId, patientId, doctorAddress, doctorId, timestamp, reason = '', notes = '' } = req.body;
      const docAddr = doctorAddress || doctorId || '';

      const result = await transactionService.createAppointment(
        appointmentId, patientId, docAddr, timestamp, reason || '', notes || '',
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific appointment
   * GET /api/appointments/:appointmentId
   */
  async getAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await transactionService.getAppointment(appointmentId);

      if (!result || !result.data) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific prescription
   * GET /api/prescriptions/:prescriptionId
   */
  async getPrescription(req, res, next) {
    try {
      const { prescriptionId } = req.params;

      const result = await transactionService.getPrescription(prescriptionId);

      if (!result || !result.data) {
        return res.status(404).json({ success: false, error: 'Prescription not found' });
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a prescription
   * PUT /api/prescriptions/:prescriptionId
   */
  async updatePrescription(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const updateData = req.body || {};

      const result = await transactionService.updatePrescription(prescriptionId, updateData);

      res.status(200).json(result);
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
      const user = req.user || {};
      const {
        prescriptionId = uuidv4(),
        patientId,
        doctorAddress,
        doctorId,
        medication,
        medications,
        dosage = '',
        instructions = '',
        expiryTimestamp = 0,
      } = req.body;

      const docAddr = doctorAddress || doctorId || user.id || user.userId || '';

      // Normalize medication input: prefer explicit `medication`, then `medications` array
      let med = medication || '';
      if (!med && Array.isArray(medications) && medications.length > 0) {
        med = typeof medications[0] === 'string' ? medications[0] : JSON.stringify(medications[0]);
      } else if (Array.isArray(medications)) {
        med = medications.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join('|');
      }

      logger.info('createPrescription payload', {
        prescriptionId,
        patientId,
        doctorAddress: docAddr,
        medicationType: typeof med,
        medicationSample: (typeof med === 'string' ? med.slice(0, 200) : JSON.stringify(med)),
        dosage,
        instructions,
        expiryTimestamp,
      });

      const result = await transactionService.createPrescription(
        prescriptionId, patientId, docAddr, med, dosage, instructions, expiryTimestamp,
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
        doctorAddress, name, specialization, licenseNumber, hospitalAffiliation,
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
        parseInt(limit) || 10,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Appointment handlers are defined later with full implementations

  /**
   * Update appointment
   * PUT /api/appointments/:appointmentId
   */
  async updateAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const updateData = req.body;
      // Return success for now - implement with smart contract call
      res.status(200).json({ success: true, appointmentId, ...updateData });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel appointment
   * POST /api/appointments/:appointmentId/cancel
   */
  async cancelAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      // Return success for now - implement with smart contract call
      res.status(200).json({ success: true, appointmentId, status: 'cancelled' });
    } catch (error) {
      next(error);
    }
  }

  // Prescription handlers are defined later with full implementations

  /**
   * Get current user consents
   * GET /api/consents
   */
  async getCurrentUserConsents(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching consents for user: ${userId} with role: ${userRole}`);

      let consents = [];

      if (userRole === 'patient') {
        // Patients can see consents they've granted
        const result = await transactionService.getConsentsByPatient(userId);
        consents = result.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see consents granted to them
        // Note: We need to implement getConsentsByGrantee in the service
        consents = [];
      }

      res.status(200).json({
        success: true,
        data: consents,
        count: consents.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific consent
   * GET /api/consents/:consentId
   */
  async getConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      res.status(200).json({ consentId, status: 'active' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke consent
   * PATCH /api/consents/:consentId/revoke
   */
  async revokeConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      res.status(200).json({ success: true, consentId, status: 'revoked' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's prescriptions (for doctors: prescriptions they've issued)
   * GET /api/prescriptions
   */
  async getCurrentUserPrescriptions(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching prescriptions for user: ${userId} with role: ${userRole}`);

      let prescriptions = [];

      if (userRole === 'patient') {
        // Patients can see prescriptions issued to them
        const result = await transactionService.getPrescriptionsByPatient(userId);
        prescriptions = result.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see prescriptions they've issued
        const result = await transactionService.getPrescriptionsByDoctor(userId);
        prescriptions = result.data || [];
      } else if (userRole === 'admin') {
        // Admins can see all prescriptions (implementation needed)
        prescriptions = [];
      }

      res.status(200).json({
        success: true,
        data: prescriptions,
        count: prescriptions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's appointments (for doctors: appointments they've scheduled)
   * GET /api/appointments
   */
  async getCurrentUserAppointments(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const userRole = req.user.role;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching appointments for user: ${userId} with role: ${userRole}`);

      let appointments = [];

      if (userRole === 'patient') {
        // Patients can see their appointments
        const result = await transactionService.getAppointmentsByPatient(userId);
        appointments = result.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see appointments they've scheduled
        const result = await transactionService.getAppointmentsByDoctor(userId);
        appointments = result.data || [];
      } else if (userRole === 'admin') {
        // Admins can see all appointments (implementation needed)
        appointments = [];
      }

      res.status(200).json({
        success: true,
        data: appointments,
        count: appointments.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new HealthcareController();
