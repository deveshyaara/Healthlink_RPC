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
    // In-memory fallback stores when contracts are not deployed locally
    this._stores = {
      records: new Map(), // recordId -> record
      prescriptions: new Map(), // prescriptionId -> prescription
      appointments: new Map(), // appointmentId -> appointment
    };
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
    const all = Array.from(this._stores.records.values()).filter(r => r.patientId === patientId);
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
    const tx = await contract.updateRecordMetadata(recordId, JSON.stringify(metadata));
    return await this.waitForTransaction(tx);
  }

  async deleteRecord(recordId) {
    const contract = this.getContract('PatientRecords');
    const tx = await contract.deleteRecord(recordId);
    return await this.waitForTransaction(tx);
  }

  // ====== HealthLink Contract Methods ======

  async createPatient(patientAddress, name, age, gender, ipfsHash) {
    const contract = this.getContract('HealthLink');
    const tx = await contract.createPatient(patientAddress, name, age, gender, ipfsHash);
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
    if (contract) {
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

    const all = Array.from(this._stores.appointments.values()).filter(a => a.patientId === patientId);
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

    const all = Array.from(this._stores.appointments.values()).filter(a => a.doctorId === doctorId);
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
      const tx = await contract.updateAppointmentStatus(appointmentId, status);
      return await this.waitForTransaction(tx);
    }

    const apt = this._stores.appointments.get(appointmentId);
    if (!apt) {throw new Error('Appointment not found');}
    apt.status = status;
    apt.updatedAt = Date.now();
    this._stores.appointments.set(appointmentId, apt);
    return { transactionHash: `local-update-apt-${appointmentId}-${apt.updatedAt}`, blockNumber: 0, gasUsed: '0', status: 'success' };
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

    const all = Array.from(this._stores.prescriptions.values()).filter(p => p.patientId === patientId);
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

    const all = Array.from(this._stores.prescriptions.values()).filter(p => p.doctorId === doctorId);
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
