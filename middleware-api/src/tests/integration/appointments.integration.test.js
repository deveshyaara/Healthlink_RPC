import request from 'supertest';
import express from 'express';
// Skip entire suite if no integration DB configured
const INTEGRATION_DB = process.env.INTEGRATION_DATABASE_URL;

const runIfIntegration = (name, fn) => (INTEGRATION_DB ? test(name, fn) : test.skip(name, fn));

let app;
let router;
let dbService;

beforeAll(async () => {
  if (!INTEGRATION_DB) {
    console.warn('Integration DB not configured - skipping integration tests');
    return;
  }

  // Lazy-import dbService to avoid Jest module resolution errors when suite is skipped
  dbService = (await import('../../services/db.service.prisma.js')).default;

  process.env.DATABASE_URL = INTEGRATION_DB;
  await dbService.initialize();

  // Ensure we use real routes
  const routesMod = await import('../../routes/healthcare.routes.js');
  router = routesMod.default || routesMod;

  app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', router);

  // Create test users and patient mapping
  // Create doctor user
  const doctor = await dbService.prisma.user.create({ data: {
    email: 'int-doc@example.com',
    passwordHash: 'x',
    fabricEnrollmentId: 'int-doc',
    fullName: 'Int Doctor',
    role: 'DOCTOR',
  } });

  const patient = await dbService.prisma.patientWalletMapping.create({ data: {
    id: 'patient-int-1',
    email: 'int-patient@example.com',
    name: 'Int Patient',
    walletAddress: '0xPatientInt',
    createdBy: doctor.id,
  } });

  const apt = await dbService.prisma.appointment.create({ data: {
    appointmentId: 'int-apt-1',
    title: 'Integration Test',
    scheduledAt: new Date(),
    status: 'SCHEDULED',
    patientId: patient.id,
    doctorId: doctor.id,
  } });
});

afterAll(async () => {
  if (!INTEGRATION_DB) {return;}
  // Cleanup test data
  try {
    await dbService.prisma.userAuditLog.deleteMany({ where: { action: { in: ['appointment.updated','appointment.cancelled'] } } });
    await dbService.prisma.appointment.deleteMany({ where: { appointmentId: { in: ['int-apt-1'] } } });
    await dbService.prisma.patientWalletMapping.deleteMany({ where: { email: 'int-patient@example.com' } });
    await dbService.prisma.user.deleteMany({ where: { email: 'int-doc@example.com' } });
  } catch (e) {
    console.warn('Integration cleanup failed:', e.message);
  }

  await dbService.disconnect();
});

runIfIntegration('Integration: updating appointment creates audit record', async () => {
  // Update appointment as doctor
  const res = await request(app)
    .put('/api/v1/healthcare/appointments/int-apt-1')
    .set('Authorization', 'Bearer token')
    .set('X-Test-Role', 'doctor')
    .set('X-Test-Id', 'int-doc')
    .send({ status: 'CONFIRMED' });

  expect(res.status).toBe(200);

  const audit = await dbService.prisma.userAuditLog.findFirst({ where: { action: 'appointment.updated' } });
  expect(audit).toBeTruthy();
});

runIfIntegration('Integration: cancelling appointment creates audit record', async () => {
  const res = await request(app)
    .post('/api/v1/healthcare/appointments/int-apt-1/cancel')
    .set('Authorization', 'Bearer token')
    .set('X-Test-Role', 'doctor')
    .set('X-Test-Id', 'int-doc');

  expect(res.status).toBe(200);

  const audit = await dbService.prisma.userAuditLog.findFirst({ where: { action: 'appointment.cancelled' } });
  expect(audit).toBeTruthy();
});
