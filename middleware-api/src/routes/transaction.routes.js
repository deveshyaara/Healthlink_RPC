import express from 'express';
import transactionController from '../controllers/transaction.controller.js';
import validate, { schemas } from '../middleware/validator.js';

const router = express.Router();

/**
 * @route   POST /api/v1/transactions
 * @desc    Submit a transaction to the ledger
 * @access  Public
 */
router.post(
  '/transactions',
  validate(schemas.submitTransaction),
  transactionController.submitTransaction.bind(transactionController),
);

/**
 * @route   POST /api/v1/transactions/private
 * @desc    Submit a transaction with private/transient data
 * @access  Public
 */
router.post(
  '/transactions/private',
  validate(schemas.submitPrivateTransaction),
  transactionController.submitPrivateTransaction.bind(transactionController),
);

/**
 * @route   POST /api/v1/query
 * @desc    Query the ledger (read-only)
 * @access  Public
 */
router.post(
  '/query',
  validate(schemas.queryLedger),
  transactionController.queryLedger.bind(transactionController),
);

/**
 * @route   GET /api/v1/history/:assetId
 * @desc    Get asset history
 * @access  Public
 */
router.get(
  '/history/:assetId',
  validate(schemas.assetId, 'params'),
  transactionController.getAssetHistory.bind(transactionController),
);

/**
 * @route   GET /api/v1/assets
 * @desc    Get all assets (paginated)
 * @access  Public
 */
router.get(
  '/assets',
  validate(schemas.pagination, 'query'),
  transactionController.getAllAssets.bind(transactionController),
);

/**
 * @route   POST /api/v1/assets/query
 * @desc    Query assets with rich query
 * @access  Public
 */
router.post(
  '/assets/query',
  validate(schemas.richQuery),
  transactionController.queryAssets.bind(transactionController),
);

/**
 * @route   POST /api/v1/assets
 * @desc    Create a new asset
 * @access  Public
 */
router.post(
  '/assets',
  transactionController.createAsset.bind(transactionController),
);

/**
 * @route   PUT /api/v1/assets/:assetId
 * @desc    Update an asset
 * @access  Public
 */
router.put(
  '/assets/:assetId',
  validate(schemas.assetId, 'params'),
  transactionController.updateAsset.bind(transactionController),
);

/**
 * @route   DELETE /api/v1/assets/:assetId
 * @desc    Delete an asset
 * @access  Public
 */
router.delete(
  '/assets/:assetId',
  validate(schemas.assetId, 'params'),
  transactionController.deleteAsset.bind(transactionController),
);

/**
 * @route   GET /api/v1/jobs/:jobId
 * @desc    Get job status (for async transactions)
 * @access  Public
 */
router.get(
  '/jobs/:jobId',
  validate(schemas.jobId, 'params'),
  transactionController.getJobStatus.bind(transactionController),
);

export default router;
