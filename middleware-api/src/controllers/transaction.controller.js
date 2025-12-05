import transactionService from '../services/transaction.service.js';
import { addTransactionToQueue, getJobStatus } from '../queue/transaction.queue.js';
import logger from '../utils/logger.js';

/**
 * TransactionController
 * Handles HTTP requests for blockchain transactions
 * Delegates business logic to TransactionService
 */
class TransactionController {
  /**
   * Submit a transaction (write to ledger)
   * POST /api/v1/transactions
   */
  async submitTransaction(req, res, next) {
    try {
      const { functionName, args, userId, async } = req.body;

      // If async is true, add to queue
      if (async) {
        const job = await addTransactionToQueue('submit', functionName, args, userId);
        return res.status(202).json({
          success: true,
          message: 'Transaction queued for processing',
          jobId: job.jobId,
          status: job.status,
        });
      }

      // Synchronous processing
      const result = await transactionService.submitTransaction(functionName, args, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit transaction with private/transient data
   * POST /api/v1/transactions/private
   */
  async submitPrivateTransaction(req, res, next) {
    try {
      const { functionName, transientData, args, userId } = req.body;

      const result = await transactionService.submitPrivateTransaction(
        functionName,
        transientData,
        args,
        userId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Query the ledger (read-only)
   * POST /api/v1/query
   */
  async queryLedger(req, res, next) {
    try {
      const { functionName, args, userId } = req.body;

      const result = await transactionService.queryLedger(functionName, args, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get asset history
   * GET /api/v1/history/:assetId
   */
  async getAssetHistory(req, res, next) {
    try {
      const { assetId } = req.params;
      const { userId } = req.query;

      const result = await transactionService.getAssetHistory(assetId, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all assets (paginated)
   * GET /api/v1/assets
   */
  async getAllAssets(req, res, next) {
    try {
      const { pageSize, bookmark, userId } = req.query;

      const result = await transactionService.getAllAssets(
        parseInt(pageSize) || 10,
        bookmark || '',
        userId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Query assets with rich query (CouchDB)
   * POST /api/v1/assets/query
   */
  async queryAssets(req, res, next) {
    try {
      const { selector, fields, sort, limit, skip, userId } = req.body;

      const queryObject = {
        selector,
        ...(fields && { fields }),
        ...(sort && { sort }),
        ...(limit && { limit }),
        ...(skip && { skip }),
      };

      const result = await transactionService.queryAssets(queryObject, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job status (for async transactions)
   * GET /api/v1/jobs/:jobId
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      const status = await getJobStatus(jobId);

      res.status(200).json({
        success: true,
        job: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create asset (convenience method)
   * POST /api/v1/assets
   */
  async createAsset(req, res, next) {
    try {
      const assetData = req.body;
      const { userId } = req.query;

      const result = await transactionService.createAsset(assetData, userId);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update asset (convenience method)
   * PUT /api/v1/assets/:assetId
   */
  async updateAsset(req, res, next) {
    try {
      const { assetId } = req.params;
      const updateData = req.body;
      const { userId } = req.query;

      const result = await transactionService.updateAsset(assetId, updateData, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete asset (convenience method)
   * DELETE /api/v1/assets/:assetId
   */
  async deleteAsset(req, res, next) {
    try {
      const { assetId } = req.params;
      const { userId } = req.query;

      const result = await transactionService.deleteAsset(assetId, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

const transactionController = new TransactionController();
export default transactionController;
