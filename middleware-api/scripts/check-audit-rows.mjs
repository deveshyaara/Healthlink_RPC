import pg from 'pg';
const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('INTEGRATION_DATABASE_URL required'); process.exit(1); }
(async function(){
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, user_id, action, created_at FROM user_audit_log ORDER BY created_at DESC LIMIT 20`);
    console.log('Latest audit rows:', res.rows);
  } catch (e) {
    console.error('Query failed:', e.message);
  } finally { client.release(); await pool.end(); }
})();