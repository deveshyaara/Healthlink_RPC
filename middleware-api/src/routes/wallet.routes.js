import express from 'express';
import walletController from '../controllers/wallet.controller.js';
import validate, { schemas } from '../middleware/validator.js';

const router = express.Router();

/**
 * @route   POST /api/v1/wallet/enroll-admin
 * @desc    Enroll admin user
 * @access  Public
 */
router.post(
  '/enroll-admin',
  walletController.enrollAdmin.bind(walletController)
);

/**
 * @route   POST /api/v1/wallet/register
 * @desc    Register and enroll a new user
 * @access  Public
 */
router.post(
  '/register',
  validate(schemas.registerUser),
  walletController.registerUser.bind(walletController)
);

/**
 * @route   GET /api/v1/wallet/identity/:userId
 * @desc    Get user identity
 * @access  Public
 */
router.get(
  '/identity/:userId',
  walletController.getIdentity.bind(walletController)
);

/**
 * @route   GET /api/v1/wallet/identities
 * @desc    List all identities
 * @access  Public
 */
router.get(
  '/identities',
  walletController.listIdentities.bind(walletController)
);

/**
 * @route   DELETE /api/v1/wallet/identity/:userId
 * @desc    Remove user identity
 * @access  Public
 */
router.delete(
  '/identity/:userId',
  walletController.removeIdentity.bind(walletController)
);

export default router;
