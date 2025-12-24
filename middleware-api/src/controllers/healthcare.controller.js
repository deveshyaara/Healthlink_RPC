import transactionService from '../services/transaction.service.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import dbService from '../services/db.service.prisma.js';

// In-memory fallback for environments without Prisma/Supabase available
const _inMemory = {
  patientWalletMapping: new Map(),
  async findUniqueByEmail(email) {
    for (const v of this.patientWalletMapping.values()) {
      if (v.email === email) {return v;}
    }
    return null;
  },
  async createPatient(data) {
    const id = uuidv4();
    const record = { id, ...data, createdAt: new Date().toISOString(), isActive: true };
    this.patientWalletMapping.set(id, record);
    return record;
  },
  async findManyByDoctor(doctorId) {
    const results = [];
    for (const v of this.patientWalletMapping.values()) {
      if (v.createdBy === doctorId && v.isActive) {results.push(v);}
    }
    return results;
  },
};

function getPrismaClient() {
  if (dbService && dbService.isReady && dbService.isReady()) {
    return dbService.prisma;
  }
  return _inMemory;
}

// Helper to resolve the patient mapping model across possible prisma client naming
function resolvePatientModel(db) {
  if (!db) return null;
  return db.patientWalletMapping || db.PatientWalletMapping || db.patient || db.patientWalletMappings || null;
}

/**
 * HealthcareController
 * Handles HTTP requests for Ethereum healthcare smart contract operations
 */
class HealthcareController {
  // Resolve patient id by email (supports Prisma client or in-memory fallback)
  async resolvePatientId(email) {
    if (!email) return null;
    const db = getPrismaClient();
    const patientsModel = resolvePatientModel(db);
    const patient = patientsModel && typeof patientsModel.findUnique === 'function'
      ? await patientsModel.findUnique({ where: { email } })
      : await db.findUniqueByEmail?.(email);

    return patient ? patient.id : null;
  }

  /**
   * Create a new patient
   * POST /api/v1/healthcare/patients
   */
  async createPatient(req, res, next) {
    try {
      const { name, email, walletAddress } = req.body;
      const doctorId = req.user?.id || req.user?.userId;

      if (!doctorId) {
        return res.status(503).json({
          error: 'Unable to determine creating doctor id. Authentication/user service may be unavailable. Try again later.',
        });
      }

      // Validate required fields - only name and email are required initially
      if (!name || !email) {
        return res.status(400).json({
          error: 'Missing required fields: name, email',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if patient already exists (supports Prisma or in-memory fallback)
      const db = getPrismaClient();
      let existingPatient = null;
      const patientsModel = resolvePatientModel(db);
      if (patientsModel && typeof patientsModel.findUnique === 'function') {
        existingPatient = await patientsModel.findUnique({ where: { email } });
      } else if (typeof db.findUniqueByEmail === 'function') {
        existingPatient = await db.findUniqueByEmail(email);
      }

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          error: 'Patient with this email already exists',
          existing: {
            id: existingPatient.id,
            email: existingPatient.email,
            name: existingPatient.name,
            walletAddress: existingPatient.walletAddress,
          },
        });
      }

      // Generate wallet address if not provided
      let patientWalletAddress = walletAddress;
      if (!patientWalletAddress) {
        // Generate a deterministic wallet address based on email
        // In production, this would be replaced with proper wallet generation
        const crypto = await import('crypto');
        const hash = crypto.default.createHash('sha256').update(email).digest('hex');
        patientWalletAddress = '0x' + hash.substring(0, 40);
      }

      // Create patient wallet mapping in database
      // Create patient mapping (Prisma or in-memory)
      let patientMapping;
      if (patientsModel && typeof patientsModel.create === 'function') {
        patientMapping = await patientsModel.create({
          data: {
            email,
            name,
            walletAddress: patientWalletAddress,
            createdBy: doctorId,
          },
        });
      } else if (typeof db.createPatient === 'function') {
        patientMapping = await db.createPatient({
          email,
          name,
          walletAddress: patientWalletAddress,
          createdBy: doctorId,
        });
      } else {
        throw new Error('No database backend available to create patient mapping');
      }

      // Upload patient metadata to IPFS using Pinata (initial minimal data)
      const PinataSDK = (await import('@pinata/sdk')).default;
      const pinata = new PinataSDK(
        process.env.PINATA_API_KEY,
        process.env.PINATA_SECRET_API_KEY,
      );

      const patientMetadata = {
        email,
        name,
        walletAddress: patientWalletAddress,
        createdAt: new Date().toISOString(),
        // Additional details will be added later when appointments/prescriptions are created
      };

      let ipfsHash;
      try {
        const pinataResult = await pinata.pinJSONToIPFS(patientMetadata, {
          pinataMetadata: {
            name: `patient-${email}-${Date.now()}`,
          },
          pinataOptions: {
            cidVersion: 1,
          },
        });
        ipfsHash = pinataResult.IpfsHash;
      } catch (ipfsError) {
        logger.error('Failed to upload patient data to IPFS:', ipfsError);
        // Don't fail the request if IPFS upload fails, but log it
        ipfsHash = null;
      }

      // Create patient on blockchain with minimal data (if IPFS succeeded)
      let blockchainResult = null;
      if (ipfsHash) {
        try {
          blockchainResult = await transactionService.createPatient(
            patientWalletAddress, name, 0, '', ipfsHash, // age=0, gender='' as placeholders
          );
        } catch (blockchainError) {
          logger.error('Failed to create patient on blockchain:', blockchainError);
          // Continue with database creation even if blockchain fails
        }
      }

      res.status(201).json({
        success: true,
        id: patientMapping.id,
        email: patientMapping.email,
        name: patientMapping.name,
        walletAddress: patientMapping.walletAddress,
        ipfsHash,
        blockchainCreated: !!blockchainResult,
        createdAt: patientMapping.createdAt,
        message: 'Patient created successfully with minimal information. Additional details can be added when creating appointments or prescriptions.',
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;

      // Check permissions - allow patient to access their own data by id or walletAddress
      if (userRole === 'patient' && userIdentifier !== patientId && req.user.walletAddress !== patientId) {
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
   * Get all patients for a doctor
   * GET /api/v1/healthcare/patients
   */
  async getPatientsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access patient lists',
        });
      }

      // Get patients created by this doctor
      const db = getPrismaClient();
      const patientsModel = resolvePatientModel(db);
      const patients = patientsModel && typeof patientsModel.findMany === 'function'
        ? await patientsModel.findMany({
          where: {
            createdBy: doctorId,
            isActive: true,
          },
          select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          createdAt: true,
          appointments: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              status: true,
            },
            orderBy: {
              scheduledAt: 'desc',
            },
            take: 5, // Last 5 appointments
          },
          prescriptions: {
            select: {
              id: true,
              medication: true,
              createdAt: true,
              status: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 3, // Last 3 prescriptions
          },
          medicalRecords: {
            select: {
              id: true,
              title: true,
              recordType: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 3, // Last 3 records
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }) : [];

      res.status(200).json({
        success: true,
        count: patients.length,
        patients,
        message: 'Patients retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Alias for routes that expect `getPatients`
  async getPatients(req, res, next) {
    return this.getPatientsForDoctor(req, res, next);
  }

  /**
   * Create a medical record
   * POST /api/v1/healthcare/records
   */
  async createMedicalRecord(req, res, next) {
    try {
      const { recordId, patientEmail, doctorId, recordType, ipfsHash, metadata } = req.body;

      // Validate patientEmail is provided
      if (!patientEmail) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: patientEmail',
        });
      }

      // Resolve patientId from email
      const patientId = await this.resolvePatientId(patientEmail);
      if (!patientId) {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }

      if (!transactionService || typeof transactionService.createMedicalRecord !== 'function') {
        logger.warn('Transaction service unavailable when attempting to create medical record');
        return res.status(503).json({ success: false, error: 'Blockchain transaction service is temporarily unavailable' });
      }

      const result = await transactionService.createMedicalRecord(
        recordId, patientId, doctorId, recordType, ipfsHash, metadata || '',
      );

      // Persist a reference in the off-chain database when Prisma is available
      try {
        const db = getPrismaClient();
        // Only attempt DB write when using Prisma client that exposes `medicalRecord`
        if (db && db.medicalRecord && typeof db.medicalRecord.create === 'function') {
          // Map incoming recordType strings to Prisma enum values where possible
          const mapRecordTypeToEnum = (rt) => {
            if (!rt) return 'OTHER';
            const normalized = String(rt).toUpperCase().replace(/[^A-Z0-9]/g, '_');
            const allowed = ['DIAGNOSIS','TREATMENT','PRESCRIPTION','LAB_RESULT','IMAGING','OTHER'];
            return allowed.includes(normalized) ? normalized : 'OTHER';
          };

          // Try to extract fileName from metadata when metadata is a JSON string
          let fileName = null;
          let description = null;
          let metaObj = null;
          try {
            metaObj = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
            fileName = metaObj.fileName || null;
            description = metaObj.description || null;
          } catch (e) {
            // ignore parse errors
            metaObj = {};
          }

          await db.medicalRecord.create({
            data: {
              recordId: recordId || `rec-${Date.now()}`,
              title: metaObj?.title || 'Uploaded Record',
              description: description || null,
              recordType: mapRecordTypeToEnum(recordType),
              ipfsHash: ipfsHash || null,
              fileName,
              patientId,
              doctorId: doctorId || null,
            },
          });
        }
      } catch (dbErr) {
        logger.warn('Failed to persist medical record to DB:', dbErr);
      }

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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      // First get the record to check ownership
      if (!transactionService || typeof transactionService.getMedicalRecord !== 'function') {
        logger.warn('Transaction service unavailable when attempting to fetch medical record');
        return res.status(503).json({ success: false, error: 'Blockchain transaction service is temporarily unavailable' });
      }

      if (!transactionService || typeof transactionService.getMedicalRecord !== 'function') {
        logger.warn('Transaction service unavailable when attempting to fetch medical record');
        return res.status(503).json({ success: false, error: 'Blockchain transaction service is temporarily unavailable' });
      }

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

      // Check permissions: patients may only access their own records (match by id or wallet)
      if (userRole === 'patient' && record.data.patientId !== userIdentifier && record.data.patientId !== req.user.walletAddress) {
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      // Check permissions
      if (userRole === 'patient' && userIdentifier !== patientId && req.user.walletAddress !== patientId) {
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
        if (!transactionService || typeof transactionService.getConsentsByPatient !== 'function') {
          logger.warn('Transaction service unavailable when attempting to fetch consents');
          return res.status(503).json({ success: false, error: 'Blockchain transaction service is temporarily unavailable' });
        }

        const consents = await transactionService.getConsentsByPatient(patientId);
        const doctorIdentifier = req.user.walletAddress || userIdentifier;
        const hasConsent = (consents.data || []).some((consent) =>
          (consent.granteeAddress === doctorIdentifier || consent.granteeAddress === req.user.id) && // doctor's wallet or id
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'User ID not found in authentication token',
            statusCode: 400,
          },
        });
      }

      logger.info(`Fetching records for user: ${userIdentifier} with role: ${userRole}`);

      let records = [];

      if (userRole === 'patient') {
        // Patients can only see their own records
        const result = await transactionService.getRecordsByPatient(userIdentifier);
        records = result?.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see records they've authored/are associated with
        try {
          const db = getPrismaClient();
          if (db && db.medicalRecord && typeof db.medicalRecord.findMany === 'function') {
            records = await db.medicalRecord.findMany({
              where: { doctorId: req.user.id },
              include: {
                patient: { select: { id: true, email: true, name: true, walletAddress: true } },
              },
              orderBy: { createdAt: 'desc' },
            }) || [];
          } else {
            // Fallback if Prisma not available
            records = [];
          }
        } catch (err) {
          logger.warn('Failed to fetch doctor records from DB:', err);
          records = [];
        }
      } else if (userRole === 'admin') {
        // Admins can see all records (for audit purposes) - implement if needed
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

      if (!transactionService || typeof transactionService.createConsent !== 'function') {
        logger.warn('Transaction service unavailable when attempting to create consent');
        return res.status(503).json({ success: false, error: 'Blockchain transaction service is temporarily unavailable' });
      }

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
      const {
        appointmentId,
        patientEmail,
        doctorAddress,
        doctorId,
        timestamp: _timestamp,
        title,
        description,
        scheduledAt,
        reason = '',
        notes = '',
        patientDetails, // Optional: { age, gender, phoneNumber, emergencyContact, bloodGroup, dateOfBirth }
      } = req.body;

      const doctorUserId = req.user?.id;

      if (!doctorUserId) {
        return res.status(503).json({
          error: 'Unable to determine doctor user id. Authentication/user service may be unavailable. Try again later.',
        });
      }

      // Validate required fields
      if (!patientEmail || !title || !scheduledAt) {
        return res.status(400).json({
          error: 'Missing required fields: patientEmail, title, scheduledAt',
        });
      }

      // Resolve patientId from email
      const patientId = await this.resolvePatientId(patientEmail);
      if (!patientId) {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }

      // Fetch full patient record for walletAddress when available
      const db = getPrismaClient();
      const patientsModel2 = resolvePatientModel(db);
      const patient = patientsModel2 && typeof patientsModel2.findUnique === 'function'
        ? await patientsModel2.findUnique({ where: { id: patientId } })
        : await db.patientWalletMapping?.get(patientId) || null;

      // Create appointment in database (Prisma or in-memory fallback)
      const dbInstance = getPrismaClient();
      let appointment;
      if (dbInstance && dbInstance.appointment && typeof dbInstance.appointment.create === 'function') {
        appointment = await dbInstance.appointment.create({
          data: {
            appointmentId: appointmentId || uuidv4(),
            title,
            description: description || reason || notes,
            scheduledAt: new Date(scheduledAt),
            status: 'SCHEDULED',
            patientId: patientId,
            doctorId: doctorUserId,
            notes: notes || reason,
          },
          include: {
            patient: {
              select: {
                id: true,
                email: true,
                name: true,
                walletAddress: true,
              },
            },
            doctor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });
      } else {
        // Fallback to a lightweight in-memory appointment representation
        appointment = {
          appointmentId: appointmentId || uuidv4(),
          title,
          description: description || reason || notes,
          scheduledAt: new Date(scheduledAt),
          status: 'SCHEDULED',
          patientId: patientId,
          doctorId: doctorUserId,
          notes: notes || reason,
          patient: patient ? { id: patient.id, email: patient.email, name: patient.name, walletAddress: patient.walletAddress } : null,
          doctor: { id: doctorUserId, fullName: null, email: null },
        };
      }

      // Try to create appointment on blockchain
      let blockchainResult = null;
      try {
        if (!transactionService || typeof transactionService.createAppointment !== 'function') {
          logger.warn('Transaction service unavailable when attempting to create appointment on blockchain');
        } else {
          const result = await transactionService.createAppointment(
            appointment.appointmentId,
            (patient && patient.walletAddress) || patientId,
            doctorAddress || doctorId || '',
            Math.floor(new Date(scheduledAt).getTime() / 1000),
            title,
            description || notes || '',
          );
          blockchainResult = result;
        }
      } catch (blockchainError) {
        logger.error('Failed to create appointment on blockchain:', blockchainError);
        // Continue with database creation even if blockchain fails
      }

      // If patient details are provided, update the patient record
      if (patientDetails) {
        try {
          // Update patient data on blockchain if blockchain is available
          if (blockchainResult) {
            const updatedData = {
              name: patient?.name,
              email: patient?.email || patientEmail,
              ...patientDetails,
              walletAddress: patient?.walletAddress,
              updatedAt: new Date().toISOString(),
            };

            await transactionService.updatePatientData(patient?.walletAddress || patientId, updatedData);

            // Update IPFS with new data
            const PinataSDK = (await import('@pinata/sdk')).default;
            const pinata = new PinataSDK(
              process.env.PINATA_API_KEY,
              process.env.PINATA_SECRET_API_KEY,
            );

            const pinataResult = await pinata.pinJSONToIPFS(updatedData, {
              pinataMetadata: {
                name: `patient-${patient.email}-${Date.now()}`,
              },
              pinataOptions: {
                cidVersion: 1,
              },
            });

            // Update the patient record with new IPFS hash
            updatedData.ipfsHash = pinataResult.IpfsHash;
            await transactionService.updatePatientData(patient?.walletAddress || patientId, updatedData);
          }
        } catch (updateError) {
          logger.warn('Failed to update patient details during appointment creation:', updateError);
          // Don't fail the appointment creation if patient update fails
        }
      }

      res.status(201).json({
        success: true,
        data: {
          ...appointment,
          blockchainCreated: !!blockchainResult,
        },
        message: patientDetails ?
          'Appointment created successfully and patient details updated.' :
          'Appointment created successfully.',
      });
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

      // Authorization: patients can only access their own appointments
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (userRole === 'patient') {
        const patientIdOnRecord = result.data.patientId || result.data.patient?.id || result.data.patientId;
        if (patientIdOnRecord !== userIdentifier && patientIdOnRecord !== req.user.walletAddress) {
          return res.status(403).json({ success: false, error: 'Patients can only access their own appointments' });
        }
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

      // Authorization: patients can only access their own prescriptions
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (userRole === 'patient') {
        const patientIdOnRecord = result.data.patientId || result.data.patient?.id || result.data.patientId;
        if (patientIdOnRecord !== userIdentifier && patientIdOnRecord !== req.user.walletAddress) {
          return res.status(403).json({ success: false, error: 'Patients can only access their own prescriptions' });
        }
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
      const _user = req.user || {};
      const {
        prescriptionId = uuidv4(),
        patientEmail,
        doctorAddress,
        doctorId: _doctorId,
        medication,
        medications,
        dosage = '',
        instructions = '',
        expiryDate,
        patientDetails, // Optional: { age, gender, phoneNumber, emergencyContact, bloodGroup, dateOfBirth }
      } = req.body;

      const doctorUserId = req.user?.id;

      if (!doctorUserId) {
        return res.status(503).json({
          error: 'Unable to determine doctor user id. Authentication/user service may be unavailable. Try again later.',
        });
      }

      // Validate required fields
      if (!patientEmail || !medication) {
        return res.status(400).json({
          error: 'Missing required fields: patientEmail, medication',
        });
      }

      // Resolve patientId from email and fetch patient record
      const patientId = await this.resolvePatientId(patientEmail);
      if (!patientId) {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }

      const db2 = getPrismaClient();
      const patientsModel3 = resolvePatientModel(db2);
      const patient = patientsModel3 && typeof patientsModel3.findUnique === 'function'
        ? await patientsModel3.findUnique({ where: { id: patientId } })
        : await db2.findUniqueByEmail?.(patientEmail) || null;

      // Normalize medication input: prefer explicit `medication`, then `medications` array
      let med = medication || '';
      if (!med && Array.isArray(medications) && medications.length > 0) {
        med = typeof medications[0] === 'string' ? medications[0] : JSON.stringify(medications[0]);
      } else if (Array.isArray(medications)) {
        med = medications.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join('|');
      }

      // Create prescription in database (with graceful fallback when Prisma not configured)
      let prescription;
      try {
        const dbInstance = getPrismaClient();
        if (dbInstance && dbInstance.prescription && typeof dbInstance.prescription.create === 'function') {
          prescription = await dbInstance.prescription.create({
            data: {
              prescriptionId,
              medication: med,
              dosage,
              instructions,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              status: 'ACTIVE',
              patientId: patient.id || patientId,
              doctorId: doctorUserId,
            },
            include: {
              patient: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  walletAddress: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          });
        } else {
          // In-memory fallback when DB not available
          prescription = {
            prescriptionId,
            medication: med,
            dosage,
            instructions,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
            status: 'ACTIVE',
            patientId: patient?.id || patientId,
            doctorId: doctorUserId,
            patient: patient ? { id: patient.id, email: patient.email, name: patient.name, walletAddress: patient.walletAddress } : null,
            doctor: { id: doctorUserId, fullName: null, email: null },
            createdAt: new Date().toISOString(),
          };
        }
      } catch (dbErr) {
        logger.warn('Failed to persist prescription to DB, using in-memory fallback:', dbErr);
        prescription = {
          prescriptionId,
          medication: med,
          dosage,
          instructions,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          status: 'ACTIVE',
          patientId: patient?.id || patientId,
          doctorId: doctorUserId,
          patient: patient ? { id: patient.id, email: patient.email, name: patient.name, walletAddress: patient.walletAddress } : null,
          doctor: { id: doctorUserId, fullName: null, email: null },
          createdAt: new Date().toISOString(),
        };
      }

      // Try to create prescription on blockchain only when we have usable on-chain addresses
      let blockchainResult = null;
      try {
        const expiryTimestamp = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : 0;

        // Prefer explicit on-chain wallet addresses. Use patient.walletAddress when available,
        // otherwise fall back to patient.id for local/in-memory flows. For doctor, prefer req.user.walletAddress.
        const patientOnchainId = (patient && (patient.walletAddress || patient.id)) || '';
        const doctorOnchainId = (req.user && req.user.walletAddress) || doctorAddress || '';

        if (!patientOnchainId || !doctorOnchainId) {
          logger.warn('Skipping blockchain prescription creation - missing patient or doctor on-chain address', { patientOnchainId, doctorOnchainId });
        } else {
          if (!transactionService || typeof transactionService.createPrescription !== 'function') {
            logger.warn('Transaction service unavailable when attempting to create prescription on blockchain');
          } else {
            const result = await transactionService.createPrescription(
              prescriptionId,
              patientOnchainId,
              doctorOnchainId,
              med,
              dosage,
              instructions,
              expiryTimestamp,
            );
            blockchainResult = result;
          }
        }
      } catch (blockchainError) {
        logger.error('Failed to create prescription on blockchain:', blockchainError);
        // Continue with database creation even if blockchain fails
      }

      // If patient details are provided, update the patient record
      if (patientDetails) {
        try {
          // Update patient data on blockchain if blockchain is available
          if (blockchainResult) {
            const updatedData = {
              name: patient?.name,
              email: patient?.email || patientEmail,
              ...patientDetails,
              walletAddress: patient?.walletAddress,
              updatedAt: new Date().toISOString(),
            };

            await transactionService.updatePatientData(patient?.walletAddress || patientId, updatedData);

            // Update IPFS with new data
            const PinataSDK = (await import('@pinata/sdk')).default;
            const pinata = new PinataSDK(
              process.env.PINATA_API_KEY,
              process.env.PINATA_SECRET_API_KEY,
            );

            const pinataResult = await pinata.pinJSONToIPFS(updatedData, {
              pinataMetadata: {
                name: `patient-${patient.email}-${Date.now()}`,
              },
              pinataOptions: {
                cidVersion: 1,
              },
            });

            // Update the patient record with new IPFS hash
            updatedData.ipfsHash = pinataResult.IpfsHash;
            await transactionService.updatePatientData(patient.walletAddress || patientId, updatedData);
          }
        } catch (updateError) {
          logger.warn('Failed to update patient details during prescription creation:', updateError);
          // Don't fail the prescription creation if patient update fails
        }
      }

      res.status(201).json({
        success: true,
        data: {
          ...prescription,
          blockchainCreated: !!blockchainResult,
        },
        message: patientDetails ?
          'Prescription created successfully and patient details updated.' :
          'Prescription created successfully.',
      });
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching consents for user: ${userIdentifier} with role: ${userRole}`);

      let consents = [];

      if (userRole === 'patient') {
        // Patients can see consents they've granted
        const result = await transactionService.getConsentsByPatient(userIdentifier);
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching prescriptions for user: ${userIdentifier} with role: ${userRole}`);

      let prescriptions = [];

      if (userRole === 'patient') {
        // Patients can see prescriptions issued to them
        const result = await transactionService.getPrescriptionsByPatient(userIdentifier);
        prescriptions = result.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see prescriptions they've issued
        const result = await transactionService.getPrescriptionsByDoctor(req.user.id || userIdentifier);
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
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User ID not found',
        });
      }

      logger.info(`Fetching appointments for user: ${userIdentifier} with role: ${userRole}`);

      let appointments = [];

      if (userRole === 'patient') {
        // Patients can see their appointments
        const result = await transactionService.getAppointmentsByPatient(userIdentifier);
        appointments = result.data || [];
      } else if (userRole === 'doctor') {
        // Doctors can see appointments they've scheduled
        const result = await transactionService.getAppointmentsByDoctor(req.user.id || userIdentifier);
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

  /**
   * Get appointments for a doctor
   * GET /api/v1/healthcare/appointments
   */
  async getAppointmentsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access appointments',
        });
      }

      // Get appointments for this doctor
      const appointments = await getPrismaClient().appointment.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
              walletAddress: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: appointments,
        count: appointments.length,
        message: 'Appointments retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get prescriptions for a doctor
   * GET /api/v1/healthcare/prescriptions
   */
  async getPrescriptionsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access prescriptions',
        });
      }

      // Get prescriptions for this doctor
      const prescriptions = await getPrismaClient().prescription.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
              walletAddress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: prescriptions,
        count: prescriptions.length,
        message: 'Prescriptions retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get medical records for a doctor
   * GET /api/v1/healthcare/records
   */
  async getMedicalRecordsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access medical records',
        });
      }

      // Get medical records for this doctor
      const records = await getPrismaClient().medicalRecord.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
              walletAddress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: records,
        count: records.length,
        message: 'Medical records retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lab tests for a doctor
   * GET /api/v1/healthcare/lab-tests
   */
  async getLabTestsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access lab tests',
        });
      }

      // Get lab tests for this doctor
      const labTests = await getPrismaClient().labTest.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
              walletAddress: true,
            },
          },
          lab: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: labTests,
        count: labTests.length,
        message: 'Lab tests retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consent requests for a doctor
   * GET /api/v1/healthcare/consents
   */
  async getConsentRequestsForDoctor(req, res, next) {
    try {
      const userRole = req.user.role;
      const doctorId = req.user.id;

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access consent requests',
        });
      }

      // Get consent requests for this doctor
      const consents = await getPrismaClient().consentRequest.findMany({
        where: {
          requesterId: doctorId,
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
              walletAddress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: consents,
        count: consents.length,
        message: 'Consent requests retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient by email for doctors
   * GET /api/v1/healthcare/patients/search?email=patient@example.com
   */
  async getPatientByEmail(req, res, next) {
    try {
      const userRole = req.user.role;
      const { email } = req.query;

      // Only doctors and admins can search for patients
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can search for patients',
        });
      }

      if (!email) {
        return res.status(400).json({
          error: 'Email parameter is required',
        });
      }

      // Find patient by email
      const db3 = getPrismaClient();
      const patientsModel4 = resolvePatientModel(db3);
      const patient = patientsModel4 && typeof patientsModel4.findUnique === 'function'
        ? await patientsModel4.findUnique({
          where: { email },
          include: {
          appointments: {
            include: {
              doctor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              scheduledAt: 'desc',
            },
            take: 10,
          },
          prescriptions: {
            include: {
              doctor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          medicalRecords: {
            include: {
              doctor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          _count: {
            select: {
              appointments: true,
              prescriptions: true,
              medicalRecords: true,
              labTests: true,
            },
          },
        },
      }) : null;

      if (!patient) {
        return res.status(404).json({
          error: 'Patient not found',
        });
      }

      res.status(200).json({
        success: true,
        data: patient,
        message: 'Patient found successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default HealthcareController;
