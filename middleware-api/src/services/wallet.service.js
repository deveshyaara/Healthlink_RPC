import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { BlockchainError } from '../utils/errors.js';

/**
 * WalletService for Ethereum
 * Manages user Ethereum wallets and private keys
 */
class WalletService {
  constructor() {
    this.wallets = new Map(); // userId -> wallet data
    this.walletPath = null;
  }

  /**
   * Initialize wallet service
   */
  async initialize() {
    try {
      // Resolve wallet path to absolute path
      this.walletPath = path.resolve('./wallets');

      // Ensure wallet directory exists
      if (!fs.existsSync(this.walletPath)) {
        fs.mkdirSync(this.walletPath, { recursive: true });
        logger.info(`Created wallet directory at: ${this.walletPath}`);
      }

      // Load existing wallets
      await this.loadWallets();

      logger.info('Ethereum Wallet Service initialized successfully');
      return this;
    } catch (error) {
      logger.error('Failed to initialize wallet service:', error);
      throw new BlockchainError('Wallet initialization failed', error);
    }
  }

  /**
   * Load existing wallets from disk
   */
  async loadWallets() {
    try {
      const walletFiles = fs.readdirSync(this.walletPath).filter(file => file.endsWith('.json'));

      for (const file of walletFiles) {
        const userId = file.replace('.json', '');
        const walletData = JSON.parse(fs.readFileSync(path.join(this.walletPath, file), 'utf8'));
        this.wallets.set(userId, walletData);
      }

      logger.info(`Loaded ${this.wallets.size} existing wallets`);
    } catch (error) {
      logger.warn('Failed to load existing wallets:', error.message);
    }
  }

  /**
   * Save wallet to disk
   */
  async saveWallet(userId, walletData) {
    const filePath = path.join(this.walletPath, `${userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2));
  }

  /**
   * Create admin wallet (for system operations)
   */
  async enrollAdmin() {
    try {
      const adminId = 'admin';

      // Check if admin already exists
      if (this.wallets.has(adminId)) {
        logger.info('Admin wallet already exists');
        return { message: 'Admin already exists', userId: adminId };
      }

      // Create new admin wallet
      const wallet = ethers.Wallet.createRandom();

      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      this.wallets.set(adminId, walletData);
      await this.saveWallet(adminId, walletData);

      logger.info('Admin wallet created successfully');

      return { message: 'Admin wallet created successfully', userId: adminId, address: wallet.address };
    } catch (error) {
      logger.error('Failed to create admin wallet:', error);
      throw new BlockchainError('Admin wallet creation failed', error);
    }
  }

  /**
   * Create a new user wallet
   * @param {string} userId - User ID to register
   * @param {string} role - User role (default: 'patient')
   */
  async registerUser(userId, role = 'patient') {
    try {
      // Check if user already exists
      if (this.wallets.has(userId)) {
        logger.info(`User ${userId} already exists in wallet`);
        return { message: 'User already registered', userId };
      }

      // Create new user wallet
      const wallet = ethers.Wallet.createRandom();

      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        role: role,
        createdAt: new Date().toISOString(),
      };

      this.wallets.set(userId, walletData);
      await this.saveWallet(userId, walletData);

      logger.info(`User ${userId} wallet created successfully`);

      return {
        message: 'User wallet created successfully',
        userId,
        address: wallet.address,
        role,
      };
    } catch (error) {
      logger.error(`Failed to create user wallet ${userId}:`, error);
      throw new BlockchainError(`User wallet creation failed for ${userId}`, error);
    }
  }

  /**
   * Get user wallet information
   * @param {string} userId - User ID
   */
  async getIdentity(userId) {
    try {
      const walletData = this.wallets.get(userId);
      if (!walletData) {
        return null;
      }

      // Return wallet info without private key
      return {
        userId,
        address: walletData.address,
        role: walletData.role,
        createdAt: walletData.createdAt,
      };
    } catch (error) {
      logger.error(`Failed to get wallet for ${userId}:`, error);
      throw new BlockchainError(`Failed to retrieve wallet for ${userId}`, error);
    }
  }

  /**
   * Get user's private key (use with caution!)
   * @param {string} userId - User ID
   */
  async getPrivateKey(userId) {
    try {
      const walletData = this.wallets.get(userId);
      if (!walletData) {
        throw new BlockchainError(`Wallet not found for user ${userId}`);
      }
      return walletData.privateKey;
    } catch (error) {
      logger.error(`Failed to get private key for ${userId}:`, error);
      throw new BlockchainError(`Failed to retrieve private key for ${userId}`, error);
    }
  }

  /**
   * List all wallets
   */
  async listIdentities() {
    try {
      const identities = [];
      for (const [userId, walletData] of this.wallets) {
        identities.push({
          userId,
          address: walletData.address,
          role: walletData.role,
          createdAt: walletData.createdAt,
        });
      }
      return identities;
    } catch (error) {
      logger.error('Failed to list wallets:', error);
      throw new BlockchainError('Failed to list wallets', error);
    }
  }

  /**
   * Remove user wallet
   * @param {string} userId - User ID
   */
  async removeIdentity(userId) {
    try {
      if (!this.wallets.has(userId)) {
        throw new BlockchainError(`Wallet not found for user ${userId}`);
      }

      this.wallets.delete(userId);

      // Remove from disk
      const filePath = path.join(this.walletPath, `${userId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info(`Wallet ${userId} removed successfully`);
      return { message: `Wallet ${userId} removed successfully` };
    } catch (error) {
      logger.error(`Failed to remove wallet ${userId}:`, error);
      throw new BlockchainError(`Failed to remove wallet ${userId}`, error);
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
