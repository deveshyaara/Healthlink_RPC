import express from 'express';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware.js';
import adminController from '../controllers/admin.controller.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateJWT, requireAdmin);

/**
 * Admin Dashboard Statistics
 * GET /api/v1/admin/stats
 */
router.get('/stats', adminController.getStats.bind(adminController));

/**
 * User Management
 */
// GET: All patients
router.get('/users/patients', adminController.getPatients.bind(adminController));

// GET: All doctors  
router.get('/users/doctors', adminController.getDoctors.bind(adminController));

// GET: Pending verifications
router.get('/users/pending', adminController.getPendingVerifications.bind(adminController));

export default router;