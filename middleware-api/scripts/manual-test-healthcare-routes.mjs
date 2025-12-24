import express from 'express';
import request from 'supertest';
import healthcareRoutes from '../src/routes/healthcare.routes.js';

(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/healthcare', healthcareRoutes);

  // Test POST /records without body -> should return 400 (Missing required field: patientEmail)
  const res = await request(app).post('/api/v1/healthcare/records').send({});
  console.log('POST /records status:', res.status);
  console.log('POST /records body:', res.body);

  process.exit(0);
})();