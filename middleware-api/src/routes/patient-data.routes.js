/**
 * Patient Data Routes
 * Database-backed routes for patient data access
 * Routes patient queries to Supabase instead of blockchain
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import patientDataController from '../controllers/patient-data.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/patient/consents
 * Get all consent requests for current patient
 */
router.get('/consents', patientDataController.getConsents.bind(patientDataController));

/**
 * GET /api/patient/medical-records
 * Get all medical records for current patient
 */
router.get('/medical-records', patientDataController.getMedicalRecords.bind(patientDataController));

/**
 * GET /api/patient/appointments
 * Get all appointments for current patient
 */
router.get('/appointments', patientDataController.getAppointments.bind(patientDataController));

/**
 * GET /api/patient/prescriptions
 * Get all prescriptions for current patient
 */
router.get('/prescriptions', patientDataController.getPrescriptions.bind(patientDataController));

/**
 * GET /api/patient/lab-tests
 * Get all lab tests for current patient
 */
router.get('/lab-tests', patientDataController.getLabTests.bind(patientDataController));

export default router;
