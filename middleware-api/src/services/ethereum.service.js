import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

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
  }

  /**
     * Initialize Ethereum connection
     * @param {string} providerUrl - RPC URL (default: localhost)
     * @param {string} privateKey - Private key for signing transactions
     */
  async initialize(providerUrl = 'http://127.0.0.1:8545', privateKey = null) {
    try {
      // Connect to provider
      this.provider = new ethers.JsonRpcProvider(providerUrl);

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

      // Load contract addresses and ABIs
      await this.loadContracts();

      this.initialized = true;
      logger.info('✅ Ethereum Service initialized successfully');
      logger.info('Connected to: %o', await this.provider.getNetwork());
      logger.info('Signer address: %s', await this.signer.getAddress());

      return true;
    } catch (error) {
      logger.error('Failed to initialize Ethereum Service:', error);
      throw error;
    }
  }

  /**
     * Load contract addresses and ABIs
     */
  async loadContracts() {
    try {
      // Load deployment addresses
      const deploymentPath = path.join(__dirname, '..', '..', 'contracts', 'deployment-addresses.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

      // Load contract ABIs
      const artifactsPath = path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts');

      const contractNames = ['HealthLink', 'PatientRecords', 'Appointments', 'Prescriptions', 'DoctorCredentials'];

      for (const name of contractNames) {
        const abiPath = path.join(artifactsPath, `${name}.sol`, `${name}.json`);
        const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

        const contractAddress = deploymentData.contracts[name];

        this.contracts[name] = new ethers.Contract(
          contractAddress,
          artifact.abi,
          this.signer,
        );
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
    if (!this.contracts[name]) {
      throw new Error(`Contract ${name} not found`);
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
    const tx = await contract.createRecord(
      recordId,
      patientId,
      doctorId,
      recordType,
      ipfsHash,
      JSON.stringify(metadata),
    );
    return await this.waitForTransaction(tx);
  }

  async getMedicalRecord(recordId) {
    const contract = this.getContract('PatientRecords');
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
  }

  async getRecordsByPatient(patientId) {
    const contract = this.getContract('PatientRecords');
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
  }

  async updateRecordMetadata(recordId, metadata) {
    const contract = this.getContract('PatientRecords');
    const tx = await contract.updateRecordMetadata(recordId, JSON.stringify(metadata));
    return await this.waitForTransaction(tx);
  }

  async deleteRecord(recordId) {
    const contract = this.getContract('PatientRecords');
    const tx = await contract.deleteRecord(recordId);
    return await this.waitForTransaction(tx);
  }

  // ====== HealthLink Contract Methods ======

  async createPatient(patientId, publicData) {
    const contract = this.getContract('HealthLink');
    const tx = await contract.createPatient(patientId, JSON.stringify(publicData));
    return await this.waitForTransaction(tx);
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

  async createConsent(consentId, patientId, granteeAddress, scope, purpose, validUntil) {
    const contract = this.getContract('HealthLink');
    const tx = await contract.createConsent(
      consentId,
      patientId,
      granteeAddress,
      scope,
      purpose,
      validUntil,
    );
    return await this.waitForTransaction(tx);
  }

  async revokeConsent(consentId) {
    const contract = this.getContract('HealthLink');
    const tx = await contract.revokeConsent(consentId);
    return await this.waitForTransaction(tx);
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
    const tx = await contract.createAppointment(
      appointmentId,
      patientId,
      doctorId,
      appointmentDate,
      reason,
      notes,
    );
    return await this.waitForTransaction(tx);
  }

  async getAppointmentsByPatient(patientId) {
    const contract = this.getContract('Appointments');
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
  }

  async getAppointmentsByDoctor(doctorId) {
    const contract = this.getContract('Appointments');
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
  }

  async updateAppointmentStatus(appointmentId, status) {
    const contract = this.getContract('Appointments');
    const tx = await contract.updateAppointmentStatus(appointmentId, status);
    return await this.waitForTransaction(tx);
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
    } catch (err) {
      logger.error('createPrescription contract call failed', {
        prescriptionId, patientId, doctorId, medArgSample: (medArg || '').slice(0,200), dosageArg, instructionsArg, expiryArg, err: err.message,
      });
      throw err;
    }
  }

  async getPrescriptionsByPatient(patientId) {
    const contract = this.getContract('Prescriptions');
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
  }

  async getPrescriptionsByDoctor(doctorId) {
    const contract = this.getContract('Prescriptions');
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
