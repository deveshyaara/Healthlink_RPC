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
   * Decode revert data from a raw hex payload (Error(string) and basic fallback)
   */
  _decodeRevertData(raw) {
    try {
      if (!raw || typeof raw !== 'string') {return null;}
      // Standard Error(string) selector
      if (raw.startsWith('0x08c379a0')) {
        const hex = raw.slice(10);
        // offset 0x20 / 32 bytes for the string
        const lenHex = hex.slice(64, 128);
        const len = parseInt(lenHex, 16);
        const strHex = hex.slice(128, 128 + len * 2);
        return Buffer.from(strHex, 'hex').toString('utf8');
      }
      // No known encoding - return as-is
      return raw;
    } catch (err) {
      logger.warn('Failed to decode revert data payload:', err.message || err);
      return raw;
    }
  }

  /**
   * Format transaction errors
   */
  _formatTransactionError(error) {
    try {
      // Normalize error shape
      const rawMsg = (error && (error.message || error.shortMessage)) || 'Transaction failed';
      const message = String(rawMsg);
      const errorMessage = message.toLowerCase();

      // Try to surface revert payloads when available
      const rawData = (error && (error.data || (error.error && error.error.data) || (error.revert && error.revert.data) || (error.receipt && error.receipt.revert && error.receipt.revert.data))) || null;
      if (typeof rawData === 'string' && rawData.startsWith('0x')) {
        const decoded = this._decodeRevertData(rawData);
        if (decoded) {
          return new ContractRevertError(`Smart contract reverted: ${decoded}`, decoded);
        }
      }

      // If receipt exists and status === 0 but no revert payload
      const receipt = error && (error.receipt || error.transactionReceipt || null);
      if (receipt && receipt.status === 0 && !rawData) {
        return new ContractRevertError('Transaction reverted without a reason string', null);
      }

      // Map to specific error types
      if (error && (error.code === 'ACTION_REJECTED' || errorMessage.includes('user denied') || errorMessage.includes('user rejected'))) {
        return new UserRejectedError(message);
      }

      if (errorMessage.includes('insufficient funds')) {
        return new InsufficientFundsError(message);
      }

      if (errorMessage.includes('nonce too low') || errorMessage.includes('replacement transaction underpriced')) {
        return new NonceError(message);
      }

      if (errorMessage.includes('smart contract logic reverted') || errorMessage.includes('execution reverted')) {
        return new ContractRevertError(message, error && error.reason);
      }

      if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
        return new NetworkError(message);
      }

      // Default Web3 error
      return new Web3Error(message, error, error && error.code);
    } catch (err) {
      // If formatting itself errors, return a generic Web3Error
      logger.error('Error while formatting transaction error:', err);
      return new Web3Error('Transaction failed');
    }
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

      const contractNames = ['HealthLink', 'PatientRecords', 'Appointments', 'Prescriptions', 'DoctorCredentials', 'InsuranceClaims'];

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
    if (!rec) { return { exists: false }; }
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
    if (contract) {
      // Ensure contract instance is connected to the current signer
      const contractWithSigner = contract.connect(this.signer);

      // Explicit gas estimation for better diagnostics
      logger.info('createPatient args (raw):', { patientAddress, name, age, gender, ipfsHash });
      [patientAddress, name, age, gender, ipfsHash].forEach((a, i) => {
        if (typeof a === 'undefined') {
          logger.error(`createPatient arg index ${i} is undefined`);
        }
      });

      try {
        // Prefer method-specific estimate via the function itself (works with ethers v6)
        if (contractWithSigner.createPatient && contractWithSigner.createPatient.estimateGas) {
          const gasEstimate = await contractWithSigner.createPatient.estimateGas(patientAddress, name, age, gender, ipfsHash);
          logger.info('createPatient gas estimate (via method):', gasEstimate.toString());
        } else if (contractWithSigner.estimateGas && contractWithSigner.estimateGas.createPatient) {
          const gasEstimate = await contractWithSigner.estimateGas.createPatient(patientAddress, name, age, gender, ipfsHash);
          logger.info('createPatient gas estimate (via contract.estimateGas):', gasEstimate.toString());
        } else {
          logger.warn('No estimateGas helper found on contract for createPatient; skipping explicit estimation');
        }
      } catch (err) {
        logger.error('createPatient gas estimation failed:', err);

        // Provide more context if the error is related to ABI param resolution
        if (err && err.message && err.message.includes('reading')) {
          logger.error('createPatient gas estimation: one or more arguments may be invalid for the ABI. Args types:', {
            patientAddressType: typeof patientAddress,
            nameType: typeof name,
            ageType: typeof age,
            genderType: typeof gender,
            ipfsHashType: typeof ipfsHash,
          });
        }

        // Attempt to proceed by sending the transaction with a conservative gasLimit
        try {
          logger.warn('Proceeding to send createPatient transaction with fallback gasLimit (400000) despite estimateGas failure');
          const tx = await contractWithSigner.createPatient(patientAddress, name, age, gender, ipfsHash, { gasLimit: 400000 });
          return await this.waitForTransaction(tx);
        } catch (txErr) {
          logger.error('createPatient transaction failed after estimateGas error:', txErr);

          // Try to replay as eth_call to extract revert reason
          try {
            const encoded = contractWithSigner.interface.encodeFunctionData('createPatient', [patientAddress, name, age, gender, ipfsHash]);
            const callData = await this.provider.call({ from: await this.signer.getAddress(), to: contractWithSigner.target || contractWithSigner.address, data: encoded });
            if (callData && callData !== '0x') {
              logger.error('Revert data from provider.call replay (unexpected non-empty):', callData);
              logger.error('Decoded revert:', this.formatError({ message: null, data: callData }));
            } else {
              logger.error('provider.call did not return data; attempting to catch call exception');
            }
          } catch (replayErr) {
            const raw = replayErr?.data || replayErr?.error?.data || replayErr?.reason || replayErr?.message || null;
            if (typeof raw === 'string' && raw.startsWith('0x')) {
              logger.error('Decoded revert from replay:', decodeRevertData(raw, contractWithSigner));
            } else {
              logger.error('Replay call failed to return revert payload:', replayErr.message || replayErr);
            }
          }

          throw txErr;
        }
      }

      return await this.sendTransaction(
        contractWithSigner.createPatient,
        patientAddress,
        name,
        age,
        gender,
        ipfsHash,
      );
    }

    throw new Error('HealthLink contract not available');
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
      if (!apt) { return null; }
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
    if (!apt) { return null; }
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

    // Coerce status string to contract enum number if needed
    let statusArg = status;
    if (typeof status === 'string') {
      const mapping = {
        SCHEDULED: 0,
        CONFIRMED: 1,
        COMPLETED: 2,
        CANCELLED: 3,
        NO_SHOW: 3,
      };
      const key = status.toUpperCase();
      if (mapping[key] !== undefined) {
        statusArg = mapping[key];
      } else if (!isNaN(Number(status))) {
        statusArg = Number(status);
      } else {
        throw new Error('Unknown appointment status: ' + status);
      }
    }

    if (contract) {
      return await this.sendTransaction(
        contract.updateAppointmentStatus,
        appointmentId,
        statusArg,
      );
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) { throw new Error('Appointment not found'); }
    apt.status = statusArg;
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
        notes || '',
      );
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) { throw new Error('Appointment not found'); }
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
        prescriptionId, patientId, doctorId, medArgSample: (medArg || '').slice(0, 200), dosageArg, instructionsArg, expiryArg, err: err.message,
      });
      throw err;
    }
  }

  /**
   * Validate ethereum address (simple check)
   */
  isValidEthAddress(address) {
    if (!address || typeof address !== 'string') { return false; }
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
      if (!rx) { return null; }
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
    if (!p) { return null; }
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

  /**
   * Get audit records from HealthLink contract (recent first)
   * Returns an array of { actor, action, patientId, timestamp }
   */
  async getAuditRecords(limit = 10) {
    const contract = this.getContract('HealthLink');
    if (!contract) {
      throw new Error('HealthLink contract not available');
    }

    const records = [];
    for (let i = 0; i < limit; i++) {
      try {
        const record = await contract.getAuditRecord(i);
        // record.timestamp may be a BigInt-like object or number
        const ts = record && (record.timestamp !== undefined) ? Number(record.timestamp) : 0;
        if (ts > 0) {
          records.push({
            actor: record.actor,
            action: record.action,
            patientId: record.patientId,
            timestamp: ts,
          });
        } else {
          // No more records — break early
          break;
        }
      } catch (err) {
        // If contract throws (index out of bounds), stop iterating
        break;
      }
    }

    return records;
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

  // ====== Insurance Claims Contract Methods ======

  /**
   * Submit insurance claim to blockchain
   * @param {string} claimId - Unique claim identifier
   * @param {string} policyNumber - Insurance policy number
   * @param {string} patientId - Patient blockchain ID
   * @param {string} providerId - Hospital/doctor ID
   * @param {number} claimedAmount - Amount claimed (in wei)
   * @param {string[]} supportingDocs - Array of IPFS hashes
   */
  async submitInsuranceClaim(claimId, policyNumber, patientId, providerId, claimedAmount, supportingDocs = []) {
    const contract = this.getContract('InsuranceClaims');
    if (!contract) {
      logger.warn('InsuranceClaims contract not available, skipping blockchain submission');
      return null;
    }

    try {
      // Convert amount to wei if it's not already
      const amountInWei = typeof claimedAmount === 'string' ?
        claimedAmount :
        Math.floor(claimedAmount * 100); // Store as cents for precision

      return await this.sendTransaction(
        contract.submitClaim,
        claimId,
        policyNumber,
        patientId,
        providerId,
        amountInWei,
        supportingDocs,
      );
    } catch (error) {
      logger.error('Failed to submit claim to blockchain:', error);
      throw error;
    }
  }

  /**
   * Verify insurance claim on blockchain
   * @param {string} claimId - Claim identifier
   */
  async verifyInsuranceClaim(claimId) {
    const contract = this.getContract('InsuranceClaims');
    if (!contract) {
      logger.warn('InsuranceClaims contract not available');
      return null;
    }

    try {
      return await this.sendTransaction(contract.verifyClaim, claimId);
    } catch (error) {
      logger.error('Failed to verify claim on blockchain:', error);
      throw error;
    }
  }

  /**
   * Approve insurance claim on blockchain
   * @param {string} claimId - Claim identifier
   * @param {number} approvedAmount - Approved amount (in wei)
   */
  async approveInsuranceClaim(claimId, approvedAmount) {
    const contract = this.getContract('InsuranceClaims');
    if (!contract) {
      logger.warn('InsuranceClaims contract not available');
      return null;
    }

    try {
      // Convert amount to wei if needed
      const amountInWei = typeof approvedAmount === 'string' ?
        approvedAmount :
        Math.floor(approvedAmount * 100);

      return await this.sendTransaction(
        contract.approveClaim,
        claimId,
        amountInWei,
      );
    } catch (error) {
      logger.error('Failed to approve claim on blockchain:', error);
      throw error;
    }
  }

  /**
   * Reject insurance claim on blockchain
   * @param {string} claimId - Claim identifier
   * @param {string} reason - Rejection reason
   */
  async rejectInsuranceClaim(claimId, reason) {
    const contract = this.getContract('InsuranceClaims');
    if (!contract) {
      logger.warn('InsuranceClaims contract not available');
      return null;
    }

    try {
      return await this.sendTransaction(
        contract.rejectClaim,
        claimId,
        reason || 'No reason provided',
      );
    } catch (error) {
      logger.error('Failed to reject claim on blockchain:', error);
      throw error;
    }
  }

  /**
   * Get insurance claim from blockchain
   * @param {string} claimId - Claim identifier
   */
  async getInsuranceClaim(claimId) {
    const contract = this.getContract('InsuranceClaims');
    if (!contract) {
      return null;
    }

    try {
      const claim = await contract.getClaim(claimId);
      return {
        claimId: claim.claimId,
        policyNumber: claim.policyNumber,
        patientId: claim.patientId,
        providerId: claim.providerId,
        claimedAmount: claim.claimedAmount.toString(),
        approvedAmount: claim.approvedAmount.toString(),
        status: Number(claim.status),
        supportingDocuments: claim.supportingDocuments,
        submittedBy: claim.submittedBy,
        verifiedBy: claim.verifiedBy,
        approvedBy: claim.approvedBy,
        submittedAt: Number(claim.submittedAt),
        updatedAt: Number(claim.updatedAt),
        rejectionReason: claim.rejectionReason,
        exists: claim.exists,
      };
    } catch (error) {
      logger.error('Failed to get claim from blockchain:', error);
      return null;
    }
  }

  // ====== Pharmacy Integration (Prescriptions Contract) ======

  /**
   * Verify prescription QR code hash on blockchain
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} qrHash - QR code hash to verify
   */
  async verifyPrescriptionQR(prescriptionId, qrHash) {
    const contract = this.getContract('Prescriptions');
    if (!contract) {
      logger.warn('Prescriptions contract not available');
      return null;
    }

    try {
      const isValid = await contract.verifyPrescriptionQR(prescriptionId, qrHash);
      return isValid;
    } catch (error) {
      logger.error('Failed to verify prescription QR on blockchain:', error);
      return false;
    }
  }

  /**
   * Fill prescription on blockchain (mark as dispensed)
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} pharmacistId - Pharmacist ID who is dispensing
   */
  async fillPrescription(prescriptionId, pharmacistId) {
    const contract = this.getContract('Prescriptions');
    if (!contract) {
      logger.warn('Prescriptions contract not available');
      return null;
    }

    try {
      return await this.sendTransaction(
        contract.fillPrescription,
        prescriptionId,
        pharmacistId,
      );
    } catch (error) {
      logger.error('Failed to fill prescription on blockchain:', error);
      throw error;
    }
  }
}

// Export singleton instance
const ethereumService = new EthereumService();
export default ethereumService;
