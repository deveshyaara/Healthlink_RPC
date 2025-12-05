import pg from 'pg';
import 'dotenv/config';
import { readFileSync } from 'fs';

async function main() {
  const client = new pg.Client({ 
    connectionString: process.env.DIRECT_URL 
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('Reading SQL schema...');
    const sql = readFileSync('create_tables.sql', 'utf-8');
    
    console.log('Executing schema creation...\n');
    await client.query(sql);
    
    console.log('✅ Schema created successfully!\n');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_audit_log')
      ORDER BY table_name
    `);
    
    console.log('Tables created:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
