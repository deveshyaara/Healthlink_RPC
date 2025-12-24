import pg from 'pg';

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('INTEGRATION_DATABASE_URL or DATABASE_URL must be set');
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create patient wallet mappings table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_wallet_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        "walletAddress" VARCHAR(42) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Create appointments table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        patient_id UUID REFERENCES patient_wallet_mappings(id) ON DELETE CASCADE,
        doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
        notes TEXT,
        location VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await client.query('COMMIT');
    console.log('Created missing integration tables (if they did not exist).');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to create tables:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Script failed:', e.message);
  process.exit(1);
});
