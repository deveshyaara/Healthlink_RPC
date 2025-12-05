import { getGatewayInstance } from './fabricGateway.service.js';
import logger from '../utils/logger.js';
import { BlockchainError, NotFoundError } from '../utils/errors.js';

/**
 * TransactionService
 * Business logic layer for blockchain transactions
 * Handles submit, query, and history operations
 */
class TransactionService {
  /**
   * Submit a transaction to write data to the ledger
   * @param {string} functionName - Chaincode function name
   * @param {Array} args - Function arguments
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Transaction result with metadata
   */
  async submitTransaction(functionName, args = [], userId = null) {
    try {
      logger.info(`Service: Submitting transaction ${functionName}`, { args, userId });
      
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.submitTransaction(functionName, ...args);
      
      return {
        success: true,
        data: result,
        functionName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Service: Transaction ${functionName} failed:`, error);
      throw error;
    }
  }

  /**
   * Submit transaction with transient/private data
   * @param {string} functionName - Chaincode function name
   * @param {Object} transientData - Private/transient data
   * @param {Array} args - Function arguments
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Transaction result
   */
  async submitPrivateTransaction(functionName, transientData, args = [], userId = null) {
    try {
      logger.info(`Service: Submitting private transaction ${functionName}`, { userId });
      
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.submitTransactionWithTransient(
        functionName,
        transientData,
        ...args
      );
      
      return {
        success: true,
        data: result,
        functionName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Service: Private transaction ${functionName} failed:`, error);
      throw error;
    }
  }

  /**
   * Query data from the ledger (read-only)
   * @param {string} functionName - Chaincode function name
   * @param {Array} args - Function arguments
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Query result
   */
  async queryLedger(functionName, args = [], userId = null) {
    try {
      logger.info(`Service: Querying ledger ${functionName}`, { args, userId });
      
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.evaluateTransaction(functionName, ...args);
      
      return {
        success: true,
        data: result,
        functionName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Service: Query ${functionName} failed:`, error);
      
      // Handle asset not found specifically
      if (error.message && error.message.includes('does not exist')) {
        throw new NotFoundError('Asset');
      }
      
      throw error;
    }
  }

  /**
   * Get asset history from the ledger
   * @param {string} assetId - Asset identifier
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Asset history
   */
  async getAssetHistory(assetId, userId = null) {
    try {
      logger.info(`Service: Getting asset history for ${assetId}`, { userId });
      
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.evaluateTransaction('GetAssetHistory', assetId);
      
      // Process history to make it more readable
      const history = Array.isArray(result) ? result : [];
      
      return {
        success: true,
        assetId,
        historyCount: history.length,
        data: history,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Service: Get asset history failed for ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get all assets (paginated)
   * @param {number} pageSize - Number of records per page
   * @param {string} bookmark - Pagination bookmark
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Paginated assets
   */
  async getAllAssets(pageSize = 10, bookmark = '', userId = null) {
    try {
      logger.info('Service: Getting all assets', { pageSize, bookmark, userId });
      
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.evaluateTransaction(
        'GetAllAssets',
        pageSize.toString(),
        bookmark
      );
      
      return {
        success: true,
        data: result,
        pageSize,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: Get all assets failed:', error);
      throw error;
    }
  }

  /**
   * Query assets with rich query (CouchDB)
   * @param {Object} queryObject - Rich query object
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Query results
   */
  async queryAssets(queryObject, userId = null) {
    try {
      logger.info('Service: Executing rich query', { queryObject, userId });
      
      const queryString = JSON.stringify(queryObject);
      const gateway = await getGatewayInstance(userId);
      const result = await gateway.evaluateTransaction('QueryAssets', queryString);
      
      return {
        success: true,
        query: queryObject,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Service: Rich query failed:', error);
      throw error;
    }
  }

  /**
   * Create a new asset
   * @param {Object} assetData - Asset data
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Created asset
   */
  async createAsset(assetData, userId = null) {
    try {
      logger.info('Service: Creating new asset', { assetData, userId });
      
      const { id, ...attributes } = assetData;
      const args = [id, JSON.stringify(attributes)];
      
      return await this.submitTransaction('CreateAsset', args, userId);
    } catch (error) {
      logger.error('Service: Create asset failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing asset
   * @param {string} assetId - Asset ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Updated asset
   */
  async updateAsset(assetId, updateData, userId = null) {
    try {
      logger.info(`Service: Updating asset ${assetId}`, { updateData, userId });
      
      const args = [assetId, JSON.stringify(updateData)];
      return await this.submitTransaction('UpdateAsset', args, userId);
    } catch (error) {
      logger.error(`Service: Update asset ${assetId} failed:`, error);
      throw error;
    }
  }

  /**
   * Delete an asset
   * @param {string} assetId - Asset ID
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAsset(assetId, userId = null) {
    try {
      logger.info(`Service: Deleting asset ${assetId}`, { userId });
      
      return await this.submitTransaction('DeleteAsset', [assetId], userId);
    } catch (error) {
      logger.error(`Service: Delete asset ${assetId} failed:`, error);
      throw error;
    }
  }
}

// Singleton instance
const transactionService = new TransactionService();

export default transactionService;
