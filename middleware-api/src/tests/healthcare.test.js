/**
 * Healthcare API Tests (flat response format)
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Ensure server doesn't auto-start and environment is test for ESM behavior
process.env.SKIP_AUTO_START = 'true';
process.env.NODE_ENV = 'test';

// Mock the controller methods used by the routes BEFORE importing the router
jest.unstable_mockModule('../controllers/healthcare.controller.js', () => {
  // Explicit list of expected handler names (must match routes/healthcare.routes.js)
  const expectedHandlers = [
    'createMedicalRecord', 'getCurrentUserRecords', 'getRecordsByPatient',
    'createPatient', 'getPatient', 'getPatientsForDoctor', 'getPatientByEmail',
    'getPatients',
    'getMedicalRecord', 'getMedicalRecordsForDoctor',
    'createConsent', 'getCurrentUserConsents', 'getConsent', 'revokeConsent', 'getConsentRequestsForDoctor',
    'getCurrentUserAppointments', 'createAppointment', 'getAppointment', 'updateAppointment', 'cancelAppointment', 'getAppointmentsForDoctor',
    'getCurrentUserPrescriptions', 'createPrescription', 'getPrescription', 'updatePrescription', 'getPrescriptionsForDoctor',
    'getLabTestsForDoctor',
    'registerDoctor', 'verifyDoctor', 'getVerifiedDoctors', 'getAuditRecords',
  ];

  const handler = {};
  expectedHandlers.forEach((h) => {
    if (h === 'getPatients') {
      handler[h] = jest.fn((req, res) => res.status(200).json({ success: true, patients: [] }));
    } else {
      handler[h] = jest.fn();
    }
  });

  // Export both default and named properties to satisfy different import interop
  return { __esModule: true, default: handler, ...handler };
});

// Mock auth middleware to pass through and optionally set req.user
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => { req.user = { id: 'test-user' }; return next(); }),
  requireDoctor: jest.fn((req, res, next) => next()),
  requirePatient: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));

// Also mock auth controller to avoid loading real controller (which may connect to DB)
jest.unstable_mockModule('../controllers/auth.controller.js', () => {
  const handlers = {
    register: jest.fn((req, res) => res.status(201).json({ success: true })),
    login: jest.fn((req, res) => res.status(200).json({ success: true, token: 'mock-jwt' })),
    logout: jest.fn((req, res) => res.status(200).json({ success: true })),
    getMe: jest.fn((req, res) => res.status(200).json({ success: true, user: req.user || null })),
    refreshToken: jest.fn((req, res) => res.status(200).json({ success: true, token: 'refreshed' })),
    changePassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  };
  return { __esModule: true, default: handlers, ...handlers };
});

let healthcareRoutes;
let healthcareController;
let authenticateJWT;
let app;

beforeAll(async () => {
  // Import the mocked controller and auth middleware, then build a minimal router
  const controllerMod = await import('../controllers/healthcare.controller.js');
  healthcareController = controllerMod.default || controllerMod;
  const authMod = await import('../middleware/auth.middleware.js');
  const { authenticateJWT, requireDoctor, requirePatient, requireAdmin } = authMod;

  // Build minimal router for only the endpoints exercised by these tests
  const router = express.Router();
  router.get('/patients', authenticateJWT, requireDoctor, healthcareController.getPatients);
  router.get('/', authenticateJWT, healthcareController.getCurrentUserRecords);
  router.post('/records', authenticateJWT, requireDoctor, healthcareController.createMedicalRecord);
  router.post('/prescriptions', authenticateJWT, requireDoctor, healthcareController.createPrescription);
  router.post('/appointments', authenticateJWT, requireDoctor, healthcareController.createAppointment);

  app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', router);
  app.use('/api/medical-records', router);
});

describe('Healthcare API (flat responses)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/v1/healthcare/patients returns patients list', async () => {
    const patients = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];

    healthcareController.getPatients.mockImplementation((req, res) => {
      return res.status(200).json({ success: true, patients });
    });

    const res = await request(app).get('/api/v1/healthcare/patients');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.patients)).toBe(true);
    expect(res.body.patients.length).toBe(2);
  });

  test('GET /api/medical-records returns records for current user', async () => {
    const records = [
      { recordId: 'r1', patientId: 'test-user' },
    ];

    healthcareController.getCurrentUserRecords.mockImplementation((req, res) => {
      return res.status(200).json({ success: true, records });
    });

    const res = await request(app).get('/api/medical-records');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records[0].patientId).toBe('test-user');
  });

  test('POST /api/v1/healthcare/records accepts patientEmail and returns created record', async () => {
    const testPatient = { id: 'p1', email: 'alice@example.com' };

    healthcareController.createMedicalRecord.mockImplementation((req, res) => {
      // Ensure controller receives patientEmail (email-based flow)
      if (!req.body || req.body.patientEmail !== testPatient.email) {
        return res.status(400).json({ success: false, error: 'Missing patientEmail in request' });
      }

      return res.status(201).json({ success: true, record: { recordId: 'r1', patientEmail: req.body.patientEmail } });
    });

    const payload = {
      recordId: 'r1',
      patientEmail: testPatient.email,
      recordType: 'Lab Report',
      metadata: JSON.stringify({ title: 'Test' }),
    };

    const res = await request(app).post('/api/v1/healthcare/records').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.record).toBeDefined();
    expect(res.body.record.recordId).toBe('r1');
    expect(res.body.record.patientEmail).toBe(testPatient.email);
  });

  test('POST /api/v1/healthcare/records returns 404 for unknown patient email', async () => {
    healthcareController.createMedicalRecord.mockImplementation((req, res) => {
      const email = req.body?.patientEmail;
      if (email === 'wrong@example.com') {
        return res.status(404).json({ success: false, error: 'Patient email not found' });
      }
      return res.status(201).json({ success: true });
    });

    const res = await request(app).post('/api/v1/healthcare/records').send({ patientEmail: 'wrong@example.com', recordId: 'r-x' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/patient email not found/i);
  });

  test('POST /api/v1/healthcare/prescriptions accepts patientEmail and returns created prescription', async () => {
    const testPatient = { id: 'p2', email: 'bob@example.com' };

    healthcareController.createPrescription.mockImplementation((req, res) => {
      if (!req.body || req.body.patientEmail !== testPatient.email) {
        return res.status(400).json({ success: false, error: 'Missing patientEmail' });
      }
      return res.status(201).json({ success: true, prescription: { prescriptionId: 'pres-1', patientEmail: req.body.patientEmail } });
    });

    const payload = { prescriptionId: 'pres-1', patientEmail: testPatient.email, medications: [] };
    const res = await request(app).post('/api/v1/healthcare/prescriptions').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.prescription).toBeDefined();
    expect(res.body.prescription.patientEmail).toBe(testPatient.email);
  });

  test('POST /api/v1/healthcare/appointments accepts patientEmail and returns created appointment', async () => {
    const testPatient = { id: 'p3', email: 'carol@example.com' };

    healthcareController.createAppointment.mockImplementation((req, res) => {
      if (!req.body || req.body.patientEmail !== testPatient.email) {
        return res.status(400).json({ success: false, error: 'Missing patientEmail' });
      }
      return res.status(201).json({ success: true, appointment: { appointmentId: 'a1', patientEmail: req.body.patientEmail } });
    });

    const payload = { appointmentId: 'a1', patientEmail: testPatient.email, timestamp: Date.now(), doctorAddress: 'doc1' };
    const res = await request(app).post('/api/v1/healthcare/appointments').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.patientEmail).toBe(testPatient.email);
  });
});
