import { ethers, BrowserProvider, Contract } from 'ethers';

export interface EthereumConfig {
  rpcUrl: string;
  chainId: number;
  contracts: {
    healthLink: string;
    patientRecords: string;
    appointments: string;
    prescriptions: string;
    doctorCredentials: string;
  };
}

export interface Patient {
  patientAddress: string;
  name: string;
  age: number;
  gender: string;
  ipfsHash: string;
  exists: boolean;
}

export interface MedicalRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  recordType: string;
  ipfsHash: string;
  metadata: string;
  timestamp: number;
  exists: boolean;
}

export interface Consent {
  consentId: string;
  patientId: string;
  doctorAddress: string;
  validUntil: number;
  isActive: boolean;
}

class EthereumService {
  private provider: BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: {
    healthLink: Contract | null;
    patientRecords: Contract | null;
    appointments: Contract | null;
    prescriptions: Contract | null;
    doctorCredentials: Contract | null;
  } = {
    healthLink: null,
    patientRecords: null,
    appointments: null,
    prescriptions: null,
    doctorCredentials: null,
  };

  private config: EthereumConfig = {
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337'),
    contracts: {
      healthLink: '',
      patientRecords: '',
      appointments: '',
      prescriptions: '',
      doctorCredentials: '',
    },
  };

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectWallet(): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts'
      }) as string[];

      // Initialize provider and signer
      this.provider = new BrowserProvider(window.ethereum!);
      this.signer = await this.provider.getSigner();

      // Initialize contracts
      await this.initializeContracts();

      // Check network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(
          `Please switch to the correct network (Chain ID: ${this.config.chainId})`
        );
      }

      return accounts[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to MetaMask';
      console.error('Failed to connect wallet:', error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contracts = {
      healthLink: null,
      patientRecords: null,
      appointments: null,
      prescriptions: null,
      doctorCredentials: null,
    };
  }

  /**
   * Get current connected address
   */
  async getCurrentAddress(): Promise<string | null> {
    if (!this.signer) {
      return null;
    }
    try {
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }

  /**
   * Initialize contract instances
   */
  private async initializeContracts(): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Connect wallet first.');
    }

    try {
      // Load deployment addresses
      const addressesResponse = await fetch('/contracts/deployment-addresses.json');
      const addressesData = await addressesResponse.json();

      // Extract contract addresses (handles both formats)
      const contracts = addressesData.contracts || addressesData;

      // Update config with loaded addresses
      this.config.contracts = {
        healthLink: contracts.HealthLink || contracts.healthLink,
        patientRecords: contracts.PatientRecords || contracts.patientRecords,
        appointments: contracts.Appointments || contracts.appointments,
        prescriptions: contracts.Prescriptions || contracts.prescriptions,
        doctorCredentials: contracts.DoctorCredentials || contracts.doctorCredentials,
      };

      // Load ABIs
      const [healthLinkABI, patientRecordsABI, appointmentsABI, prescriptionsABI, doctorCredentialsABI] = await Promise.all([
        fetch('/contracts/HealthLink.json').then(r => r.json()),
        fetch('/contracts/PatientRecords.json').then(r => r.json()),
        fetch('/contracts/Appointments.json').then(r => r.json()),
        fetch('/contracts/Prescriptions.json').then(r => r.json()),
        fetch('/contracts/DoctorCredentials.json').then(r => r.json()),
      ]);

      // Initialize contracts
      this.contracts.healthLink = new Contract(
        this.config.contracts.healthLink,
        healthLinkABI.abi,
        this.signer
      );

      this.contracts.patientRecords = new Contract(
        this.config.contracts.patientRecords,
        patientRecordsABI.abi,
        this.signer
      );

      this.contracts.appointments = new Contract(
        this.config.contracts.appointments,
        appointmentsABI.abi,
        this.signer
      );

      this.contracts.prescriptions = new Contract(
        this.config.contracts.prescriptions,
        prescriptionsABI.abi,
        this.signer
      );

      this.contracts.doctorCredentials = new Contract(
        this.config.contracts.doctorCredentials,
        doctorCredentialsABI.abi,
        this.signer
      );

      // eslint-disable-next-line no-console
      console.log('✅ All contracts initialized successfully');
    } catch (error) {
      console.error('Failed to load contract artifacts:', error);
      throw new Error('Failed to initialize contracts');
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(
    patientAddress: string,
    name: string,
    age: number,
    gender: string,
    ipfsHash: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.healthLink) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.healthLink.createPatient(
      patientAddress,
      name,
      age,
      gender,
      ipfsHash
    );
    return await tx.wait();
  }

  /**
   * Get patient information
   */
  async getPatient(patientAddress: string): Promise<Patient> {
    if (!this.contracts.healthLink) {
      throw new Error('Contracts not initialized');
    }

    const patient = await this.contracts.healthLink.getPatient(patientAddress);
    return {
      patientAddress: patient.patientAddress,
      name: patient.name,
      age: Number(patient.age),
      gender: patient.gender,
      ipfsHash: patient.ipfsHash,
      exists: patient.exists,
    };
  }

  /**
   * Create a medical record
   */
  async createMedicalRecord(
    recordId: string,
    patientId: string,
    doctorId: string,
    recordType: string,
    ipfsHash: string,
    metadata: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.patientRecords) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.patientRecords.createRecord(
      recordId,
      patientId,
      doctorId,
      recordType,
      ipfsHash,
      metadata
    );
    return await tx.wait();
  }

  /**
   * Get a medical record
   */
  async getMedicalRecord(recordId: string): Promise<MedicalRecord> {
    if (!this.contracts.patientRecords) {
      throw new Error('Contracts not initialized');
    }

    const record = await this.contracts.patientRecords.getRecord(recordId);
    return {
      recordId: record.recordId,
      patientId: record.patientId,
      doctorId: record.doctorId,
      recordType: record.recordType,
      ipfsHash: record.ipfsHash,
      metadata: record.metadata,
      timestamp: Number(record.timestamp),
      exists: record.exists,
    };
  }

  /**
   * Get records by patient
   */
  async getRecordsByPatient(patientId: string): Promise<string[]> {
    if (!this.contracts.patientRecords) {
      throw new Error('Contracts not initialized');
    }

    return await this.contracts.patientRecords.getRecordsByPatient(patientId);
  }

  /**
   * Create consent
   */
  async createConsent(
    consentId: string,
    patientId: string,
    doctorAddress: string,
    validityDays: number
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.healthLink) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.healthLink.createConsent(
      consentId,
      patientId,
      doctorAddress,
      validityDays
    );
    return await tx.wait();
  }

  /**
   * Get consent
   */
  async getConsent(consentId: string): Promise<Consent> {
    if (!this.contracts.healthLink) {
      throw new Error('Contracts not initialized');
    }

    const consent = await this.contracts.healthLink.getConsent(consentId);
    return {
      consentId: consent.consentId,
      patientId: consent.patientId,
      doctorAddress: consent.doctorAddress,
      validUntil: Number(consent.validUntil),
      isActive: consent.isActive,
    };
  }

  /**
   * Create an appointment
   */
  async createAppointment(
    appointmentId: string,
    patientId: string,
    doctorAddress: string,
    timestamp: number,
    reason: string,
    notes: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.appointments) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.appointments.createAppointment(
      appointmentId,
      patientId,
      doctorAddress,
      timestamp,
      reason,
      notes
    );
    return await tx.wait();
  }

  /**
   * Create a prescription
   */
  async createPrescription(
    prescriptionId: string,
    patientId: string,
    doctorAddress: string,
    medication: string,
    dosage: string,
    expiryTimestamp: number
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.prescriptions) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.prescriptions.createPrescription(
      prescriptionId,
      patientId,
      doctorAddress,
      medication,
      dosage,
      expiryTimestamp
    );
    return await tx.wait();
  }

  /**
   * Register a doctor
   */
  async registerDoctor(
    doctorAddress: string,
    name: string,
    specialization: string,
    licenseNumber: string,
    hospitalAffiliation: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contracts.doctorCredentials) {
      throw new Error('Contracts not initialized');
    }

    const tx = await this.contracts.doctorCredentials.registerDoctor(
      doctorAddress,
      name,
      specialization,
      licenseNumber,
      hospitalAffiliation
    );
    return await tx.wait();
  }

  /**
   * Get verified doctors
   */
  async getVerifiedDoctors(): Promise<string[]> {
    if (!this.contracts.doctorCredentials) {
      throw new Error('Contracts not initialized');
    }

    return await this.contracts.doctorCredentials.getVerifiedDoctors();
  }

  /**
   * Get audit records (limited to recent records)
   */
  async getAuditRecords(limit: number = 10): Promise<Array<{
    actor: string;
    action: string;
    patientId: string;
    timestamp: number;
  }>> {
    if (!this.contracts.healthLink) {
      throw new Error('Contracts not initialized');
    }

    const records = [];
    try {
      for (let i = 0; i < limit; i++) {
        const record = await this.contracts.healthLink.getAuditRecord(i);
        if (record.timestamp > 0) {
          records.push({
            actor: record.actor,
            action: record.action,
            patientId: record.patientId,
            timestamp: Number(record.timestamp),
          });
        }
      }
    } catch {
      // Reached end of records
    }

    return records;
  }
}

export const ethereumService = new EthereumService();
export default ethereumService;
