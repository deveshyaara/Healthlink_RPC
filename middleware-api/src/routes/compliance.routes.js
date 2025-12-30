/**
 * Compliance & Audit Routes
 * Protected routes for compliance reporting and audit trail access
 */

import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import complianceController from '../controllers/compliance.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * POST /api/compliance/hipaa
 * Generate HIPAA compliance report
 * Access: Admin, Hospital Admin
 */
router.post(
    '/hipaa',
    requireRole('admin', 'hospital_admin'),
    complianceController.generateHIPAAReport.bind(complianceController)
);

/**
 * POST /api/compliance/gdpr
 * Generate GDPR compliance report
 * Access: Admin, Hospital Admin
 */
router.post(
    '/gdpr',
    requireRole('admin', 'hospital_admin'),
    complianceController.generateGDPRReport.bind(complianceController)
);

/**
 * GET /api/compliance/stats
 * Get compliance statistics (last 30 days)
 * Access: Admin, Hospital Admin
 */
router.get(
    '/stats',
    requireRole('admin', 'hospital_admin'),
    complianceController.getStats.bind(complianceController)
);

/**
 * GET /api/compliance/violations
 * Get real-time compliance violations (last 24 hours)
 * Access: Admin, Hospital Admin
 */
router.get(
    '/violations',
    requireRole('admin', 'hospital_admin'),
    complianceController.getViolations.bind(complianceController)
);

/**
 * GET /api/compliance/audit-logs
 * Get filtered audit logs with pagination
 * Access: Admin, Hospital Admin, Doctor, Patient (filtered by their user ID)
 */
router.get(
    '/audit-logs',
    // Allow all authenticated users - controller will filter by user role
    complianceController.getAuditLogs.bind(complianceController)
);

/**
 * GET /api/compliance/reports
 * Get saved compliance reports
 * Access: Admin, Hospital Admin
 */
router.get(
    '/reports',
    requireRole('admin', 'hospital_admin'),
    complianceController.getReports.bind(complianceController)
);

export default router;
