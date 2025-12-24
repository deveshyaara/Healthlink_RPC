import pg from 'pg';
const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
(async ()=>{
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%patient%'");
    console.log('tables:', r.rows);
  } catch (e) {
    console.error('query failed:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();