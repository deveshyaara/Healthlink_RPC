/**
 * Healthcare API Tests (flat response format)
 */

import request from 'supertest';
import express from 'express';
import healthcareRoutes from '../routes/healthcare.routes.js';
import { jest } from '@jest/globals';

// Mock the controller methods used by the routes
jest.mock('../controllers/healthcare.controller.js', () => ({
  getPatients: jest.fn(),
  getCurrentUserRecords: jest.fn(),
  getMedicalRecord: jest.fn(),
}));

// Mock auth middleware to pass through and optionally set req.user
jest.mock('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => { req.user = { id: 'test-user' }; return next(); }),
  requireDoctor: jest.fn((req, res, next) => next()),
  requirePatient: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));

import healthcareController from '../controllers/healthcare.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const app = express();
app.use(express.json());
// Mount the same router for both v1 healthcare and medical-records prefixes
app.use('/api/v1/healthcare', healthcareRoutes);
app.use('/api/medical-records', healthcareRoutes);

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
});
