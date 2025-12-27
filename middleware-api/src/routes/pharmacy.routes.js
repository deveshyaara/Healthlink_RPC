/**
 * Pharmacy Routes
 * Handles pharmacy registration, prescription verification, and inventory management
 * Feature Flag: ENABLE_PHARMACY
 */

import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { requireFeature } from '../config/feature-flags.config.js';
import pharmacyController from '../controllers/pharmacy.controller.js';

const router = express.Router();

// All pharmacy routes require feature flag
router.use(requireFeature('enablePharmacy'));

/**
 * @route   POST /api/v1/pharmacy/register
 * @desc    Register a new pharmacy (admin only)
 * @access  Admin
 */
router.post(
  '/register',
  authenticateJWT,
  requireRole('admin'),
  pharmacyController.registerPharmacy,
);

/**
 * @route   GET /api/v1/pharmacy/:pharmacyId
 * @desc    Get pharmacy details
 * @access  Authenticated
 */
router.get(
  '/:pharmacyId',
  authenticateJWT,
  pharmacyController.getPharmacy,
);

/**
 * @route   GET /api/v1/pharmacy
 * @desc    List all pharmacies
 * @access  Authenticated
 */
router.get(
  '/',
  authenticateJWT,
  pharmacyController.listPharmacies,
);

/**
 * @route   PATCH /api/v1/pharmacy/:pharmacyId
 * @desc    Update pharmacy details
 * @access  Admin or Pharmacist (own pharmacy)
 */
router.patch(
  '/:pharmacyId',
  authenticateJWT,
  requireRole('admin', 'pharmacist'),
  pharmacyController.updatePharmacy,
);

/**
 * @route   POST /api/v1/pharmacy/:pharmacyId/verify-prescription
 * @desc    Verify e-prescription by QR code or prescription ID
 * @access  Pharmacist or Admin
 */
router.post(
  '/:pharmacyId/verify-prescription',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.verifyPrescription,
);

/**
 * @route   POST /api/v1/pharmacy/:pharmacyId/dispense
 * @desc    Dispense a verified prescription
 * @access  Pharmacist or Admin
 */
router.post(
  '/:pharmacyId/dispense',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.dispensePrescription,
);

/**
 * @route   GET /api/v1/pharmacy/:pharmacyId/inventory
 * @desc    Get pharmacy drug inventory
 * @access  Pharmacist or Admin
 */
router.get(
  '/:pharmacyId/inventory',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.getInventory,
);

/**
 * @route   POST /api/v1/pharmacy/:pharmacyId/inventory
 * @desc    Add or update drug in inventory
 * @access  Pharmacist or Admin
 */
router.post(
  '/:pharmacyId/inventory',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.updateInventory,
);

/**
 * @route   GET /api/v1/pharmacy/:pharmacyId/inventory/alerts
 * @desc    Get inventory alerts (low stock, expiring soon)
 * @access  Pharmacist or Admin
 */
router.get(
  '/:pharmacyId/inventory/alerts',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.getInventoryAlerts,
);

/**
 * @route   GET /api/v1/pharmacy/:pharmacyId/dispensed
 * @desc    Get dispensing history
 * @access  Pharmacist or Admin
 */
router.get(
  '/:pharmacyId/dispensed',
  authenticateJWT,
  requireRole('pharmacist', 'admin'),
  pharmacyController.getDispensingHistory,
);

export default router;
