import express from 'express';
import healthcareController from '../controllers/healthcare.controller.js';
import { authenticateJWT, requireDoctor, requirePatient, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Sanity checks: ensure controller methods exist to avoid obscure Express errors
const expectedHandlers = [
  'createMedicalRecord', 'getCurrentUserRecords', 'getRecordsByPatient',
  'createPatient', 'getPatient', 'getMedicalRecord',
  'createConsent', 'getCurrentUserConsents', 'getConsent', 'revokeConsent',
  'getCurrentUserAppointments', 'createAppointment', 'getAppointment', 'updateAppointment', 'cancelAppointment',
  'getCurrentUserPrescriptions', 'createPrescription', 'getPrescription', 'updatePrescription',
  'registerDoctor', 'verifyDoctor', 'getVerifiedDoctors', 'getAuditRecords',
];

expectedHandlers.forEach((h) => {
  if (typeof healthcareController[h] !== 'function') {
    throw new Error(`healthcare.controller missing required handler: ${h}`);
  }
});

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
// NOTE: removed generic '/:recordId' to avoid shadowing specific routes
// Use '/records/:recordId' under the v1 healthcare namespace instead

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
 * @access  Protected (Doctor or Admin)
 */
router.post('/patients', authenticateJWT, requireDoctor, healthcareController.createPatient);

/**
 * @route   GET /api/v1/healthcare/patients/:patientId
 * @desc    Get patient information
 * @access  Protected (Patient can view own data, Doctor/Admin can view any)
 */
router.get('/patients/:patientId', authenticateJWT, healthcareController.getPatient);

/**
 * @route   GET /api/v1/healthcare/patients/:patientId/records
 * @desc    Get all medical records for a patient
 * @access  Protected (Patient can view own records, Doctor with consent, Admin)
 */
router.get('/patients/:patientId/records', authenticateJWT, healthcareController.getRecordsByPatient);

// ======================
// Medical Records Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/records
 * @desc    Create a new medical record
 * @access  Protected (Doctor or Admin)
 */
router.post('/records', authenticateJWT, requireDoctor, healthcareController.createMedicalRecord);

/**
 * @route   GET /api/v1/healthcare/records/:recordId
 * @desc    Get a medical record
 * @access  Protected (Patient can view own records, Doctor with consent, Admin)
 */
router.get('/records/:recordId', authenticateJWT, healthcareController.getMedicalRecord);

// ======================
// Consent Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/consents
 * @desc    Create consent for data access
 * @access  Protected (Patient only - only patients can grant consent)
 */
router.post('/consents', authenticateJWT, requirePatient, healthcareController.createConsent);

/**
 * @route   GET /api/consents
 * @desc    Get all consents for current user
 * @access  Protected
 */
router.get('/consents', authenticateJWT, healthcareController.getCurrentUserConsents);

/**
 * @route   GET /api/consents/:consentId
 * @desc    Get a specific consent
 * @access  Protected
 */
router.get('/consents/:consentId', authenticateJWT, healthcareController.getConsent);

/**
 * @route   PATCH /api/consents/:consentId/revoke
 * @desc    Revoke a consent
 * @access  Protected
 */
router.patch('/consents/:consentId/revoke', authenticateJWT, healthcareController.revokeConsent);

// ======================
// Appointment Routes
// ======================

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments for current user
 * @access  Protected
 */
router.get('/appointments', authenticateJWT, healthcareController.getCurrentUserAppointments);

/**
 * @route   POST /api/v1/healthcare/appointments
 * @desc    Create a new appointment
 * @access  Protected (Doctor or Admin)
 */
router.post('/appointments', authenticateJWT, requireDoctor, healthcareController.createAppointment);

/**
 * @route   GET /api/appointments/:appointmentId
 * @desc    Get a specific appointment
 * @access  Protected
 */
router.get('/appointments/:appointmentId', authenticateJWT, healthcareController.getAppointment);

/**
 * @route   PUT /api/appointments/:appointmentId
 * @desc    Update an appointment
 * @access  Protected
 */
router.put('/appointments/:appointmentId', authenticateJWT, healthcareController.updateAppointment);

/**
 * @route   POST /api/appointments/:appointmentId/cancel
 * @desc    Cancel an appointment
 * @access  Protected
 */
router.post('/appointments/:appointmentId/cancel', authenticateJWT, healthcareController.cancelAppointment);

// ======================
// Prescription Routes
// ======================

/**
 * @route   GET /api/prescriptions
 * @desc    Get all prescriptions for current user
 * @access  Protected
 */
router.get('/prescriptions', authenticateJWT, healthcareController.getCurrentUserPrescriptions);

/**
 * @route   POST /api/v1/healthcare/prescriptions
 * @desc    Create a new prescription
 * @access  Protected (Doctor only)
 */
router.post('/prescriptions', authenticateJWT, requireDoctor, healthcareController.createPrescription);

/**
 * @route   GET /api/prescriptions/:prescriptionId
 * @desc    Get a specific prescription
 * @access  Protected
 */
router.get('/prescriptions/:prescriptionId', authenticateJWT, healthcareController.getPrescription);

/**
 * @route   PUT /api/prescriptions/:prescriptionId
 * @desc    Update a prescription
 * @access  Protected
 */
router.put('/prescriptions/:prescriptionId', authenticateJWT, healthcareController.updatePrescription);

// ======================
// Doctor Routes
// ======================

/**
 * @route   POST /api/v1/healthcare/doctors
 * @desc    Register a new doctor
 * @access  Protected (Admin only - doctors should be registered by admins)
 */
router.post('/doctors', authenticateJWT, requireAdmin, healthcareController.registerDoctor);

/**
 * @route   POST /api/v1/healthcare/doctors/:doctorAddress/verify
 * @desc    Verify a doctor
 * @access  Admin only
 */
router.post('/doctors/:doctorAddress/verify', authenticateJWT, requireAdmin, healthcareController.verifyDoctor);

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
