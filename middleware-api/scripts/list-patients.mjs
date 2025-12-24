import pg from 'pg';
const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('INTEGRATION_DATABASE_URL required'); process.exit(1); }
(async ()=>{
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const c = await pool.connect();
  try {
    const r = await c.query('SELECT id,email,name,\"walletAddress\" FROM patient_wallet_mappings ORDER BY created_at DESC LIMIT 20');
    console.log('patients:', r.rows);
  } catch (e) { console.error('query failed', e.message); }
  finally { c.release(); await pool.end(); }
})();