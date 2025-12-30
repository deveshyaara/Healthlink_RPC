/**
 * Lab Routes
 * Routes for laboratory test management
 */

import express from 'express';
import labController from '../controllers/lab.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/v1/lab/:labId/tests
 * Get all tests for a specific lab
 * Access: LAB role
 */
router.get('/:labId/tests', requireRole(['lab', 'admin']), labController.getLabTests);

/**
 * GET /api/v1/lab/:labId/pending-tests
 * Get pending tests for a lab
 * Access: LAB role
 */
router.get('/:labId/pending-tests', requireRole(['lab', 'admin']), labController.getPendingTests);

/**
 * GET /api/v1/lab/:labId/tests/:testId
 * Get specific test details
 * Access: LAB, DOCTOR, PATIENT (with proper ownership checks)
 */
router.get('/:labId/tests/:testId', labController.getTest);

/**
 * POST /api/v1/lab/:labId/tests/:testId/upload-results
 * Upload test results
 * Access: LAB role only
 */
router.post(
    '/:labId/tests/:testId/upload-results',
    requireRole(['lab', 'admin']),
    labController.uploadResults
);

/**
 * PATCH /api/v1/lab/:labId/tests/:testId/status
 * Update test status
 * Access: LAB role only
 */
router.patch(
    '/:labId/tests/:testId/status',
    requireRole(['lab', 'admin']),
    labController.updateTestStatus
);

/**
 * GET /api/v1/lab/:labId/stats
 * Get lab statistics
 * Access: LAB role
 */
router.get('/:labId/stats', requireRole(['lab', 'admin']), labController.getLabStats);

/**
 * GET /api/v1/lab/:labId/tests/patient/:patientId
 * Get all tests for a specific patient
 * Access: LAB, DOCTOR roles
 */
router.get(
    '/:labId/tests/patient/:patientId',
    requireRole(['lab', 'doctor', 'admin']),
    labController.getTestsByPatient
);

export default router;
