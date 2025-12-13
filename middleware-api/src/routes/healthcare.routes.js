import express from 'express';
import healthcareController from '../controllers/healthcare.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// ======================
// Medical Records Routes (Root level for /api/medical-records)
// ======================

/**
 * @route   POST /api/medical-records
 * @desc    Create a new medical record
 * @access  Protected
 */
router.post('/', authenticateJWT, healthcareController.createMedicalRecord);

/**
 * @route   GET /api/medical-records
 * @desc    Get all medical records for current authenticated user
 * @access  Protected
 */
router.get('/', authenticateJWT, healthcareController.getCurrentUserRecords);

/**
 * @route   GET /api/medical-records/:recordId
 * @desc    Get a medical record
 * @access  Protected
 */
router.get('/:recordId', authenticateJWT, healthcareController.getMedicalRecord);

/**
 * @route   GET /api/medical-records/patient/:patientId
 * @desc    Get all medical records for a patient
 * @access  Protected
 */
router.get('/patient/:patientId', authenticateJWT, healthcareController.getRecordsByPatient);

// ======================
// Patient Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/patients
 * @desc    Create a new patient
 * @access  Public (should be protected in production)
 */
router.post('/patients', healthcareController.createPatient);

/**
 * @route   GET /api/v1/healthcare/patients/:patientId
 * @desc    Get patient information
 * @access  Public (should be protected in production)
 */
router.get('/patients/:patientId', healthcareController.getPatient);

/**
 * @route   GET /api/v1/healthcare/patients/:patientId/records
 * @desc    Get all medical records for a patient
 * @access  Public (should be protected in production)
 */
router.get('/patients/:patientId/records', healthcareController.getRecordsByPatient);

// ======================
// Medical Records Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/records
 * @desc    Create a new medical record
 * @access  Public (should be protected in production)
 */
router.post('/records', healthcareController.createMedicalRecord);

/**
 * @route   GET /api/v1/healthcare/records/:recordId
 * @desc    Get a medical record
 * @access  Public (should be protected in production)
 */
router.get('/records/:recordId', healthcareController.getMedicalRecord);

// ======================
// Consent Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/consents
 * @desc    Create consent for data access
 * @access  Public (should be protected in production)
 */
router.post('/consents', healthcareController.createConsent);

// ======================
// Appointment Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/appointments
 * @desc    Create a new appointment
 * @access  Public (should be protected in production)
 */
router.post('/appointments', healthcareController.createAppointment);

// ======================
// Prescription Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/prescriptions
 * @desc    Create a new prescription
 * @access  Public (should be protected in production)
 */
router.post('/prescriptions', healthcareController.createPrescription);

// ======================
// Doctor Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/doctors
 * @desc    Register a new doctor
 * @access  Public (should be protected in production)
 */
router.post('/doctors', healthcareController.registerDoctor);

/**
 * @route   POST /api/v1/healthcare/doctors/:doctorAddress/verify
 * @desc    Verify a doctor
 * @access  Admin only (should be protected in production)
 */
router.post('/doctors/:doctorAddress/verify', healthcareController.verifyDoctor);

/**
 * @route   GET /api/v1/healthcare/doctors/verified
 * @desc    Get all verified doctors
 * @access  Public
 */
router.get('/doctors/verified', healthcareController.getVerifiedDoctors);

// ======================
// Audit Routes
// ======================

/**
 * @route   GET /api/v1/healthcare/audit
 * @desc    Get audit records
 * @access  Admin only (should be protected in production)
 */
router.get('/audit', healthcareController.getAuditRecords);

export default router;
