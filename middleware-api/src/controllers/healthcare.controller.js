import transactionService from '../services/transaction.service.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import dbService from '../services/db.service.prisma.js';

// In-memory fallback REMOVED per user request
// const _inMemory = { ... };

function getPrismaClient() {
  if (dbService && dbService.isReady && dbService.isReady()) {
    return dbService.prisma;
  }
  // Provide specific error about DATABASE_URL
  const hasDbUrl = !!process.env.DATABASE_URL;
  throw new Error(
    hasDbUrl
      ? 'Database disconnected. Prisma failed to connect - check DATABASE_URL format.'
      : 'DATABASE_URL environment variable is not set. Set it in Render dashboard.',
  );
}

// Helper to resolve the patient mapping model across possible prisma client naming
function resolvePatientModel(db) {
  if (!db) { return null; }
  return db.patient || db.Patient;
}

/**
 * HealthcareController
 * Handles HTTP requests for Ethereum healthcare smart contract operations
 */
class HealthcareController {
  // Resolve patient id by email (supports Prisma client or in-memory fallback)
  async resolvePatientId(email) {
    if (!email) { return null; }
    const db = getPrismaClient();
    const patient = db.patientWalletMapping && typeof db.patientWalletMapping.findUnique === 'function'
      ? await db.patientWalletMapping.findUnique({ where: { email } })
      : null;

    return patient ? patient.id : null;
  }

  /**
   * Create a new patient
   * POST /api/v1/healthcare/patients
   */
  async createPatient(req, res, next) {
    try {
      const { name, email, walletAddress } = req.body;
      const doctorId = req.user?.id || req.user?.userId; // Now a UUID!

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

      // Check if patient already exists
      let existingPatient = null;
      const db = getPrismaClient();
      if (db.patientWalletMapping && typeof db.patientWalletMapping.findUnique === 'function') {
        existingPatient = await db.patientWalletMapping.findUnique({ where: { email } });
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
      let patientMapping;
      if (db.patientWalletMapping && typeof db.patientWalletMapping.create === 'function') {
        // Get the user_id - either from the authenticated user creating the patient,
        // or try to find the user account by email if patient is self-registering
        let userId = doctorId; // Default to doctor creating the patient

        // If email matches an existing user, link to that user
        const existingUser = await db.user?.findUnique?.({ where: { email } });
        if (existingUser) {
          userId = existingUser.id;
        }

        patientMapping = await db.patientWalletMapping.create({
          data: {
            email,
            name,
            walletAddress: patientWalletAddress,
            createdBy: doctorId,
            userId: userId, // ✅ Link to user account
          },
        });
      } else {
        throw new Error('Database not connected or Patient model missing');
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
      let blockchainErrorMessage = null;
      if (ipfsHash) {
        try {
          blockchainResult = await transactionService.createPatient(
            patientWalletAddress, name, 0, '', ipfsHash, // age=0, gender='' as placeholders
          );
        } catch (blockchainError) {
          logger.error('Failed to create patient on blockchain:', blockchainError);
          // Capture a safe, user-friendly message to return in the response
          blockchainErrorMessage = blockchainError && blockchainError.reason ? String(blockchainError.reason) : (blockchainError && blockchainError.message ? String(blockchainError.message) : 'Blockchain transaction failed');
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
        blockchainError: blockchainErrorMessage,
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
      const doctorId = req.user.id; // Already a UUID from JWT

      // Only doctors and admins can access this endpoint
      if (userRole !== 'doctor' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors and admins can access patient lists',
        });
      }

      // Get patients created by this doctor
      const db = getPrismaClient();

      // Query PatientWalletMapping table (the actual patient table in schema)
      const patients = db.patientWalletMapping && typeof db.patientWalletMapping.findMany === 'function'
        ? await db.patientWalletMapping.findMany({
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
        })
        : [];

      res.status(200).json({
        success: true,
        count: patients.length,
        patients,
        data: patients, // Alias for frontend compatibility
        message: 'Patients retrieved successfully',
      });
    } catch (error) {
      logger.error('getPatientsForDoctor error:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.meta,
      });
    }
  }

  // Alias for routes that expect `getPatients`
  async getPatients(req, res, next) {
    // Call the concrete implementation from the prototype directly to avoid
    // relying on `this` binding when Express invokes the handler.
    const handler = HealthcareController.prototype.getPatientsForDoctor;
    return handler.call(this, req, res, next);
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
            if (!rt) { return 'OTHER'; }
            const normalized = String(rt).toUpperCase().replace(/[^A-Z0-9]/g, '_');
            const allowed = ['DIAGNOSIS', 'TREATMENT', 'PRESCRIPTION', 'LAB_RESULT', 'IMAGING', 'OTHER'];
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

          // Use doctor ID - either provided or from authenticated user (UUID)
          const resolvedDoctorId = doctorId || req.user?.id || req.user?.userId;

          if (!resolvedDoctorId) {
            logger.warn('Unable to determine doctor ID for medical record creation');
            throw new Error('Doctor ID could not be determined');
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
              doctorId: resolvedDoctorId,
            },
          });
        } else {
          logger.warn('Failed to persist medical record to DB: medicalRecord model missing or DB disconnected');
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

      let result;
      try {
        result = await transactionService.getRecordsByPatient(patientId);
      } catch (err) {
        logger.warn('Blockchain getRecordsByPatient failed, trying fallback:', err.message);
        // Fallback to in-memory/DB
        const db = getPrismaClient();
        if (db.medicalRecord && typeof db.medicalRecord.findMany === 'function') {
          const records = await db.medicalRecord.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
          });
          result = { success: true, data: records, records: records, count: records.length };
        } else {
          throw err;
        }
      }

      // Ensure response has both data and records properties
      if (result && !result.records && result.data) {
        result.records = result.data;
      }

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
        try {
          const db = getPrismaClient();
          let patientId = userIdentifier; // userIdentifier might be UUID or email

          // If userIdentifier looks like an email, resolve it to patient ID
          if (userIdentifier && userIdentifier.includes('@')) {
            logger.info(`Patient identified by email: ${userIdentifier}, looking up patient record`);

            if (db.patientWalletMapping && typeof db.patientWalletMapping.findUnique === 'function') {
              const patientRecord = await db.patientWalletMapping.findUnique({
                where: { email: userIdentifier },
              });

              if (patientRecord) {
                patientId = patientRecord.id;
                logger.info(`Resolved patient email to ID: ${patientId}`);
              } else {
                logger.warn(`No patient found with email: ${userIdentifier}`);
              }
            }
          }

          logger.info(`Querying medical records for patient ID: ${patientId}`);

          if (db && db.medicalRecord && typeof db.medicalRecord.findMany === 'function') {
            records = await db.medicalRecord.findMany({
              where: { patientId },
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

            logger.info(`Found ${records.length} medical records for patient`);
          } else {
            // Fallback if Prisma not available
            logger.warn('Prisma medicalRecord model not available');
            records = [];
          }
        } catch (err) {
          logger.error('Failed to fetch patient records from DB:', err);
          records = [];
        }
      } else if (userRole === 'doctor') {
        // Doctors can see records they've authored/are associated with
        try {
          const db = getPrismaClient();
          // userIdentifier is already the database UUID from JWT
          const doctorId = userIdentifier;

          if (db && db.medicalRecord && typeof db.medicalRecord.findMany === 'function') {
            records = await db.medicalRecord.findMany({
              where: { doctorId },
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

      // Flatten the response for frontend compatibility
      const flattenedRecords = records.map(record => ({
        ...record,
        patientName: record.patient?.name,
        doctorName: record.doctor?.fullName || record.doctor?.name,
      }));

      res.status(200).json({
        success: true,
        data: flattenedRecords,
        records: flattenedRecords, // Alias for frontend compatibility
        count: Array.isArray(flattenedRecords) ? flattenedRecords.length : 0,
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

      if (!transactionService?.createConsent || typeof transactionService.createConsent !== 'function') {
        logger.warn('Transaction service or createConsent method unavailable');
        return res.status(503).json({
          success: false,
          error: 'Consent service is temporarily unavailable. Please try again later.'
        });
      }

      const result = await transactionService.createConsent(
        consentId, patientId, doctorAddress, validityDays,
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating consent:', error);
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
          success: false,
          error: 'Missing required fields: patientEmail, title, scheduledAt',
        });
      }

      // Validate reason is provided (important for medical context)
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Reason for appointment is required',
        });
      }

      // Validate scheduledAt is a valid future date
      const appointmentDate = new Date(scheduledAt);
      if (isNaN(appointmentDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scheduledAt date format. Please provide a valid ISO 8601 date string.',
        });
      }

      // Ensure appointment is not in the past
      const now = new Date();
      if (appointmentDate < now) {
        return res.status(400).json({
          success: false,
          error: 'Appointment cannot be scheduled in the past',
        });
      }

      // Resolve patientId from email
      const patientId = await this.resolvePatientId(patientEmail);
      if (!patientId) {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }

      // Fetch full patient record for walletAddress when available
      const db = getPrismaClient();
      const patient = db.patientWalletMapping && typeof db.patientWalletMapping.findUnique === 'function'
        ? await db.patientWalletMapping.findUnique({ where: { id: patientId } })
        : null;

      // Create appointment in database (Prisma or in-memory fallback)
      const dbInstance = getPrismaClient();
      let appointment;
      if (dbInstance && dbInstance.appointment && typeof dbInstance.appointment.create === 'function') {
        // doctorUserId from req.user.id is already a UUID
        appointment = await dbInstance.appointment.create({
          data: {
            appointmentId: appointmentId || uuidv4(),
            title,
            description: description || reason || notes,
            scheduledAt: new Date(scheduledAt),
            status: 'SCHEDULED',
            patientId: patientId,
            doctorId: doctorUserId, // Already a UUID from JWT
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
        // No fallback - Log error
        logger.warn('Failed to persist appointment to DB: appointment model missing');
        // We do typically continue to blockchain, blocking here would stop flow.
        // But user said "stored in database". If DB fails, should we fail req?
        // Let's at least NOT fake it in memory.
        appointment = {
          appointmentId: appointmentId || uuidv4(),
          title,
          // minimal stub to allow blockchain attempt if critical, or maybe better to throw?
          // Throwing is safer per user request.
        };
        throw new Error('Database persistence failed for appointment');
      }

      // Try to create appointment on blockchain
      let blockchainResult = null;
      let blockchainErrorMessage = null;
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
        blockchainErrorMessage = blockchainError && blockchainError.reason ? String(blockchainError.reason) : (blockchainError && blockchainError.message ? String(blockchainError.message) : 'Blockchain transaction failed');
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
          blockchainError: blockchainErrorMessage,
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

      // Fetch appointment from database instead of blockchain
      const db = getPrismaClient();
      if (!db?.appointment?.findUnique) {
        return res.status(503).json({
          success: false,
          error: 'Database service unavailable'
        });
      }

      const appointment = await db.appointment.findUnique({
        where: { appointmentId },
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

      if (!appointment) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }

      // Authorization check for patients
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (userRole === 'patient') {
        const patientIdOnRecord = appointment.patientId || appointment.patient?.id;

        // Check if userIdentifier matches
        let hasAccess = patientIdOnRecord === userIdentifier || patientIdOnRecord === req.user.walletAddress;

        // If user is identified by email, resolve to patient ID
        if (!hasAccess && req.user.email) {
          const resolvedPatientId = await this.resolvePatientId(req.user.email);
          hasAccess = resolvedPatientId === patientIdOnRecord;
        }

        if (!hasAccess) {
          return res.status(403).json({ success: false, error: 'Patients can only access their own appointments' });
        }
      }

      res.status(200).json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Error fetching appointment:', error);
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

      // Fetch prescription from database instead of blockchain
      const db = getPrismaClient();
      if (!db?.prescription?.findUnique) {
        return res.status(503).json({
          success: false,
          error: 'Database service unavailable'
        });
      }

      const prescription = await db.prescription.findUnique({
        where: { prescriptionId },
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

      if (!prescription) {
        return res.status(404).json({ success: false, error: 'Prescription not found' });
      }

      // Authorization: patients can only access their own prescriptions
      const userIdentifier = req.user.userId || req.user.id || req.user.walletAddress;
      const userRole = req.user.role;

      if (userRole === 'patient') {
        const patientIdOnRecord = prescription.patientId || prescription.patient?.id;

        // Check if userIdentifier matches
        let hasAccess = patientIdOnRecord === userIdentifier || patientIdOnRecord === req.user.walletAddress;

        // If user is identified by email, resolve to patient ID
        if (!hasAccess && req.user.email) {
          const resolvedPatientId = await this.resolvePatientId(req.user.email);
          hasAccess = resolvedPatientId === patientIdOnRecord;
        }

        if (!hasAccess) {
          return res.status(403).json({ success: false, error: 'Patients can only access their own prescriptions' });
        }
      }

      res.status(200).json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('Error fetching prescription:', error);
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
          success: false,
          error: 'Missing required fields: patientEmail, medication',
        });
      }

      // Validate dosage is provided and not empty
      if (!dosage || dosage.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dosage is required (e.g., "500mg", "10ml", "2 tablets")',
        });
      }

      // Validate frequency (from req.body, need to extract it first)
      const { frequency, duration } = req.body;

      if (!frequency || frequency.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Frequency is required (e.g., "twice daily", "once per day", "every 8 hours")',
        });
      }

      if (!duration || duration.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Duration is required (e.g., "7 days", "2 weeks", "1 month")',
        });
      }

      // Resolve patientId from email and fetch patient record
      const patientId = await this.resolvePatientId(patientEmail);
      if (!patientId) {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }

      const db2 = getPrismaClient();
      const patient = db2.patientWalletMapping && typeof db2.patientWalletMapping.findUnique === 'function'
        ? await db2.patientWalletMapping.findUnique({ where: { id: patientId } })
        : null;

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
          // doctorUserId from req.user.id is already a UUID
          prescription = await dbInstance.prescription.create({
            data: {
              prescriptionId,
              medication: med,
              dosage,
              instructions,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              status: 'ACTIVE',
              patientId: patient.id || patientId,
              doctorId: doctorUserId, // Already a UUID from JWT
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
          logger.warn('Failed to persist prescription to DB: prescription model missing or DB disconnected');
          throw new Error('Database persistence failed for prescription');
        }
      } catch (dbErr) {
        logger.warn('Failed to persist prescription to DB:', dbErr);
        throw dbErr;
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
      const updateData = req.body || {};

      // Load existing appointment for authorization checks
      let existing;
      try {
        existing = await transactionService.getAppointment(appointmentId);
      } catch (err) {
        // If on-chain appointment is missing or the call fails, attempt DB fallback so updates can be performed when on-chain isn't available
        logger.warn('On-chain getAppointment failed; trying DB fallback:', err && err.message ? err.message : err);
        const db = getPrismaClient();
        // Log dbService readiness info to help debug why Prisma models may be missing
        try {
          logger.info('dbService readiness at fallback', {
            dbServiceReady: dbService && typeof dbService.isReady === 'function' ? dbService.isReady() : 'unknown',
            hasPrismaClient: !!(dbService && dbService.prisma),
          });
        } catch (e) {
          // ignore
        }

        // Attempt to initialize Prisma client lazily if it's not ready
        try {
          if (dbService && typeof dbService.initialize === 'function' && !(dbService.isReady && dbService.isReady())) {
            logger.info('Prisma client not ready - attempting lazy initialize');
            await dbService.initialize();
          }
        } catch (initErr) {
          logger.warn('Prisma client lazy initialize failed at fallback', { message: initErr.message });
        }

        // Refresh `db` reference after attempting init
        const refreshedDb = getPrismaClient();

        // Try various possible Prisma model names to be resilient to generated client differences
        const appointmentModel = (refreshedDb && (refreshedDb.appointment || refreshedDb.Appointment || refreshedDb.appointments || refreshedDb.Appointments || refreshedDb.appointmentModel)) || null;
        try {
          logger.info('Prisma appointment model check', { availableKeys: refreshedDb ? Object.keys(refreshedDb) : [], foundModel: !!appointmentModel });
        } catch (e) {
          // ignore logging errors
        }

        if (appointmentModel && typeof appointmentModel.findUnique === 'function') {
          const dbApt = await appointmentModel.findUnique({ where: { appointmentId } });
          if (dbApt) {
            logger.info('DB fallback found appointment', { appointmentId, dbAptId: dbApt.id });
            existing = { success: true, data: dbApt };
          } else {
            logger.warn('DB fallback did NOT find appointment by appointmentId', { appointmentId });
            existing = null;
          }
        } else {
          logger.warn('DB client or Appointment model not available for fallback', { hasDb: !!db, modelCandidates: ['appointment', 'Appointment', 'appointments', 'Appointments', 'appointmentModel'], availableKeys: db ? Object.keys(db) : [] });
          existing = null;
        }
      }

      if (!existing || !existing.data) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }

      const appointment = existing.data;
      const userRole = req.user?.role;
      const userIdentifier = req.user?.userId || req.user?.id || req.user?.walletAddress;

      // Authorization: doctors and admins may update any appointment; patients can only update notes
      if (userRole === 'patient') {
        const patientIdOnRecord = appointment.patientId || appointment.patient?.id;
        if (patientIdOnRecord !== userIdentifier && patientIdOnRecord !== req.user?.walletAddress) {
          return res.status(403).json({ success: false, error: 'Patients can only modify their own appointments' });
        }

        // Only allow patients to change notes (reschedule or status changes must be done by a doctor/admin)
        const allowedForPatient = ['notes'];
        const attempted = Object.keys(updateData);
        const unauthorized = attempted.filter(k => !allowedForPatient.includes(k));
        if (unauthorized.length > 0) {
          return res.status(403).json({ success: false, error: 'Patients can only update notes' });
        }
      }

      // Persist to DB when available
      try {
        const db = getPrismaClient();
        if (db && db.appointment && typeof db.appointment.update === 'function') {
          const updated = await db.appointment.update({
            where: { appointmentId },
            data: {
              ...(updateData.title ? { title: updateData.title } : {}),
              ...(updateData.description ? { description: updateData.description } : {}),
              ...(updateData.notes ? { notes: updateData.notes } : {}),
              ...(updateData.scheduledAt ? { scheduledAt: new Date(updateData.scheduledAt) } : {}),
              ...(updateData.status ? { status: updateData.status.toUpperCase() } : {}),
            },
          });

          // Attempt on-chain update where applicable
          try {
            if (transactionService && typeof transactionService.updateAppointment === 'function') {
              await transactionService.updateAppointment(appointmentId, updateData);
            }
          } catch (chainErr) {
            logger.warn('Failed to update appointment on-chain:', chainErr);
          }

          // Log audit event (non-blocking)
          try {
            const actorId = req.user?.id || req.user?.userId || null;
            logger.info('Attempting to log audit event for appointment update', { actorId, appointmentId, updateFields: Object.keys(updateData) });
            dbService.logAuditEvent && await dbService.logAuditEvent(actorId, 'appointment.updated', {
              appointmentId,
              updateFields: Object.keys(updateData),
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          } catch (auditErr) {
            logger.warn('Failed to log audit event for appointment update:', auditErr.message || auditErr);
          }

          return res.status(200).json({ success: true, data: updated });
        }
      } catch (dbErr) {
        // If Prisma update fails, allow the error to propagate to the standard error handler after logging.
        logger.warn('DB update failed for appointment; continuing with on-chain where possible:', dbErr.message);
      }

      // Fallback: attempt on-chain update and synthesize response
      try {
        if (transactionService && typeof transactionService.updateAppointment === 'function') {
          await transactionService.updateAppointment(appointmentId, updateData);
        }

        // Return merged object
        const merged = { ...appointment, ...updateData };
        return res.status(200).json({ success: true, data: merged });
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to update appointment' });
      }
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

      // Load existing appointment
      const existing = await transactionService.getAppointment(appointmentId);
      if (!existing || !existing.data) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }

      const appointment = existing.data;
      const userRole = req.user?.role;
      const userIdentifier = req.user?.userId || req.user?.id || req.user?.walletAddress;

      // Authorization: patients can cancel their own appointments; doctors/admins can cancel any
      if (userRole === 'patient') {
        const patientIdOnRecord = appointment.patientId || appointment.patient?.id;
        if (patientIdOnRecord !== userIdentifier && patientIdOnRecord !== req.user?.walletAddress) {
          return res.status(403).json({ success: false, error: 'Patients can only cancel their own appointments' });
        }
      }

      // Update DB status if available
      try {
        const db = getPrismaClient();
        if (db && db.appointment && typeof db.appointment.update === 'function') {
          const updated = await db.appointment.update({
            where: { appointmentId },
            data: { status: 'CANCELLED' },
          });

          try {
            if (transactionService && typeof transactionService.cancelAppointment === 'function') {
              await transactionService.cancelAppointment(appointmentId);
            }
          } catch (chainErr) {
            logger.warn('Failed to cancel appointment on-chain:', chainErr);
          }

          // Log audit event for cancellation
          try {
            const actorId = req.user?.id || req.user?.userId || null;
            dbService.logAuditEvent && await dbService.logAuditEvent(actorId, 'appointment.cancelled', {
              appointmentId,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          } catch (auditErr) {
            logger.warn('Failed to log audit event for appointment cancel:', auditErr.message || auditErr);
          }

          return res.status(200).json({ success: true, data: updated });
        }
      } catch (dbErr) {
        logger.warn('DB update failed for cancel; continuing with on-chain where possible:', dbErr.message);
      }

      // Fallback: call on-chain cancel
      try {
        if (transactionService && typeof transactionService.cancelAppointment === 'function') {
          await transactionService.cancelAppointment(appointmentId);
        }
        const merged = { ...appointment, status: 'CANCELLED' };
        return res.status(200).json({ success: true, data: merged });
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
      }
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

      try {
        const db = getPrismaClient();
        if (db && db.prescription && typeof db.prescription.findMany === 'function') {
          const where = {};
          if (userRole === 'patient') { where.patientId = userIdentifier; }
          if (userRole === 'doctor') { where.doctorId = userIdentifier; }

          prescriptions = await db.prescription.findMany({
            where,
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
            orderBy: { createdAt: 'desc' },
          });
        } else if (userRole === 'admin') {
          // Admins can see all prescriptions (implementation needed)
          prescriptions = [];
        }
      } catch (err) {
        logger.warn('Failed to fetch prescriptions from DB:', err.message);
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
        // Patients can see their own appointments
        try {
          const db = getPrismaClient();
          if (db && db.appointment && typeof db.appointment.findMany === 'function') {
            const where = { patientId: userIdentifier };

            appointments = await db.appointment.findMany({
              where,
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
              orderBy: { scheduledAt: 'desc' },
            }) || [];
          } else {
            appointments = [];
          }
        } catch (err) {
          logger.warn('Failed to fetch patient appointments from DB:', err.message);
          appointments = [];
        }
      } else if (userRole === 'doctor') {
        // Doctors can see appointments they've scheduled
        try {
          const db = getPrismaClient();
          const where = { doctorId: userIdentifier };

          if (db && db.appointment && typeof db.appointment.findMany === 'function') {
            appointments = await db.appointment.findMany({
              where,
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
              orderBy: { scheduledAt: 'desc' },
            }) || [];
          } else {
            appointments = [];
          }
        } catch (err) {
          logger.warn('Failed to fetch doctor appointments from DB:', err.message);
          appointments = [];
        }
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
      let appointments = [];
      const db = getPrismaClient();

      try {
        if (db && db.appointment && typeof db.appointment.findMany === 'function') {
          appointments = await db.appointment.findMany({
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
        }
      } catch (err) {
        logger.warn('Prisma getAppointmentsForDoctor failed:', err.message);
        throw err; // Re-throw the error as in-memory fallback is removed
      }

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
      let prescriptions = [];
      const db = getPrismaClient();

      try {
        if (db && db.prescription && typeof db.prescription.findMany === 'function') {
          prescriptions = await db.prescription.findMany({
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
        }
      } catch (err) {
        logger.warn('Prisma getPrescriptionsForDoctor failed:', err.message);
        throw err; // Re-throw the error as in-memory fallback is removed
      }

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
      const patient = db3.patientWalletMapping && typeof db3.patientWalletMapping.findUnique === 'function'
        ? await db3.patientWalletMapping.findUnique({
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
