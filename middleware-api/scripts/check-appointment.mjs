import pg from 'pg';
const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('INTEGRATION_DATABASE_URL required'); process.exit(1); }
(async function(){
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT appointment_id, status, notes, updated_at FROM appointments WHERE appointment_id LIKE 'int-apt-run-%' ORDER BY updated_at DESC LIMIT 10");
    console.log('Appointments found:', res.rows);
  } catch (e) {
    console.error('Query failed:', e.message);
  } finally { client.release(); await pool.end(); }
})();