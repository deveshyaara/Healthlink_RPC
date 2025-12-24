import pg from 'pg';

// Idempotent script to ensure appointment_status enum exists and appointments.status uses it
// Usage: INTEGRATION_DATABASE_URL=... node scripts/create-db-enums.mjs

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('INTEGRATION_DATABASE_URL or DATABASE_URL env var must be set');
  process.exit(1);
}

(async function main(){
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('Checking for enum type appointment_status...');
    const typeRes = await client.query("SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'appointment_status') as exists");
    const exists = typeRes.rows[0].exists;

    if (!exists) {
      console.log('Enum appointment_status not found. Creating type...');
      await client.query('BEGIN');
      // Create enum with values that match Prisma's AppointmentStatus mapping
      await client.query("CREATE TYPE public.appointment_status AS ENUM ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW')");
      await client.query('COMMIT');
      console.log('Created enum type appointment_status');
    } else {
      console.log('Enum appointment_status already exists; skipping create');
    }

    // Check appointments.status column type
    const colRes = await client.query("SELECT udt_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='status'");
    if (!colRes.rows.length) {
      console.warn('appointments.status column not found. Ensure the appointments table exists and schema matches. Exiting.');
      client.release();
      await pool.end();
      process.exit(0);
    }

    const udtName = colRes.rows[0].udt_name; // e.g., 'appointment_status' or 'varchar'
    console.log('appointments.status current udt_name:', udtName);

    if (udtName === 'appointment_status') {
      console.log('appointments.status is already using appointment_status enum; nothing to do.');
      client.release();
      await pool.end();
      process.exit(0);
    }

    // Normalize existing values to match enum labels
    console.log('Normalizing appointment status values to uppercase and validating');
    await client.query("UPDATE appointments SET status = UPPER(status) WHERE status IS NOT NULL");

    // Set any unknown or NULL statuses to default 'SCHEDULED' to avoid cast errors
    await client.query("UPDATE appointments SET status = 'SCHEDULED' WHERE status IS NULL OR status NOT IN ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW')");

    // Now alter the column to use the enum (safe cast)
    console.log('Altering appointments.status column to appointment_status enum (this may lock the table briefly)');
    await client.query('BEGIN');

    // Drop the default first so it doesn't interfere with type change
    try {
      await client.query('ALTER TABLE appointments ALTER COLUMN status DROP DEFAULT');
    } catch (e) {
      // ignore if no default existed
      console.warn('Dropping default for appointments.status failed or not necessary:', e.message || e);
    }

    // Perform the type change using a safe cast
    await client.query("ALTER TABLE appointments ALTER COLUMN status TYPE appointment_status USING status::appointment_status");

    // Set the canonical default on the new enum type
    await client.query("ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'SCHEDULED'::appointment_status");

    await client.query('COMMIT');

    console.log('appointments.status successfully converted to appointment_status enum');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch(e){/*ignore*/}
    console.error('Migration failed:', err.message || err);
    client.release();
    await pool.end();
    process.exit(1);
  }
})();