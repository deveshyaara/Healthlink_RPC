import ethereumService from './ethereum.service.js';
import logger from '../utils/logger.js';
import { BlockchainError, NotFoundError } from '../utils/errors.js';

/**
 * TransactionService
 * Business logic layer for Ethereum blockchain transactions
 * Handles healthcare operations via smart contracts
 */
class TransactionService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Ethereum service
   */
  async initialize() {
    if (!this.initialized) {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545';
      const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
      await ethereumService.initialize(rpcUrl, privateKey);
      this.initialized = true;
      logger.info('TransactionService: Ethereum service initialized');
    }
  }

  /**
   * Create a new patient record
   * @param {string} patientId - Patient ID
   * @param {string} name - Patient name
   * @param {number} age - Patient age
   * @param {string} bloodType - Blood type
   * @param {string} allergies - Allergies
   * @returns {Promise<Object>} Transaction result
   */
  async createPatient(patientId, name, age, bloodType, allergies) {
    try {
      await this.initialize();
      logger.info('Service: Creating patient', { patientId, name });

      const result = await ethereumService.createPatient(patientId, name, age, bloodType, allergies);

      return {
        success: true,
        data: result,
        functionName: 'createPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: createPatient failed:', error);
      throw error;
    }
  }

  /**
   * Get patient information
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Patient data
   */
  async getPatient(patientId) {
    try {
      await this.initialize();
      logger.info('Service: Getting patient', { patientId });

      const result = await ethereumService.getPatient(patientId);

      return {
        success: true,
        data: result,
        functionName: 'getPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getPatient failed:', error);
      if (error.message && error.message.includes('does not exist')) {
        throw new NotFoundError('Patient');
      }
      throw error;
    }
  }

  /**
   * Create a medical record
   * @param {string} recordId - Record ID
   * @param {string} patientId - Patient ID
   * @param {string} doctorId - Doctor ID
   * @param {string} recordType - Type of record
   * @param {string} ipfsHash - IPFS hash for document storage
   * @param {string} metadata - Additional metadata
   * @returns {Promise<Object>} Transaction result
   */
  async createMedicalRecord(recordId, patientId, doctorId, recordType, ipfsHash, metadata) {
    try {
      await this.initialize();
      logger.info('Service: Creating medical record', { recordId, patientId });

      const result = await ethereumService.createMedicalRecord(
        recordId, patientId, doctorId, recordType, ipfsHash, metadata,
      );

      return {
        success: true,
        data: result,
        functionName: 'createMedicalRecord',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: createMedicalRecord failed:', error);
      throw error;
    }
  }

  /**
   * Get a medical record
   * @param {string} recordId - Record ID
   * @returns {Promise<Object>} Record data
   */
  async getMedicalRecord(recordId) {
    try {
      await this.initialize();
      logger.info('Service: Getting medical record', { recordId });

      const result = await ethereumService.getMedicalRecord(recordId);

      return {
        success: true,
        data: result,
        functionName: 'getMedicalRecord',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getMedicalRecord failed:', error);
      if (error.message && error.message.includes('does not exist')) {
        throw new NotFoundError('Medical Record');
      }
      throw error;
    }
  }

  /**
   * Get all records for a patient
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Array of records
   */
  async getRecordsByPatient(patientId) {
    try {
      await this.initialize();
      logger.info('Service: Getting records by patient', { patientId });

      const result = await ethereumService.getRecordsByPatient(patientId);

      return {
        success: true,
        data: result,
        functionName: 'getRecordsByPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getRecordsByPatient failed:', error);
      throw error;
    }
  }

  /**
   * Create consent for data access
   * @param {string} consentId - Consent ID
   * @param {string} patientId - Patient ID
   * @param {string} doctorAddress - Doctor's Ethereum address
   * @param {number} validityDays - Validity period in days
   * @returns {Promise<Object>} Transaction result
   */
  async createConsent(consentId, patientId, doctorAddress, validityDays) {
    try {
      await this.initialize();
      logger.info('Service: Creating consent', { consentId, patientId });

      const result = await ethereumService.createConsent(consentId, patientId, doctorAddress, validityDays);

      return {
        success: true,
        data: result,
        functionName: 'createConsent',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: createConsent failed:', error);
      throw error;
    }
  }

  /**
   * Get audit records
   * @param {number} limit - Number of records to retrieve
   * @returns {Promise<Object>} Array of audit records
   */
  async getAuditRecords(limit = 10) {
    try {
      await this.initialize();
      logger.info('Service: Getting audit records', { limit });

      const result = await ethereumService.getAuditRecords(limit);

      return {
        success: true,
        data: result,
        functionName: 'getAuditRecords',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getAuditRecords failed:', error);
      throw error;
    }
  }

  /**
   * Create an appointment
   * @param {string} appointmentId - Appointment ID
   * @param {string} patientId - Patient ID
   * @param {string} doctorAddress - Doctor's Ethereum address
   * @param {number} timestamp - Appointment timestamp
   * @param {string} notes - Appointment notes
   * @returns {Promise<Object>} Transaction result
   */
  async createAppointment(appointmentId, patientId, doctorAddress, timestamp, reason = '', notes = '') {
    try {
      await this.initialize();
      logger.info('Service: Creating appointment', { appointmentId, patientId });

      const result = await ethereumService.createAppointment(
        appointmentId, patientId, doctorAddress, timestamp, reason, notes,
      );

      return {
        success: true,
        data: result,
        functionName: 'createAppointment',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: createAppointment failed:', error);
      throw error;
    }
  }

  /**
   * Create a prescription
   * @param {string} prescriptionId - Prescription ID
   * @param {string} patientId - Patient ID
   * @param {string} doctorAddress - Doctor's Ethereum address
   * @param {string} medication - Medication details
   * @param {string} dosage - Dosage instructions
   * @param {number} expiryTimestamp - Expiry timestamp
   * @returns {Promise<Object>} Transaction result
   */
  async createPrescription(prescriptionId, patientId, doctorAddress, medication, dosage, instructions = '', expiryTimestamp = 0) {
    try {
      await this.initialize();
      logger.info('Service: Creating prescription', { prescriptionId, patientId });
      logger.info('transaction.createPrescription args', { prescriptionId, patientId, doctorAddress, medicationType: typeof medication, medicationSample: (typeof medication === 'string' ? medication.slice(0,200) : JSON.stringify(medication)), dosage, instructions, expiryTimestamp });

      // Ensure expiry is a future timestamp. Default to 30 days from now when not provided.
      const now = Math.floor(Date.now() / 1000);
      const defaultExpiry = now + 30 * 24 * 60 * 60; // 30 days
      const parsedExpiry = expiryTimestamp ? Number(expiryTimestamp) : 0;
      const expiry = parsedExpiry > now ? parsedExpiry : defaultExpiry;

      const result = await ethereumService.createPrescription(
        prescriptionId, patientId, doctorAddress, medication, dosage, instructions, expiry,
      );

      return {
        success: true,
        data: result,
        functionName: 'createPrescription',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: createPrescription failed:', error);
      throw error;
    }
  }

  /**
   * Register a doctor
   * @param {string} doctorAddress - Doctor's Ethereum address
   * @param {string} name - Doctor name
   * @param {string} specialization - Specialization
   * @param {string} licenseNumber - License number
   * @param {string} hospitalAffiliation - Hospital affiliation
   * @returns {Promise<Object>} Transaction result
   */
  async registerDoctor(doctorAddress, name, specialization, licenseNumber, hospitalAffiliation) {
    try {
      await this.initialize();
      logger.info('Service: Registering doctor', { doctorAddress, name });

      const result = await ethereumService.registerDoctor(
        doctorAddress, name, specialization, licenseNumber, hospitalAffiliation,
      );

      return {
        success: true,
        data: result,
        functionName: 'registerDoctor',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: registerDoctor failed:', error);
      throw error;
    }
  }

  /**
   * Verify a doctor
   * @param {string} doctorAddress - Doctor's Ethereum address
   * @returns {Promise<Object>} Transaction result
   */
  async verifyDoctor(doctorAddress) {
    try {
      await this.initialize();
      logger.info('Service: Verifying doctor', { doctorAddress });

      const result = await ethereumService.verifyDoctor(doctorAddress);

      return {
        success: true,
        data: result,
        functionName: 'verifyDoctor',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: verifyDoctor failed:', error);
      throw error;
    }
  }

  /**
   * Get verified doctors
   * @returns {Promise<Object>} Array of verified doctors
   */
  async getVerifiedDoctors() {
    try {
      await this.initialize();
      logger.info('Service: Getting verified doctors');

      const result = await ethereumService.getVerifiedDoctors();

      return {
        success: true,
        data: result,
        functionName: 'getVerifiedDoctors',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getVerifiedDoctors failed:', error);
      throw error;
    }
  }

  /**
   * Get appointments by patient
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Array of appointments
   */
  async getAppointmentsByPatient(patientId) {
    try {
      await this.initialize();
      logger.info('Service: Getting appointments by patient', { patientId });

      const result = await ethereumService.getAppointmentsByPatient(patientId);

      return {
        success: true,
        data: result,
        functionName: 'getAppointmentsByPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getAppointmentsByPatient failed:', error);
      // If contract reports missing data, return empty array instead of 404
      if (error && (error.message && error.message.includes('does not exist') || error.type === 'NOT_FOUND')) {
        return {
          success: true,
          data: [],
          functionName: 'getAppointmentsByPatient',
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  /**
   * Get prescriptions by patient
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Array of prescriptions
   */
  async getPrescriptionsByPatient(patientId) {
    try {
      await this.initialize();
      logger.info('Service: Getting prescriptions by patient', { patientId });

      const result = await ethereumService.getPrescriptionsByPatient(patientId);

      return {
        success: true,
        data: result,
        functionName: 'getPrescriptionsByPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getPrescriptionsByPatient failed:', error);
      if (error && (error.message && error.message.includes('does not exist') || error.type === 'NOT_FOUND')) {
        return {
          success: true,
          data: [],
          functionName: 'getPrescriptionsByPatient',
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  /**
   * Get prescriptions by doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Object>} Array of prescriptions
   */
  async getPrescriptionsByDoctor(doctorId) {
    try {
      await this.initialize();
      logger.info('Service: Getting prescriptions by doctor', { doctorId });

      const result = await ethereumService.getPrescriptionsByDoctor(doctorId);

      return {
        success: true,
        data: result,
        functionName: 'getPrescriptionsByDoctor',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getPrescriptionsByDoctor failed:', error);
      throw error;
    }
  }

  /**
   * Get appointments by doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Object>} Array of appointments
   */
  async getAppointmentsByDoctor(doctorId) {
    try {
      await this.initialize();
      logger.info('Service: Getting appointments by doctor', { doctorId });

      const result = await ethereumService.getAppointmentsByDoctor(doctorId);

      return {
        success: true,
        data: result,
        functionName: 'getAppointmentsByDoctor',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getAppointmentsByDoctor failed:', error);
      throw error;
    }
  }

  /**
   * Get consent by ID
   * @param {string} consentId - Consent ID
   * @returns {Promise<Object>} Consent data
   */
  async getConsent(consentId) {
    try {
      await this.initialize();
      logger.info('Service: Getting consent', { consentId });

      const result = await ethereumService.getConsent(consentId);

      return {
        success: true,
        data: result,
        functionName: 'getConsent',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getConsent failed:', error);
      throw error;
    }
  }

  /**
   * Get consents by patient
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Array of consents
   */
  async getConsentsByPatient(patientId) {
    try {
      await this.initialize();
      logger.info('Service: Getting consents by patient', { patientId });

      const result = await ethereumService.getConsentsByPatient(patientId);

      return {
        success: true,
        data: result,
        functionName: 'getConsentsByPatient',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: getConsentsByPatient failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method - use specific healthcare queries instead
   */
  async getAllAssets(_pageSize = 10, _bookmark = '', _userId = null) {
    throw new BlockchainError('getAllAssets not applicable. Use getRecordsByPatient or similar methods');
  }

  /**
   * Legacy method - use specific healthcare queries instead
   */
  async queryAssets(queryObject, _userId = null) {
    throw new BlockchainError('queryAssets not applicable. Use specific healthcare queries');
  }

  /**
   * Legacy method - use specific create methods
   */
  async createAsset(assetData, _userId = null) {
    throw new BlockchainError('createAsset not applicable. Use createPatient, createMedicalRecord, etc.');
  }

  /**
   * Legacy method - not directly supported
   */
  async updateAsset(assetId, updateData, _userId = null) {
    throw new BlockchainError('updateAsset not applicable. Use specific update methods for records, appointments, etc.');
  }

  /**
   * Legacy method - use specific delete methods
   */
  async deleteAsset(assetId, _userId = null) {
    throw new BlockchainError('deleteAsset not applicable. Use specific healthcare contract methods');
  }

  /**
   * Legacy submit transaction - routes to specific methods
   */
  async submitTransaction(functionName, args = [], _userId = null) {
    logger.warn('Legacy submitTransaction called, routing to specific method');

    switch(functionName) {
      case 'CreatePatient':
        return this.createPatient(...args);
      case 'CreateRecord':
        return this.createMedicalRecord(...args);
      case 'CreateConsent':
        return this.createConsent(...args);
      case 'CreateAppointment':
        return this.createAppointment(...args);
      case 'CreatePrescription':
        return this.createPrescription(...args);
      case 'RegisterDoctor':
        return this.registerDoctor(...args);
      case 'VerifyDoctor':
        return this.verifyDoctor(...args);
      default:
        throw new BlockchainError(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Legacy query method - routes to specific queries
   */
  async queryLedger(functionName, args = [], _userId = null) {
    logger.warn('Legacy queryLedger called, routing to specific method');

    switch(functionName) {
      case 'GetPatient':
        return this.getPatient(...args);
      case 'GetRecord':
        return this.getMedicalRecord(...args);
      case 'GetRecordsByPatient':
        return this.getRecordsByPatient(...args);
      case 'GetVerifiedDoctors':
        return this.getVerifiedDoctors();
      case 'GetAuditRecords':
        return this.getAuditRecords(...args);
      default:
        throw new BlockchainError(`Unknown query function: ${functionName}`);
    }
  }
}

// Singleton instance
const transactionService = new TransactionService();

export default transactionService;
