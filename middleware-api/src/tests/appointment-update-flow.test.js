import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock auth middleware to set req.user as doctor
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    const id = String(req.headers['x-test-id'] || 'doc-update');
    req.user = { id, userId: id, role: 'doctor', walletAddress: id };
    return next();
  }),
  requireDoctor: jest.fn((req, res, next) => next()),
  requirePatient: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));

// Mock transaction service to return appointment and accept on-chain update
jest.unstable_mockModule('../services/transaction.service.js', () => ({
  __esModule: true,
  default: {
    getAppointment: jest.fn(async (id) => ({ success: true, data: { appointmentId: id, patientId: 'patient-x', doctorId: 'doc-update', status: 'SCHEDULED', notes: 'initial' } })),
    updateAppointment: jest.fn(async (id, data) => ({ success: true, data: { id, ...data } })),
  },
}));

// Mock logger to mute logs
jest.unstable_mockModule('../utils/logger.js', () => ({ __esModule: true, default: { info: () => {}, warn: () => {}, error: () => {} } }));

// Mock db service: prisma.update succeeds and logAuditEvent is a spy
jest.unstable_mockModule('../services/db.service.prisma.js', () => ({ __esModule: true, default: {
  isReady: () => true,
  prisma: {
    appointment: {
      update: jest.fn(async ({ where, data }) => ({ appointmentId: where.appointmentId, ...data })),
    },
    userAuditLog: {
      create: jest.fn(async (obj) => ({ id: 1, ...obj.data })),
    },
  },
  logAuditEvent: jest.fn(async (userId, action, metadata) => ({ userId, action, metadata })),
} }));

let app;
let router;

beforeAll(async () => {
  const routesMod = await import('../routes/healthcare.routes.js');
  router = routesMod.default || routesMod;
  app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', router);
});

test('Happy path: Prisma update succeeds and audit event is logged', async () => {
  const res = await request(app)
    .put('/api/v1/healthcare/appointments/apt-update')
    .set('Authorization', 'Bearer token')
    .set('X-Test-Id', 'doc-update')
    .send({ status: 'COMPLETED', notes: 'Completed successfully' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('success', true);
  expect(res.body.data).toMatchObject({ status: 'COMPLETED', notes: 'Completed successfully' });

  const db = (await import('../services/db.service.prisma.js')).default;
  expect(db.prisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { appointmentId: 'apt-update' }, data: expect.any(Object) }));
  expect(db.logAuditEvent).toHaveBeenCalledWith('doc-update', 'appointment.updated', expect.objectContaining({ appointmentId: 'apt-update' }));
});
