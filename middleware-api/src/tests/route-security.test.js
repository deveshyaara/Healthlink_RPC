import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock healthcare controller as a class with all expected handler methods
jest.unstable_mockModule('../controllers/healthcare.controller.js', () => {
  class MockController {
    constructor() {}
  }

  const expected = [
    'createMedicalRecord', 'getCurrentUserRecords', 'getRecordsByPatient',
    'createPatient', 'getPatient', 'getPatientsForDoctor', 'getPatientByEmail',
    'getMedicalRecord', 'getMedicalRecordsForDoctor',
    'createConsent', 'getCurrentUserConsents', 'getConsent', 'revokeConsent', 'getConsentRequestsForDoctor',
    'getCurrentUserAppointments', 'createAppointment', 'getAppointment', 'updateAppointment', 'cancelAppointment', 'getAppointmentsForDoctor',
    'getPatients', 'getCurrentUserPrescriptions', 'createPrescription', 'getPrescription', 'updatePrescription', 'getPrescriptionsForDoctor',
    'getLabTestsForDoctor',
    'registerDoctor', 'verifyDoctor', 'getVerifiedDoctors', 'getAuditRecords',
  ];

  expected.forEach((name) => {
    MockController.prototype[name] = (req, res) => {
      if (name === 'getAuditRecords') {
        return res.status(200).json({ success: true, audits: [] });
      }
      // Generic stub for other handlers
      return res.status(200).json({ success: true, handler: name });
    };
  });

  return { __esModule: true, default: MockController, MockController };
});

// Mock auth middleware to emulate auth behavior using headers
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }
    // use X-Test-Role header to drive role in tests
    const role = String(req.headers['x-test-role'] || 'doctor');
    req.user = { id: 'test-user', role };
    return next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  }),
  requireDoctor: jest.fn((req, res, next) => next()),
  requirePatient: jest.fn((req, res, next) => next()),
}));

// Now import the router and mount to an express test app
let router;
let app;

beforeAll(async () => {
  const routesMod = await import('../routes/healthcare.routes.js');
  router = routesMod.default || routesMod;
  app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', router);
});

describe('Audit route security', () => {
  test('returns 401 when missing Authorization header', async () => {
    const res = await request(app).get('/api/v1/healthcare/audit');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin authenticated user', async () => {
    const res = await request(app).get('/api/v1/healthcare/audit').set('Authorization', 'Bearer token').set('X-Test-Role', 'doctor');
    expect(res.status).toBe(403);
  });

  test('returns 200 for admin user', async () => {
    const res = await request(app).get('/api/v1/healthcare/audit').set('Authorization', 'Bearer token').set('X-Test-Role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
