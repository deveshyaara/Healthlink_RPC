import pg from 'pg';
import jwt from 'jsonwebtoken';

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'healthlink-production-secret-change-this-to-secure-random-string';
if (!DATABASE_URL) { console.error('INTEGRATION_DATABASE_URL required'); process.exit(1); }

(async function(){
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const email = `int-doctor-${Date.now()}@example.com`;
    const fabricId = `int-doc-${Date.now()}`;
    const res = await client.query(`INSERT INTO users (email, password_hash, fabric_enrollment_id, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email`, [email, 'x', fabricId, 'Integration Doctor', 'doctor']);
    const id = res.rows[0].id;
    const token = jwt.sign({ userId: id, id, email, role: 'doctor' }, JWT_SECRET, { expiresIn: '1h' });
    console.log('doctorId:', id);
    console.log('doctorEmail:', email);
    console.log('token:', token);
    process.exit(0);
  } catch (e) {
    console.error('Failed to create doctor:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();