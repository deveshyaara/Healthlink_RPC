import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';

(async () => {
  try {
    const token = jwt.sign({ userId: 'doc-test', email: 'doc@example.com', role: 'doctor' }, process.env.JWT_SECRET || 'healthlink-secret-key-change-in-production', { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/v1/healthcare/patients')
      .set('Authorization', `Bearer ${token}`)
      .timeout(5000);

    console.log('STATUS', res.status);
    console.log('BODY', JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error('ERROR making request:', err);
    process.exit(1);
  }
})();