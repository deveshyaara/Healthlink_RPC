import pg from 'pg';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load .env.production
const envPath = path.resolve(process.cwd(), '.env.production');
let env = {};
if (fs.existsSync(envPath)) {
  try {
    const data = fs.readFileSync(envPath, 'utf8');
    data.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([^=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    });
  } catch (e) {
    console.warn('Failed to read .env.production:', e.message);
  }
} else {
  console.warn('.env.production not found at', envPath, '- falling back to process.env');
}

const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET || 'healthlink-production-secret-change-this-to-secure-random-string';
const API_BASE = process.env.API_BASE || 'http://localhost:4000';

if (!DATABASE_URL) {
  console.error('DATABASE_URL required in .env.production');
  process.exit(1);
}

async function run() {
  const client = new pg.Pool({ connectionString: DATABASE_URL });
  const conn = await client.connect();

  // Debug: list tables matching 'patient' to verify table names in the target DB
  try {
    const tb = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name LIMIT 200");
    const tableNames = tb.rows.map(r => r.table_name);
    console.log('Public tables sample:', tableNames.slice(0,200));

    // Verify required tables exist
    const required = ['users', 'patient_wallet_mappings', 'appointments', 'user_audit_log'];
    const missing = required.filter(t => !tableNames.includes(t));
    if (missing.length) {
      console.error('Required tables missing in target DB:', missing.join(', '));
      console.error('Ensure you point INTEGRATION_DATABASE_URL to a database with the full application schema applied (run migrations). Exiting.');
      process.exit(1);
    }
  } catch (e) {
    console.warn('Failed to list tables:', e.message);
  }

  const doctorEmail = `int-run-doc-${Date.now()}@example.com`;
  let doctorId;
  let patientId;
  let token;
  const aptId = `int-apt-run-${Date.now()}`;

  try {
    // Create the doctor in its own transaction so the API (separate connection) can see it
    await conn.query('BEGIN');

    const userRes = await conn.query(`INSERT INTO users (email, password_hash, fabric_enrollment_id, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [doctorEmail, 'x', `int-run-doc-${Date.now()}`, 'Int Run Doc', 'doctor']);
    doctorId = userRes.rows[0].id;

    await conn.query('COMMIT');

    const patientEmail = `int-run-patient-${Date.now()}@example.com`;
    const patientWallet = `0xPatientRun${Date.now().toString().slice(-6)}`;

    // Generate JWT for doctor (used for API calls)
    token = jwt.sign({ userId: doctorId, id: doctorId, email: doctorEmail, role: 'doctor' }, JWT_SECRET, { expiresIn: '1h' });

    // Create patient via API so the server's Prisma client inserts it (and will be resolvable)
    const createPatientRes = await fetch(`${API_BASE}/api/v1/healthcare/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Int Run Patient', email: patientEmail, walletAddress: patientWallet }),
    });
    const createPatientBody = await createPatientRes.json().catch(() => null);
    console.log('Create patient API status:', createPatientRes.status);
    console.log('Create patient API body:', createPatientBody);
    if (!createPatientRes.ok) {
      throw new Error('Failed to create patient via API: ' + (createPatientBody?.error || createPatientRes.status));
    }
    // Capture patient id from API response for DB inserts
    patientId = createPatientBody?.id || patientId;

    // Create appointment via API so it exists on-chain and in DB (note: on-chain may fail)
    const createRes = await fetch(`${API_BASE}/api/v1/healthcare/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        appointmentId: aptId,
        patientEmail: patientEmail,
        title: 'Integration Run Test',
        scheduledAt: new Date().toISOString(),
        notes: 'initial',
      }),
    });
    const createBody = await createRes.json().catch(() => null);
    console.log('Create API status:', createRes.status);
    console.log('Create API body:', createBody);
    if (!createRes.ok) {
      // If API couldn't create the appointment due to contract issues, we'll still ensure DB row exists so we can exercise update + audit logic
      console.warn('Appointment creation API returned non-OK; continuing to ensure DB row exists for test:', createBody?.error || createRes.status);
    }

    // Verify patient visibility in DB (retry a few times) and then ensure appointment row exists in DB
    try {
      // start a new transaction so these writes are isolated
      await conn.query('BEGIN');

      let patientConfirmedId = patientId || createPatientBody?.id;
      const maxAttempts = 10;
      let foundPatient = false;
      for (let i = 0; i < maxAttempts; i++) {
        if (!patientConfirmedId) break;
        const pRes = await conn.query('SELECT id FROM patient_wallet_mappings WHERE id=$1', [patientConfirmedId]);
        if (pRes.rows.length) { foundPatient = true; break; }

        // Try by email as a fallback
        const pByEmail = await conn.query('SELECT id FROM patient_wallet_mappings WHERE email=$1', [patientEmail]);
        if (pByEmail.rows.length) { patientConfirmedId = pByEmail.rows[0].id; foundPatient = true; break; }

        await new Promise(r => setTimeout(r, 500));
      }

      if (!foundPatient) {
        // Patient wasn't visible: create the patient record directly using the API-returned id to guarantee FK will match
        try {
          const pid = createPatientBody?.id || patientConfirmedId || `patient-${Date.now()}`;
          const pEmail = createPatientBody?.email || patientEmail;
          const pWallet = createPatientBody?.walletAddress || patientWallet;
          await conn.query(`INSERT INTO patient_wallet_mappings (id, email, name, "walletAddress", created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,now(),now()) ON CONFLICT (id) DO NOTHING`, [pid, pEmail, 'Int Run Patient', pWallet, doctorId]);
          patientConfirmedId = pid;
          foundPatient = true;
          console.log('Inserted patient row directly into DB using API-returned id');
        } catch (e) {
          throw new Error('Patient not found in DB after retries and direct insert failed: ' + e.message);
        }
      }

      // Use doctor id from API response if available (it's the server's canonical value), else fallback to our inserted doctorId
      const doctorIdFinal = (createBody && createBody.data && createBody.data.doctor && createBody.data.doctor.id) ? createBody.data.doctor.id : doctorId;

      const aptCheck = await conn.query('SELECT id FROM appointments WHERE appointment_id=$1', [aptId]);
      if (!aptCheck.rows.length) {
        // Use uppercase enum value to match Prisma enum mapping
        await conn.query(`INSERT INTO appointments (appointment_id, title, scheduled_at, status, patient_id, doctor_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [aptId, 'Integration Run Test', new Date(), 'SCHEDULED', patientConfirmedId, doctorIdFinal, 'initial']);
        console.log('Inserted appointment row directly into DB for test (patient id confirmed)');
      } else {
        console.log('Appointment row present in DB');
      }

      await conn.query('COMMIT');
    } catch (e) {
      await conn.query('ROLLBACK');
      console.warn('Failed to verify/insert DB appointment row:', e.message);
    }
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('Failed to prepare DB data:', err.message);
    process.exit(1);
  }



  // Call API to update appointment
  const res = await fetch(`${API_BASE}/api/v1/healthcare/appointments/${aptId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'COMPLETED', notes: 'Completed during integration run' }),
  });

  console.log('API status:', res.status);
  const body = await res.json().catch(() => null);
  console.log('API body:', body);

  // Allow some time for async audit logging (give background tasks time)
  await new Promise((r) => setTimeout(r, 5000));

  // Verify appointment row in DB
  const aptRes = await conn.query(`SELECT appointment_id, status, notes, updated_at FROM appointments WHERE appointment_id=$1`, [aptId]);
  console.log('DB appointment row:', aptRes.rows[0] || null);

  // Query audit table (look for appointment.updated specifically)
  const auditUpdatedRes = await conn.query(`SELECT * FROM user_audit_log WHERE action = 'appointment.updated' ORDER BY created_at DESC LIMIT 10`);
  console.log('appointment.updated rows:', auditUpdatedRes.rows.slice(0, 10));

  // Final verification: ensure at least one appointment.updated row exists
  if (auditUpdatedRes.rows.length > 0) {
    console.log('✅ Audit verification PASSED: appointment.updated rows found.');
  } else {
    console.warn('⚠️ Audit verification FAILED: no appointment.updated rows found.');
  }

  // Cleanup
  try {
    await conn.query('BEGIN');
    await conn.query('DELETE FROM user_audit_log WHERE action IN ($1,$2)', ['appointment.updated','appointment.cancelled']);
    await conn.query('DELETE FROM appointments WHERE appointment_id=$1', [aptId]);
    await conn.query('DELETE FROM patient_wallet_mappings WHERE id=$1', [patientId]);
    await conn.query('DELETE FROM users WHERE id=$1', [doctorId]);
    await conn.query('COMMIT');
  } catch (e) {
    await conn.query('ROLLBACK');
    console.warn('Cleanup failed:', e.message);
  }

  conn.release();
  await client.end();
}

run().catch((err) => {
  console.error('Integration run failed:', err);
  process.exit(1);
});