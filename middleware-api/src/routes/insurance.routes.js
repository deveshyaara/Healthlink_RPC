/**
 * Insurance Routes
 * Handles insurance providers, policies, and claims
 * Feature Flag: ENABLE_INSURANCE
 */

import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { requireFeature } from '../config/feature-flags.config.js';
import insuranceController from '../controllers/insurance.controller.js';

const router = express.Router();

// All insurance routes require feature flag
router.use(requireFeature('enableInsurance'));

/**
 * @route   POST /api/v1/insurance/providers
 * @desc    Register insurance provider (admin only)
 * @access  Admin
 */
router.post(
  '/providers',
  authenticateJWT,
  requireRole('admin'),
  insuranceController.registerProvider,
);

/**
 * @route   GET /api/v1/insurance/providers
 * @desc    List all insurance providers
 * @access  Authenticated
 */
router.get(
  '/providers',
  authenticateJWT,
  insuranceController.listProviders,
);

/**
 * @route   POST /api/v1/insurance/policies
 * @desc    Create insurance policy for patient
 * @access  Admin or Insurance role
 */
router.post(
  '/policies',
  authenticateJWT,
  requireRole('admin', 'insurance'),
  insuranceController.createPolicy,
);

/**
 * @route   GET /api/v1/insurance/policies/patient/:patientId
 * @desc    Get patient's insurance policies
 * @access  Patient (own), Doctor, Insurance, Admin
 */
router.get(
  '/policies/patient/:patientId',
  authenticateJWT,
  insuranceController.getPatientPolicies,
);

/**
 * @route   POST /api/v1/insurance/claims
 * @desc    Submit insurance claim (via blockchain)
 * @access  Hospital Admin, Doctor, Admin
 */
router.post(
  '/claims',
  authenticateJWT,
  requireRole('hospital_admin', 'doctor', 'admin'),
  insuranceController.submitClaim,
);

/**
 * @route   GET /api/v1/insurance/claims/:claimId
 * @desc    Get claim details
 * @access  Insurance, Hospital (who submitted), Admin
 */
router.get(
  '/claims/:claimId',
  authenticateJWT,
  insuranceController.getClaim,
);

/**
 * @route   GET /api/v1/insurance/claims
 * @desc    List claims (filtered by role)
 * @access  Insurance, Hospital Admin, Admin
 */
router.get(
  '/claims',
  authenticateJWT,
  requireRole('insurance', 'hospital_admin', 'admin'),
  insuranceController.listClaims,
);

/**
 * @route   PATCH /api/v1/insurance/claims/:claimId/verify
 * @desc    Verify claim authenticity
 * @access  Insurance or Admin
 */
router.patch(
  '/claims/:claimId/verify',
  authenticateJWT,
  requireRole('insurance', 'admin'),
  insuranceController.verifyClaim,
);

/**
 * @route   PATCH /api/v1/insurance/claims/:claimId/approve
 * @desc    Approve claim with amount
 * @access  Insurance or Admin
 */
router.patch(
  '/claims/:claimId/approve',
  authenticateJWT,
  requireRole('insurance', 'admin'),
  insuranceController.approveClaim,
);

/**
 * @route   PATCH /api/v1/insurance/claims/:claimId/reject
 * @desc    Reject claim with reason
 * @access  Insurance or Admin
 */
router.patch(
  '/claims/:claimId/reject',
  authenticateJWT,
  requireRole('insurance', 'admin'),
  insuranceController.rejectClaim,
);

export default router;
