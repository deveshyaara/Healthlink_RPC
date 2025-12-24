import pg from 'pg';
const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
const apt = process.argv[2];
if (!DATABASE_URL) { console.error('INTEGRATION_DATABASE_URL required'); process.exit(1); }
if (!apt) { console.error('Usage: node query-appointment.mjs <appointmentId>'); process.exit(1); }
(async ()=>{
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const c = await pool.connect();
  try {
    const r = await c.query('SELECT appointment_id,status,notes,updated_at FROM appointments WHERE appointment_id=$1', [apt]);
    console.log('rows:', r.rows);
  } catch (e) { console.error('query failed:', e.message); } finally { c.release(); await pool.end(); }
})();