/**
 * Hospital Routes
 * Handles hospital registration, staff management, and analytics
 * Feature Flag: ENABLE_HOSPITAL
 */

import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { requireFeature } from '../config/feature-flags.config.js';
import hospitalController from '../controllers/hospital.controller.js';

const router = express.Router();

// All hospital routes require feature flag
router.use(requireFeature('enableHospital'));

/**
 * @route   POST /api/v1/hospital/register
 * @desc    Register a new hospital (admin only)
 * @access  Admin
 */
router.post(
  '/register',
  authenticateJWT,
  requireRole('admin'),
  hospitalController.registerHospital,
);

/**
 * @route   GET /api/v1/hospital
 * @desc    List all hospitals
 * @access  Authenticated
 */
router.get(
  '/',
  authenticateJWT,
  hospitalController.listHospitals,
);

/**
 * @route   GET /api/v1/hospital/:hospitalId
 * @desc    Get hospital details
 * @access  Authenticated
 */
router.get(
  '/:hospitalId',
  authenticateJWT,
  hospitalController.getHospital,
);

/**
 * @route   PATCH /api/v1/hospital/:hospitalId
 * @desc    Update hospital details
 * @access  Admin or Hospital Admin
 */
router.patch(
  '/:hospitalId',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.updateHospital,
);

/**
 * @route   POST /api/v1/hospital/:hospitalId/departments
 * @desc    Add a department to hospital
 * @access  Admin or Hospital Admin
 */
router.post(
  '/:hospitalId/departments',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.addDepartment,
);

/**
 * @route   GET /api/v1/hospital/:hospitalId/departments
 * @desc    List hospital departments
 * @access  Authenticated
 */
router.get(
  '/:hospitalId/departments',
  authenticateJWT,
  hospitalController.listDepartments,
);

/**
 * @route   PATCH /api/v1/hospital/:hospitalId/departments/:departmentId
 * @desc    Update department details
 * @access  Admin or Hospital Admin
 */
router.patch(
  '/:hospitalId/departments/:departmentId',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.updateDepartment,
);

/**
 * @route   POST /api/v1/hospital/:hospitalId/staff
 * @desc    Add staff member to hospital
 * @access  Admin or Hospital Admin
 */
router.post(
  '/:hospitalId/staff',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.addStaff,
);

/**
 * @route   GET /api/v1/hospital/:hospitalId/staff
 * @desc    List hospital staff
 * @access  Admin or Hospital Admin
 */
router.get(
  '/:hospitalId/staff',
  authenticateJWT,
  requireRole('admin', 'hospital_admin', 'doctor'),
  hospitalController.listStaff,
);

/**
 * @route   DELETE /api/v1/hospital/:hospitalId/staff/:userId
 * @desc    Remove staff member from hospital
 * @access  Admin or Hospital Admin
 */
router.delete(
  '/:hospitalId/staff/:userId',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.removeStaff,
);

/**
 * @route   GET /api/v1/hospital/:hospitalId/analytics
 * @desc    Get hospital analytics (admissions, appointments, revenue)
 * @access  Admin or Hospital Admin
 */
router.get(
  '/:hospitalId/analytics',
  authenticateJWT,
  requireRole('admin', 'hospital_admin'),
  hospitalController.getAnalytics,
);

export default router;
