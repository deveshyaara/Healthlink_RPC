import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Fabric-Specific Configuration Module
 * Centralizes all Hyperledger Fabric constants and chaincode configurations
 * Zero hardcoded values - all driven by environment variables
 */

/**
 * Chaincode Registry
 * Maps logical chaincode names to their deployment IDs
 * All values come from environment variables
 */
export const CHAINCODES = {
  HEALTHLINK: {
    id: process.env.CHAINCODE_HEALTHLINK || 'healthlink',
    description: 'Main HealthLink smart contract',
  },
  PATIENT_RECORDS: {
    id: process.env.CHAINCODE_PATIENT_RECORDS || 'patient-records',
    description: 'Patient medical records management',
  },
  DOCTOR_CREDENTIALS: {
    id: process.env.CHAINCODE_DOCTOR_CREDENTIALS || 'doctor-credentials',
    description: 'Doctor certification and credentials',
  },
  APPOINTMENTS: {
    id: process.env.CHAINCODE_APPOINTMENTS || 'appointments',
    description: 'Appointment scheduling and management',
  },
  PRESCRIPTIONS: {
    id: process.env.CHAINCODE_PRESCRIPTIONS || 'prescriptions',
    description: 'Prescription issuance and tracking',
  },
};

/**
 * Fabric Network Configuration
 * All channel, MSP, and peer configurations centralized
 */
export const FABRIC_NETWORK = {
  // Channel Configuration
  channel: {
    name: process.env.CHANNEL_NAME || 'mychannel',
    description: 'Primary HealthLink blockchain channel',
  },

  // Organization Configuration
  organizations: {
    org1: {
      mspId: process.env.ORG1_MSP_ID || 'Org1MSP',
      name: process.env.ORG1_NAME || 'Org1',
      department: process.env.ORG1_DEPARTMENT || 'org1.department1',
    },
    org2: {
      mspId: process.env.ORG2_MSP_ID || 'Org2MSP',
      name: process.env.ORG2_NAME || 'Org2',
      department: process.env.ORG2_DEPARTMENT || 'org2.department1',
    },
  },

  // Peer Configuration
  peers: {
    org1: {
      endpoint: process.env.ORG1_PEER_ENDPOINT || 'localhost:7051',
      tlsEnabled: process.env.ORG1_PEER_TLS_ENABLED === 'true',
    },
    org2: {
      endpoint: process.env.ORG2_PEER_ENDPOINT || 'localhost:9051',
      tlsEnabled: process.env.ORG2_PEER_TLS_ENABLED === 'true',
    },
  },

  // Orderer Configuration
  orderer: {
    endpoint: process.env.ORDERER_ENDPOINT || 'localhost:7050',
    tlsEnabled: process.env.ORDERER_TLS_ENABLED === 'true',
  },

  // Certificate Authority Configuration
  ca: {
    org1: {
      url: process.env.ORG1_CA_URL || 'https://localhost:7054',
      name: process.env.ORG1_CA_NAME || 'ca-org1',
    },
    org2: {
      url: process.env.ORG2_CA_URL || 'https://localhost:8054',
      name: process.env.ORG2_CA_NAME || 'ca-org2',
    },
  },
};

/**
 * Connection Profile Configuration
 * Path resolution for Fabric connection profiles
 */
export const CONNECTION_PROFILES = {
  default: process.env.CONNECTION_PROFILE_PATH || 
    path.resolve(__dirname, '../../connection-profile.json'),
  org1: process.env.ORG1_CONNECTION_PROFILE_PATH || 
    path.resolve(__dirname, '../../connection-org1.json'),
  org2: process.env.ORG2_CONNECTION_PROFILE_PATH || 
    path.resolve(__dirname, '../../connection-org2.json'),
};

/**
 * Wallet Configuration
 * Identity storage and management paths
 */
export const WALLET_CONFIG = {
  basePath: process.env.WALLET_PATH || path.resolve(__dirname, '../../wallet'),
  adminUserId: process.env.ADMIN_USER_ID || 'admin',
  appUserId: process.env.APP_USER_ID || 'appUser',
  
  // Default credentials for admin enrollment
  admin: {
    enrollmentID: process.env.ADMIN_ENROLLMENT_ID || 'admin',
    enrollmentSecret: process.env.ADMIN_ENROLLMENT_SECRET || 'adminpw',
  },
};

/**
 * Transaction Configuration
 * Timeout and retry settings for blockchain operations
 */
export const TRANSACTION_CONFIG = {
  timeouts: {
    commit: parseInt(process.env.TX_COMMIT_TIMEOUT, 10) || 300, // 5 minutes
    endorse: parseInt(process.env.TX_ENDORSE_TIMEOUT, 10) || 30, // 30 seconds
    query: parseInt(process.env.TX_QUERY_TIMEOUT, 10) || 10, // 10 seconds
  },
  
  retry: {
    maxAttempts: parseInt(process.env.TX_MAX_RETRY_ATTEMPTS, 10) || 3,
    backoffMs: parseInt(process.env.TX_RETRY_BACKOFF_MS, 10) || 1000,
  },
};

/**
 * Gateway Connection Options Factory
 * Creates properly configured connection options for Fabric Gateway
 * 
 * @param {Object} wallet - Wallet instance
 * @param {string} userId - User identity to connect with
 * @param {boolean} isLocalhost - Whether running in localhost mode
 * @returns {Object} Gateway connection options
 */
export function createGatewayOptions(wallet, userId, isLocalhost = true) {
  return {
    wallet,
    identity: userId,
    discovery: {
      enabled: true,
      asLocalhost: isLocalhost,
    },
    eventHandlerOptions: {
      commitTimeout: TRANSACTION_CONFIG.timeouts.commit,
      endorseTimeout: TRANSACTION_CONFIG.timeouts.endorse,
    },
  };
}

/**
 * Get default organization based on environment
 * @returns {string} Default MSP ID
 */
export function getDefaultMspId() {
  const orgName = process.env.DEFAULT_ORG || 'org1';
  return FABRIC_NETWORK.organizations[orgName]?.mspId || FABRIC_NETWORK.organizations.org1.mspId;
}

/**
 * Get default chaincode name
 * @returns {string} Default chaincode ID
 */
export function getDefaultChaincode() {
  return CHAINCODES.HEALTHLINK.id;
}

/**
 * Validate Fabric configuration
 * Throws error if required configuration is missing
 */
export function validateFabricConfig() {
  const required = [
    { key: 'CHANNEL_NAME', value: FABRIC_NETWORK.channel.name },
    { key: 'DEFAULT_CHAINCODE', value: getDefaultChaincode() },
    { key: 'DEFAULT_MSP_ID', value: getDefaultMspId() },
  ];

  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const keys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing required Fabric configuration: ${keys}`);
  }
}

// Export default fabric config object for backward compatibility
export default {
  chaincodes: CHAINCODES,
  network: FABRIC_NETWORK,
  profiles: CONNECTION_PROFILES,
  wallet: WALLET_CONFIG,
  transaction: TRANSACTION_CONFIG,
  getDefaultMspId,
  getDefaultChaincode,
  createGatewayOptions,
  validateFabricConfig,
};
