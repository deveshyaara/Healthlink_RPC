import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import fabricConfig from '../config/fabric-config.js';
import logger from '../utils/logger.js';
import { BlockchainError } from '../utils/errors.js';

/**
 * WalletService
 * Manages user identities and wallet operations
 */
class WalletService {
  constructor() {
    this.wallet = null;
    this.caClient = null;
  }

  /**
   * Initialize wallet and CA client
   */
  async initialize() {
    try {
      // Resolve wallet path to absolute path
      const walletPath = path.resolve(config.wallet.path);

      // Ensure wallet directory exists
      if (!fs.existsSync(walletPath)) {
        fs.mkdirSync(walletPath, { recursive: true });
        logger.info(`Created wallet directory at: ${walletPath}`);
      }

      // Create wallet instance
      this.wallet = await Wallets.newFileSystemWallet(walletPath);
      logger.info(`Wallet initialized at: ${walletPath}`);

      // Initialize CA client with absolute path
      const connectionProfilePath = path.resolve(config.fabric.connectionProfilePath);
      const connectionProfile = JSON.parse(
        fs.readFileSync(connectionProfilePath, 'utf8'),
      );

      const caInfo = connectionProfile.certificateAuthorities[
        Object.keys(connectionProfile.certificateAuthorities)[0]
      ];
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      this.caClient = new FabricCAServices(
        caInfo.url,
        { trustedRoots: caTLSCACerts, verify: false },
        caInfo.caName,
      );

      logger.info('CA Client initialized');
      return this;
    } catch (error) {
      logger.error('Failed to initialize wallet service:', error);
      throw new BlockchainError('Wallet initialization failed', error);
    }
  }

  /**
   * Enroll admin user
   */
  async enrollAdmin() {
    try {
      const adminId = config.wallet.adminUserId;

      // Check if admin already enrolled
      const identity = await this.wallet.get(adminId);
      if (identity) {
        logger.info('Admin identity already exists in wallet');
        return { message: 'Admin already enrolled', userId: adminId };
      }

      // Enroll the admin user
      const enrollment = await this.caClient.enroll({
        enrollmentID: 'admin',
        enrollmentSecret: 'adminpw',
      });

      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: fabricConfig.getDefaultMspId(),
        type: 'X.509',
      };

      await this.wallet.put(adminId, x509Identity);
      logger.info('Admin enrolled successfully');

      return { message: 'Admin enrolled successfully', userId: adminId };
    } catch (error) {
      logger.error('Failed to enroll admin:', error);
      throw new BlockchainError('Admin enrollment failed', error);
    }
  }

  /**
   * Register and enroll a new user
   * @param {string} userId - User ID to register
   * @param {string} role - User role (default: 'client')
   * @param {string} affiliation - User affiliation
   */
  async registerUser(userId, role = 'client', affiliation = 'org1.department1') {
    try {
      // Check if user already exists
      const userIdentity = await this.wallet.get(userId);
      if (userIdentity) {
        logger.info(`User ${userId} already exists in wallet`);
        return { message: 'User already registered', userId };
      }

      // Get admin identity with proper error handling
      const adminId = config.wallet.adminUserId;
      const adminIdentity = await this.wallet.get(adminId);
      if (!adminIdentity) {
        const error = new BlockchainError('Admin identity not found. Please enroll admin first.');
        error.type = 'IDENTITY_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      // Build a user object for authenticating with the CA
      const provider = this.wallet.getProviderRegistry().getProvider(adminIdentity.type);
      const adminUser = await provider.getUserContext(adminIdentity, adminId);

      // Register the user
      const secret = await this.caClient.register(
        {
          affiliation,
          enrollmentID: userId,
          role,
          attrs: [{ name: 'role', value: role, ecert: true }],
        },
        adminUser,
      );

      // Enroll the user
      const enrollment = await this.caClient.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret,
      });

      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: fabricConfig.getDefaultMspId(),
        type: 'X.509',
      };

      await this.wallet.put(userId, x509Identity);
      logger.info(`User ${userId} registered and enrolled successfully`);

      return {
        message: 'User registered successfully',
        userId,
        role,
      };
    } catch (error) {
      logger.error(`Failed to register user ${userId}:`, error);
      throw new BlockchainError(`User registration failed for ${userId}`, error);
    }
  }

  /**
   * Get user identity from wallet
   * @param {string} userId - User ID
   */
  async getIdentity(userId) {
    try {
      const identity = await this.wallet.get(userId);
      if (!identity) {
        return null;
      }
      return {
        userId,
        mspId: identity.mspId,
        type: identity.type,
      };
    } catch (error) {
      logger.error(`Failed to get identity for ${userId}:`, error);
      throw new BlockchainError(`Failed to retrieve identity for ${userId}`, error);
    }
  }

  /**
   * List all identities in wallet
   */
  async listIdentities() {
    try {
      const identities = await this.wallet.list();
      return identities.map((id) => ({
        label: id.label,
        // Don't expose sensitive credential data
      }));
    } catch (error) {
      logger.error('Failed to list identities:', error);
      throw new BlockchainError('Failed to list identities', error);
    }
  }

  /**
   * Remove user identity from wallet
   * @param {string} userId - User ID
   */
  async removeIdentity(userId) {
    try {
      await this.wallet.remove(userId);
      logger.info(`Identity ${userId} removed from wallet`);
      return { message: `Identity ${userId} removed successfully` };
    } catch (error) {
      logger.error(`Failed to remove identity ${userId}:`, error);
      throw new BlockchainError(`Failed to remove identity ${userId}`, error);
    }
  }
}

// Singleton instance
let walletServiceInstance = null;

/**
 * Get or create wallet service instance
 * @returns {Promise<WalletService>}
 */
export const getWalletServiceInstance = async () => {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
    await walletServiceInstance.initialize();
  }
  return walletServiceInstance;
};

export default WalletService;
