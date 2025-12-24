import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import {
  Web3Error,
  UserRejectedError,
  InsufficientFundsError,
  NonceError,
  ContractRevertError,
  NetworkError,
} from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ethereum Service for HealthLink
 * Replaces Fabric Gateway Service with Ethereum + Hardhat integration
 */
class EthereumService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
    this.isHealthy = true;
    this.currentNonce = null;
    this.transactionQueue = [];
    this.isProcessingQueue = false;

    // In-memory fallback stores when contracts are not deployed locally
    this._stores = {
      records: new Map(), // recordId -> record
      prescriptions: new Map(), // prescriptionId -> prescription
      appointments: new Map(), // appointmentId -> appointment
    };
  }

  /**
     * Initialize Ethereum connection
     * @param {string} providerUrl - RPC URL (default: Sepolia testnet)
     * @param {string} privateKey - Private key for signing transactions
     */
  async initialize(providerUrl = 'https://rpc.sepolia.org', privateKey = null) {
    try {
      // Connect to provider with timeout and retry options
      this.provider = new ethers.JsonRpcProvider(providerUrl, undefined, {
        timeout: 30000, // 30 second timeout
        throttleLimit: 2,
      });

      // Verify network is Sepolia (chainId 11155111)
      const network = await this.provider.getNetwork();
      if (network.chainId !== 11155111n) {
        throw new Error(`Expected Sepolia testnet (chainId 11155111), but connected to ${network.name} (chainId ${network.chainId})`);
      }

      // Set up signer
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
      } else {
        // Use first account from provider (for local development)
        const accounts = await this.provider.listAccounts();
        if (accounts.length === 0) {
          throw new Error('No accounts available');
        }
        this.signer = await this.provider.getSigner(0);
      }

      // Initialize nonce tracking
      await this._initializeNonce();

      // Load contract addresses and ABIs
      await this.loadContracts();

      this.initialized = true;
      this.isHealthy = true;
      logger.info('✅ Ethereum Service initialized successfully');
      logger.info('Connected to: %o', await this.provider.getNetwork());
      logger.info('Signer address: %s', await this.signer.getAddress());

      return true;
    } catch (error) {
      logger.error('Failed to initialize Ethereum Service:', error);
      this.isHealthy = false;
      throw error;
    }
  }

  /**
   * Initialize nonce tracking
   */
  async _initializeNonce() {
    try {
      const signerAddress = await this.signer.getAddress();
      this.currentNonce = await this.provider.getTransactionCount(signerAddress, 'pending');
      logger.info('Initialized nonce tracking at:', this.currentNonce);
    } catch (error) {
      logger.error('Failed to initialize nonce:', error);
      throw error;
    }
  }

  /**
   * Health check method
   */
  async checkConnection() {
    try {
      await this.provider.getBlockNumber();
      this.isHealthy = true;
      return { healthy: true, message: 'Connection OK' };
    } catch (error) {
      this.isHealthy = false;
      logger.error('Health check failed:', error);
      return { healthy: false, message: 'RPC connection failed', error: error.message };
    }
  }

  /**
   * Send transaction with nonce management and retry logic
   */
  async sendTransaction(contractMethod, ...args) {
    return new Promise((resolve, reject) => {
      this.transactionQueue.push({ contractMethod, args, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * Process transaction queue sequentially
   */
  async _processQueue() {
    if (this.isProcessingQueue || this.transactionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.transactionQueue.length > 0) {
      const { contractMethod, args, resolve, reject } = this.transactionQueue.shift();

      try {
        const result = await this._executeTransactionWithRetry(contractMethod, ...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute transaction with retry logic
   */
  async _executeTransactionWithRetry(contractMethod, ...args) {
    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Estimate gas first
        const gasEstimate = await this._safeEstimateGas(contractMethod, ...args);

        // Get current nonce
        const nonce = this.currentNonce++;

        // Execute transaction
        const tx = await contractMethod(...args, {
          nonce,
          gasLimit: gasEstimate,
        });

        const receipt = await this.waitForTransaction(tx);
        return receipt;

      } catch (error) {
        lastError = error;
        const errorMessage = error.message?.toLowerCase() || '';

        // Check if error is retryable
        const isRetryable = errorMessage.includes('nonce too low') ||
                           errorMessage.includes('replacement transaction underpriced') ||
                           errorMessage.includes('network error') ||
                           errorMessage.includes('timeout') ||
                           errorMessage.includes('connection');

        if (!isRetryable || attempt === maxRetries - 1) {
          // Re-sync nonce on final failure
          try {
            await this._initializeNonce();
          } catch (nonceError) {
            logger.warn('Failed to re-sync nonce:', nonceError);
          }
          throw this._formatTransactionError(error);
        }

        // Wait before retry
        logger.warn(`Transaction attempt ${attempt + 1} failed, retrying in 500ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-sync nonce on retryable errors
        try {
          await this._initializeNonce();
        } catch (nonceError) {
          logger.warn('Failed to re-sync nonce during retry:', nonceError);
        }
      }
    }

    throw lastError;
  }

  /**
   * Safe gas estimation with error handling
   */
  async _safeEstimateGas(contractMethod, ...args) {
    try {
      const gasEstimate = await contractMethod.estimateGas(...args);
      // Add 20% buffer
      return Math.ceil(Number(gasEstimate) * 1.2);
    } catch (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
        throw new ContractRevertError('Smart Contract Logic Reverted: ' + (error.reason || error.message), error.reason);
      }
      // Default gas limit if estimation fails
      logger.warn('Gas estimation failed, using default:', error.message);
      return 200000; // Default gas limit
    }
  }

  /**
   * Format transaction errors
   */
  _formatTransactionError(error) {
    const message = error.message || 'Transaction failed';
    const errorMessage = message.toLowerCase();

    // Map to specific error types
    if (error.code === 'ACTION_REJECTED' || errorMessage.includes('user denied') || errorMessage.includes('user rejected')) {
      return new UserRejectedError(message);
    }

    if (errorMessage.includes('insufficient funds')) {
      return new InsufficientFundsError(message);
    }

    if (errorMessage.includes('nonce too low') || errorMessage.includes('replacement transaction underpriced')) {
      return new NonceError(message);
    }

    if (errorMessage.includes('smart contract logic reverted') || errorMessage.includes('execution reverted')) {
      return new ContractRevertError(message, error.reason);
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return new NetworkError(message);
    }

    // Default Web3 error
    return new Web3Error(message, error, error.code);
  }

  /**
     * Load contract addresses and ABIs
     */
  async loadContracts() {
    try {
      // Load deployment addresses
      const deploymentPath = path.join(__dirname, '..', '..', '..', 'ethereum-contracts', 'deployment-addresses.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

      // Load contract ABIs
      const artifactsPath = path.join(__dirname, '..', '..', '..', 'ethereum-contracts', 'artifacts', 'contracts');

      const contractNames = ['HealthLink', 'PatientRecords', 'Appointments', 'Prescriptions', 'DoctorCredentials'];

      for (const name of contractNames) {
        const abiPath = path.join(artifactsPath, `${name}.sol`, `${name}.json`);
        if (!fs.existsSync(abiPath)) {
          logger.warn('Artifact not found for %s at %s - skipping', name, abiPath);
          continue;
        }

        const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

        const contractAddress = deploymentData?.contracts?.[name];

        if (!contractAddress) {
          logger.warn('No deployment address for %s found in deployment-addresses.json - skipping', name);
          continue;
        }

        try {
          this.contracts[name] = new ethers.Contract(
            contractAddress,
            artifact.abi,
            this.signer,
          );
        } catch (err) {
          logger.error('Failed to instantiate contract %s at %s: %o', name, contractAddress, err);
        }
      }

      logger.info('✅ Contracts loaded: %o', Object.keys(this.contracts));
    } catch (error) {
      logger.error('Failed to load contracts:', error);
      throw error;
    }
  }

  /**
     * Get contract instance
     */
  getContract(name) {
    if (!this.initialized) {
      throw new Error('Ethereum Service not initialized');
    }
    return this.contracts[name];
  }

  /**
     * Connect with different signer (for role-based operations)
     */
  async connectAs(privateKey) {
    this.signer = new ethers.Wallet(privateKey, this.provider);
    await this.loadContracts(); // Reload contracts with new signer
  }

  /**
     * Get current signer address
     */
  async getSignerAddress() {
    return await this.signer.getAddress();
  }

  /**
     * Wait for transaction confirmation
     */
  async waitForTransaction(tx) {
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
    };
  }

  /**
     * Get transaction receipt
     */
  async getTransactionReceipt(txHash) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
     * Format error message from contract revert
     */
  formatError(error) {
    if (error.reason) {
      return error.reason;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // ====== Patient Records Contract Methods ======

  async createMedicalRecord(recordId, patientId, doctorId, recordType, ipfsHash, metadata) {
    const contract = this.getContract('PatientRecords');
    if (contract) {
      try {
        // Use the new transaction queue system
        return await this.sendTransaction(
          contract.createRecord,
          recordId,
          patientId,
          doctorId,
          recordType,
          ipfsHash,
          JSON.stringify(metadata),
        );
      } catch (error) {
        logger.error('Error calling createRecord on contract:', error);
        // Fall back to in-memory store
      }
    }

    // Fallback: store in-memory for local dev if contract isn't deployed
    const now = Date.now();
    const record = {
      recordId,
      patientId,
      doctorId,
      recordType,
      ipfsHash,
      metadata: typeof metadata === 'string' ? JSON.parse(metadata || '{}') : metadata || {},
      createdAt: now,
      updatedAt: now,
      exists: true,
    };
    this._stores.records.set(recordId, record);
    return { transactionHash: `local-${recordId}-${now}`, blockNumber: 0, gasUsed: '0', status: 'success' };
  }

  async getMedicalRecord(recordId) {
    const contract = this.getContract('PatientRecords');
    if (contract) {
      try {
        const record = await contract.getRecord(recordId);
        return {
          recordId: record.recordId,
          patientId: record.patientId,
          doctorId: record.doctorId,
          recordType: record.recordType,
          ipfsHash: record.ipfsHash,
          metadata: record.metadata ? JSON.parse(record.metadata) : {},
          createdAt: Number(record.createdAt),
          updatedAt: Number(record.updatedAt),
          exists: record.exists,
        };
      } catch (error) {
        logger.error('Error calling getRecord on contract:', error);
        // Fall back to in-memory store
      }
    }

    const rec = this._stores.records.get(recordId);
    if (!rec) {return { exists: false };}
    return {
      recordId: rec.recordId,
      patientId: rec.patientId,
      doctorId: rec.doctorId,
      recordType: rec.recordType,
      ipfsHash: rec.ipfsHash,
      metadata: rec.metadata || {},
      createdAt: Number(rec.createdAt),
      updatedAt: Number(rec.updatedAt),
      exists: true,
    };
  }

  async getRecordsByPatient(patientId) {
    const contract = this.getContract('PatientRecords');
    if (contract) {
      try {
        const records = await contract.getRecordsByPatient(patientId);
        return records.map(record => ({
          recordId: record.recordId,
          patientId: record.patientId,
          doctorId: record.doctorId,
          recordType: record.recordType,
          ipfsHash: record.ipfsHash,
          metadata: record.metadata ? JSON.parse(record.metadata) : {},
          createdAt: Number(record.createdAt),
          updatedAt: Number(record.updatedAt),
        }));
      } catch (error) {
        logger.warn('Contract call failed for getRecordsByPatient, falling back to in-memory:', error.message);
      }
    }

    // Fallback to in-memory store
    const all = Array.from(this._stores.records.values()).filter(r => r.patientId.toLowerCase() === patientId.toLowerCase());
    return all.map(r => ({
      recordId: r.recordId,
      patientId: r.patientId,
      doctorId: r.doctorId,
      recordType: r.recordType,
      ipfsHash: r.ipfsHash,
      metadata: r.metadata || {},
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    }));
  }

  async updateRecordMetadata(recordId, metadata) {
    const contract = this.getContract('PatientRecords');
    return await this.sendTransaction(
      contract.updateRecordMetadata,
      recordId,
      JSON.stringify(metadata),
    );
  }

  async deleteRecord(recordId) {
    const contract = this.getContract('PatientRecords');
    return await this.sendTransaction(contract.deleteRecord, recordId);
  }

  // ====== HealthLink Contract Methods ======

  async createPatient(patientAddress, name, age, gender, ipfsHash) {
    const contract = this.getContract('HealthLink');
    return await this.sendTransaction(
      contract.createPatient,
      patientAddress,
      name,
      age,
      gender,
      ipfsHash,
    );
  }

  async getPatient(patientId) {
    const contract = this.getContract('HealthLink');
    const patient = await contract.getPatient(patientId);
    return {
      patientId: patient.patientId,
      publicData: patient.publicData ? JSON.parse(patient.publicData) : {},
      exists: patient.exists,
      createdAt: Number(patient.createdAt),
    };
  }

  async updatePatientData(patientId, updatedData) {
    const contract = this.getContract('HealthLink');
    return await this.sendTransaction(
      contract.updatePatientData,
      patientId,
      JSON.stringify(updatedData),
    );
  }

  async createConsent(consentId, patientId, granteeAddress, scope, purpose, validUntil) {
    const contract = this.getContract('HealthLink');
    return await this.sendTransaction(
      contract.createConsent,
      consentId,
      patientId,
      granteeAddress,
      scope,
      purpose,
      validUntil,
    );
  }

  async revokeConsent(consentId) {
    const contract = this.getContract('HealthLink');
    return await this.sendTransaction(contract.revokeConsent, consentId);
  }

  async getConsent(consentId) {
    const contract = this.getContract('HealthLink');
    const consent = await contract.getConsent(consentId);
    return {
      consentId: consent.consentId,
      patientId: consent.patientId,
      granteeAddress: consent.granteeAddress,
      scope: consent.scope,
      purpose: consent.purpose,
      validUntil: Number(consent.validUntil),
      status: Number(consent.status),
      createdAt: Number(consent.createdAt),
      revokedAt: Number(consent.revokedAt),
    };
  }

  async getConsentsByPatient(patientId) {
    const contract = this.getContract('HealthLink');
    const consents = await contract.getConsentsByPatient(patientId);
    return consents.map(consent => ({
      consentId: consent.consentId,
      patientId: consent.patientId,
      granteeAddress: consent.granteeAddress,
      scope: consent.scope,
      purpose: consent.purpose,
      validUntil: Number(consent.validUntil),
      status: Number(consent.status),
      createdAt: Number(consent.createdAt),
      revokedAt: Number(consent.revokedAt),
    }));
  }

  // ====== Appointments Contract Methods ======

  async createAppointment(appointmentId, patientId, doctorId, appointmentDate, reason, notes) {
    const contract = this.getContract('Appointments');
    if (contract) {
      return await this.sendTransaction(
        contract.createAppointment,
        appointmentId,
        patientId,
        doctorId,
        appointmentDate,
        reason,
        notes,
      );
    }

    // Fallback: in-memory appointment
    const now = Date.now();
    const apt = {
      appointmentId,
      patientId,
      doctorId,
      appointmentDate: Number(appointmentDate),
      reason,
      notes,
      status: 0,
      createdAt: now,
      updatedAt: now,
    };
    this._stores.appointments.set(appointmentId, apt);
    return { transactionHash: `local-apt-${appointmentId}-${now}`, blockNumber: 0, gasUsed: '0', status: 'success' };
  }

  async getAppointmentsByPatient(patientId) {
    const contract = this.getContract('Appointments');
    if (contract) {
      try {
        const appointments = await contract.getAppointmentsByPatient(patientId);
        return appointments.map(apt => ({
          appointmentId: apt.appointmentId,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          appointmentDate: Number(apt.appointmentDate),
          reason: apt.reason,
          notes: apt.notes,
          status: Number(apt.status),
          createdAt: Number(apt.createdAt),
          updatedAt: Number(apt.updatedAt),
        }));
      } catch (error) {
        logger.warn('Contract call failed for getAppointmentsByPatient, falling back to in-memory:', error.message);
      }
    }

    const all = Array.from(this._stores.appointments.values()).filter(a => a.patientId.toLowerCase() === patientId.toLowerCase());
    return all.map(apt => ({
      appointmentId: apt.appointmentId,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      appointmentDate: Number(apt.appointmentDate),
      reason: apt.reason,
      notes: apt.notes,
      status: Number(apt.status),
      createdAt: Number(apt.createdAt),
      updatedAt: Number(apt.updatedAt),
    }));
  }

  async getAppointmentsByDoctor(doctorId) {
    const contract = this.getContract('Appointments');
    if (contract) {
      try {
        const appointments = await contract.getAppointmentsByDoctor(doctorId);
        return appointments.map(apt => ({
          appointmentId: apt.appointmentId,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          appointmentDate: Number(apt.appointmentDate),
          reason: apt.reason,
          notes: apt.notes,
          status: Number(apt.status),
          createdAt: Number(apt.createdAt),
          updatedAt: Number(apt.updatedAt),
        }));
      } catch (error) {
        logger.warn('Contract call failed for getAppointmentsByDoctor, falling back to in-memory:', error.message);
      }
    }

    const all = Array.from(this._stores.appointments.values()).filter(a => a.doctorId.toLowerCase() === doctorId.toLowerCase());
    return all.map(apt => ({
      appointmentId: apt.appointmentId,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      appointmentDate: Number(apt.appointmentDate),
      reason: apt.reason,
      notes: apt.notes,
      status: Number(apt.status),
      createdAt: Number(apt.createdAt),
      updatedAt: Number(apt.updatedAt),
    }));
  }

  async getAppointment(appointmentId) {
    const contract = this.getContract('Appointments');
    if (contract) {
      const apt = await contract.getAppointment(appointmentId);
      if (!apt) {return null;}
      return {
        appointmentId: apt.appointmentId,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        appointmentDate: Number(apt.appointmentDate),
        reason: apt.reason,
        notes: apt.notes,
        status: Number(apt.status),
        createdAt: Number(apt.createdAt),
        updatedAt: Number(apt.updatedAt),
      };
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) {return null;}
    return {
      appointmentId: apt.appointmentId,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      appointmentDate: Number(apt.appointmentDate),
      reason: apt.reason,
      notes: apt.notes,
      status: Number(apt.status),
      createdAt: Number(apt.createdAt),
      updatedAt: Number(apt.updatedAt),
    };
  }

  async updateAppointmentStatus(appointmentId, status) {
    const contract = this.getContract('Appointments');
    if (contract) {
      return await this.sendTransaction(
        contract.updateAppointmentStatus,
        appointmentId,
        status,
      );
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) {throw new Error('Appointment not found');}
    apt.status = status;
    apt.updatedAt = Date.now();
    this._stores.appointments.set(appointmentId, apt);
    return { transactionHash: `local-update-apt-${appointmentId}-${apt.updatedAt}`, blockNumber: 0, gasUsed: '0', status: 'success' };
  }

  async updateAppointmentNotes(appointmentId, notes) {
    const contract = this.getContract('Appointments');
    if (contract) {
      return await this.sendTransaction(
        contract.updateAppointmentNotes,
        appointmentId,
        notes || ''
      );
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) {throw new Error('Appointment not found');}
    apt.notes = notes || apt.notes;
    apt.updatedAt = Date.now();
    this._stores.appointments.set(appointmentId, apt);
    return { transactionHash: `local-update-apt-notes-${appointmentId}-${apt.updatedAt}`, blockNumber: 0, gasUsed: '0', status: 'success' };
  }

  // ====== Prescriptions Contract Methods ======

  async createPrescription(prescriptionId, patientId, doctorId, medication, dosage, instructions, expiryDate) {
    const contract = this.getContract('Prescriptions');
    // Log types to help diagnose ABI param errors
    logger.info('EthereumService.createPrescription args:', {
      prescriptionId,
      patientId,
      doctorId,
      medicationType: typeof medication,
      medicationSample: (typeof medication === 'string' ? medication.slice(0, 200) : JSON.stringify(medication)),
      dosage,
      instructions,
      expiryDate,
    });
    // Coerce arguments to primitive types expected by the ABI
    const medArg = (typeof medication === 'string') ? medication : JSON.stringify(medication);
    const dosageArg = dosage || '';
    const instructionsArg = instructions || '';
    const expiryArg = expiryDate ? Number(expiryDate) : 0;

    try {
      if (contract) {
        logger.info('Calling contract.createPrescription', { prescriptionId, patientId, doctorId });
        const tx = await contract.createPrescription(
          prescriptionId,
          patientId,
          doctorId,
          medArg,
          dosageArg,
          instructionsArg,
          expiryArg,
        );
        return await this.waitForTransaction(tx);
      }

      // Fallback: store in-memory
      const now = Date.now();
      const pres = {
        prescriptionId,
        patientId,
        doctorId,
        medication: medArg,
        dosage: dosageArg,
        instructions: instructionsArg,
        issuedDate: now,
        expiryDate: expiryArg,
        status: 0,
        createdAt: now,
        updatedAt: now,
      };
      this._stores.prescriptions.set(prescriptionId, pres);
      return { transactionHash: `local-pres-${prescriptionId}-${now}`, blockNumber: 0, gasUsed: '0', status: 'success' };
    } catch (err) {
      logger.error('createPrescription contract call failed', {
        prescriptionId, patientId, doctorId, medArgSample: (medArg || '').slice(0,200), dosageArg, instructionsArg, expiryArg, err: err.message,
      });
      throw err;
    }
  }

  /**
   * Validate ethereum address (simple check)
   */
  isValidEthAddress(address) {
    if (!address || typeof address !== 'string') {return false;}
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Safe prescription creation helper: only calls on-chain contract when both
   * patient and doctor identifiers look like valid ethereum addresses.
   * Otherwise uses the in-memory fallback to avoid ABI/ethers errors.
   */
  async createPrescriptionSafe(prescriptionId, patientId, doctorId, medication, dosage, instructions, expiryDate) {
    const contract = this.contracts['Prescriptions'];

    const patientIsAddr = this.isValidEthAddress(patientId);
    const doctorIsAddr = this.isValidEthAddress(doctorId);

    if (contract && patientIsAddr && doctorIsAddr) {
      // both addresses look valid — proceed with on-chain call
      return await this.createPrescription(prescriptionId, patientId, doctorId, medication, dosage, instructions, expiryDate);
    }

    logger.warn('createPrescriptionSafe: skipping on-chain call; using in-memory fallback', { prescriptionId, patientIdIsAddr: patientIsAddr, doctorIdIsAddr: doctorIsAddr });

    // Use same fallback as createPrescription's fallback
    const now = Date.now();
    const medArg = (typeof medication === 'string') ? medication : JSON.stringify(medication);
    const dosageArg = dosage || '';
    const instructionsArg = instructions || '';
    const expiryArg = expiryDate ? Number(expiryDate) : 0;

    const pres = {
      prescriptionId,
      patientId,
      doctorId,
      medication: medArg,
      dosage: dosageArg,
      instructions: instructionsArg,
      issuedDate: now,
      expiryDate: expiryArg,
      status: 0,
      createdAt: now,
      updatedAt: now,
    };
    this._stores.prescriptions.set(prescriptionId, pres);
    return { transactionHash: `local-pres-${prescriptionId}-${now}`, blockNumber: 0, gasUsed: '0', status: 'success' };
  }

  async getPrescriptionsByPatient(patientId) {
    const contract = this.getContract('Prescriptions');
    if (contract) {
      try {
        const prescriptions = await contract.getPrescriptionsByPatient(patientId);
        return prescriptions.map(rx => ({
          prescriptionId: rx.prescriptionId,
          patientId: rx.patientId,
          doctorId: rx.doctorId,
          medication: rx.medication,
          dosage: rx.dosage,
          instructions: rx.instructions,
          issuedDate: Number(rx.issuedDate),
          expiryDate: Number(rx.expiryDate),
          status: Number(rx.status),
          filledBy: rx.filledBy,
          filledDate: Number(rx.filledDate),
        }));
      } catch (error) {
        logger.warn('Contract call failed for getPrescriptionsByPatient, falling back to in-memory:', error.message);
      }
    }

    const all = Array.from(this._stores.prescriptions.values()).filter(p => p.patientId.toLowerCase() === patientId.toLowerCase());
    return all.map(p => ({
      prescriptionId: p.prescriptionId,
      patientId: p.patientId,
      doctorId: p.doctorId,
      medication: p.medication,
      dosage: p.dosage,
      instructions: p.instructions,
      issuedDate: Number(p.issuedDate),
      expiryDate: Number(p.expiryDate),
      status: Number(p.status),
      filledBy: p.filledBy,
      filledDate: Number(p.filledDate || 0),
    }));
  }

  async getPrescriptionsByDoctor(doctorId) {
    const contract = this.getContract('Prescriptions');
    if (contract) {
      try {
        const prescriptions = await contract.getPrescriptionsByDoctor(doctorId);
        return prescriptions.map(rx => ({
          prescriptionId: rx.prescriptionId,
          patientId: rx.patientId,
          doctorId: rx.doctorId,
          medication: rx.medication,
          dosage: rx.dosage,
          instructions: rx.instructions,
          issuedDate: Number(rx.issuedDate),
          expiryDate: Number(rx.expiryDate),
          status: Number(rx.status),
          filledBy: rx.filledBy,
          filledDate: Number(rx.filledDate),
        }));
      } catch (error) {
        logger.warn('Contract call failed for getPrescriptionsByDoctor, falling back to in-memory:', error.message);
      }
    }

    const all = Array.from(this._stores.prescriptions.values()).filter(p => p.doctorId.toLowerCase() === doctorId.toLowerCase());
    return all.map(p => ({
      prescriptionId: p.prescriptionId,
      patientId: p.patientId,
      doctorId: p.doctorId,
      medication: p.medication,
      dosage: p.dosage,
      instructions: p.instructions,
      issuedDate: Number(p.issuedDate),
      expiryDate: Number(p.expiryDate),
      status: Number(p.status),
      filledBy: p.filledBy,
      filledDate: Number(p.filledDate || 0),
    }));
  }

  async getPrescription(prescriptionId) {
    const contract = this.getContract('Prescriptions');
    if (contract) {
      const rx = await contract.getPrescription(prescriptionId);
      if (!rx) {return null;}
      return {
        prescriptionId: rx.prescriptionId,
        patientId: rx.patientId,
        doctorId: rx.doctorId,
        medication: rx.medication,
        dosage: rx.dosage,
        instructions: rx.instructions,
        issuedDate: Number(rx.issuedDate),
        expiryDate: Number(rx.expiryDate),
        status: Number(rx.status),
      };
    }

    const p = this._stores.prescriptions.get(prescriptionId);
    if (!p) {return null;}
    return {
      prescriptionId: p.prescriptionId,
      patientId: p.patientId,
      doctorId: p.doctorId,
      medication: p.medication,
      dosage: p.dosage,
      instructions: p.instructions,
      issuedDate: Number(p.issuedDate),
      expiryDate: Number(p.expiryDate),
      status: Number(p.status),
    };
  }

  // ====== Doctor Credentials Contract Methods ======

  async registerDoctor(doctorId, name, specialty, licenseNumber, qualifications, hospital, walletAddress) {
    const contract = this.getContract('DoctorCredentials');
    const tx = await contract.registerDoctor(
      doctorId,
      name,
      specialty,
      licenseNumber,
      qualifications,
      hospital,
      walletAddress,
    );
    return await this.waitForTransaction(tx);
  }

  async verifyDoctor(doctorId) {
    const contract = this.getContract('DoctorCredentials');
    const tx = await contract.verifyDoctor(doctorId);
    return await this.waitForTransaction(tx);
  }

  async getVerifiedDoctors() {
    const contract = this.getContract('DoctorCredentials');
    const doctors = await contract.getVerifiedDoctors();
    return doctors.map(doc => ({
      doctorId: doc.doctorId,
      name: doc.name,
      specialty: doc.specialty,
      licenseNumber: doc.licenseNumber,
      qualifications: doc.qualifications,
      hospital: doc.hospital,
      status: Number(doc.status),
      walletAddress: doc.walletAddress,
      createdAt: Number(doc.createdAt),
      verifiedAt: Number(doc.verifiedAt),
    }));
  }

  // ====== Role Management ======

  async grantDoctorRole(contractName, address) {
    const contract = this.getContract(contractName);
    const tx = await contract.grantDoctorRole(address);
    return await this.waitForTransaction(tx);
  }

  async grantPatientRole(contractName, address) {
    const contract = this.getContract(contractName);
    const tx = await contract.grantPatientRole(address);
    return await this.waitForTransaction(tx);
  }

  async grantAdminRole(contractName, address) {
    const contract = this.getContract(contractName);
    const tx = await contract.grantAdminRole(address);
    return await this.waitForTransaction(tx);
  }
}

// Export singleton instance
const ethereumService = new EthereumService();
export default ethereumService;
