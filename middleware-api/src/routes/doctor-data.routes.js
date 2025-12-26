/**
 * Doctor Data Routes
 * Dedicated routes for doctor-specific data access
 * Queries by doctorId instead of patientId
 */

import express from 'express';
import { authenticateJWT, requireDoctor } from '../middleware/auth.middleware.js';
import doctorDataController from '../controllers/doctor-data.controller.js';

const router = express.Router();

// All routes require authentication AND doctor role
router.use(authenticateJWT);
router.use(requireDoctor);

/**
 * GET /api/doctor/appointments
 * Get all appointments for current doctor
 */
router.get('/appointments', doctorDataController.getAppointments.bind(doctorDataController));

/**
 * GET /api/doctor/prescriptions
 * Get all prescriptions for current doctor
 */
router.get('/prescriptions', doctorDataController.getPrescriptions.bind(doctorDataController));

/**
 * GET /api/doctor/medical-records
 * Get all medical records for current doctor
 */
router.get('/medical-records', doctorDataController.getMedicalRecords.bind(doctorDataController));

/**
 * GET /api/doctor/lab-tests
 * Get all lab tests for current doctor
 */
router.get('/lab-tests', doctorDataController.getLabTests.bind(doctorDataController));

/**
 * GET /api/doctor/patients
 * Get all patients for current doctor
 */
router.get('/patients', doctorDataController.getPatients.bind(doctorDataController));

export default router;
