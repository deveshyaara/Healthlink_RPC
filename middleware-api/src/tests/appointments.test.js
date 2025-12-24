import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock auth middleware similar to route-security tests
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'No authentication token provided' });
    const role = String(req.headers['x-test-role'] || 'doctor');
    const id = String(req.headers['x-test-id'] || 'user-1');
    req.user = { id, userId: id, role, walletAddress: id };
    return next();
  }),
  requireDoctor: jest.fn((req, res, next) => next()),
  requirePatient: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));

// Mock transaction service to capture on-chain calls
jest.unstable_mockModule('../services/transaction.service.js', () => ({
  __esModule: true,
  default: {
    getAppointment: jest.fn(async (id) => ({ success: true, data: { appointmentId: id, patientId: 'patient-1', doctorId: 'doc-1', status: 'SCHEDULED', notes: 'initial' } })),
    updateAppointment: jest.fn(async (id, data) => ({ success: true, data: { id, ...data } })),
    cancelAppointment: jest.fn(async (id) => ({ success: true })),
  }
}));

// Mock config that other modules import (avoid heavy side-effects)
jest.unstable_mockModule('../config/fabric-config.js', () => ({ __esModule: true, default: { network: { channel: { name: 'test' } }, wallet: { basePath: '', adminUserId: '', appUserId: '' }, profiles: {} }, getDefaultChaincode: () => 'testcc' }));

// Mock logger to avoid importing config/index which references file paths
jest.unstable_mockModule('../utils/logger.js', () => ({ __esModule: true, default: { info: () => {}, warn: () => {}, error: () => {} } }));

// Provide a mocked DB service that supports appointment.update
jest.unstable_mockModule('../services/db.service.prisma.js', () => ({ __esModule: true, default: {
  isReady: () => true,
  prisma: {
    appointment: {
      update: jest.fn(async ({ where, data }) => ({ appointmentId: where.appointmentId, ...data })),
    },
    userAuditLog: {
      create: jest.fn(async (obj) => ({ id: 1, ...obj.data })),
      findFirst: jest.fn(async (query) => null),
    }
  },
  logAuditEvent: jest.fn(async (userId, action, metadata) => {
    // Simulate writing to userAuditLog
    return { userId, action, metadata };
  })
}}));

let router;
let app;

beforeAll(async () => {
  const routesMod = await import('../routes/healthcare.routes.js');
  router = routesMod.default || routesMod;
  app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', router);
});

describe('Appointment permission and persistence', () => {
  test('Doctor can update appointment (status & notes)', async () => {
    const res = await request(app)
      .put('/api/v1/healthcare/appointments/apt-1')
      .set('Authorization', 'Bearer token')
      .set('X-Test-Role', 'doctor')
      .set('X-Test-Id', 'doc-1')
      .send({ status: 'CONFIRMED', notes: 'Confirmed by doc' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toMatchObject({ status: 'CONFIRMED', notes: 'Confirmed by doc' });

    const tx = (await import('../services/transaction.service.js')).default;
    expect(tx.updateAppointment).toHaveBeenCalledWith('apt-1', expect.objectContaining({ status: 'CONFIRMED', notes: 'Confirmed by doc' }));
    const db = (await import('../services/db.service.prisma.js')).default;
    expect(db.logAuditEvent).toHaveBeenCalledWith(expect.any(String), 'appointment.updated', expect.objectContaining({ appointmentId: 'apt-1' }));
  });

  test('Patient can cancel own appointment', async () => {
    // Mock getAppointment to return patient owner
    const tx = (await import('../services/transaction.service.js')).default;
    tx.getAppointment.mockImplementation(async (id) => ({ success: true, data: { appointmentId: id, patientId: 'patient-1', doctorId: 'doc-1', status: 'SCHEDULED' } }));

    const res = await request(app)
      .post('/api/v1/healthcare/appointments/apt-2/cancel')
      .set('Authorization', 'Bearer token')
      .set('X-Test-Role', 'patient')
      .set('X-Test-Id', 'patient-1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(tx.cancelAppointment).toHaveBeenCalledWith('apt-2');
    const db = (await import('../services/db.service.prisma.js')).default;
    expect(db.logAuditEvent).toHaveBeenCalledWith(expect.any(String), 'appointment.cancelled', expect.objectContaining({ appointmentId: 'apt-2' }));
  });

  test('Patient cannot update other fields (only notes allowed)', async () => {
    const res = await request(app)
      .put('/api/v1/healthcare/appointments/apt-3')
      .set('Authorization', 'Bearer token')
      .set('X-Test-Role', 'patient')
      .set('X-Test-Id', 'patient-1')
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});