import pg from 'pg';
import 'dotenv/config';

const table = process.argv[2];
if (!table) {
  console.error('Usage: node inspect-table-columns.mjs <table_name>');
  process.exit(1);
}

(async () => {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
  try {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    if (res.rows.length === 0) {
      console.log(`Table '${table}' does not exist or has no columns.`);
    } else {
      console.log(`Columns for table '${table}':`);
      res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`));
    }
  } catch (err) {
    console.error('Error querying columns:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();