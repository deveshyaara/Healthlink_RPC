#!/usr/bin/env node
/**
 * Database Tables Verification Script
 * Verifies all required tables exist and have correct structure
 */

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or DIRECT_URL must be set');
  process.exit(1);
}

const REQUIRED_TABLES = [
  'users',
  'user_audit_log',
  'user_invitations',
  'patient_wallet_mappings',
  'appointments',
  'prescriptions',
  'medical_records',
  'consent_requests',
  'lab_tests',
];

const REQUIRED_COLUMNS = {
  users: ['id', 'email', 'password_hash', 'role', 'fabric_enrollment_id', 'full_name'],
  patient_wallet_mappings: ['id', 'email', 'wallet_address', 'name', 'created_by'],
  appointments: ['id', 'appointment_id', 'patient_id', 'doctor_id', 'scheduled_at', 'status'],
  prescriptions: ['id', 'prescription_id', 'patient_id', 'doctor_id', 'medication', 'status'],
  medical_records: ['id', 'record_id', 'patient_id', 'doctor_id', 'ipfs_hash', 'record_type'],
};

async function verifyDatabase() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying database tables...\n');

    // Check if tables exist
    const missingTables = [];
    const existingTables = [];

    for (const tableName of REQUIRED_TABLES) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      if (result.rows[0].exists) {
        existingTables.push(tableName);
        console.log(`✅ Table exists: ${tableName}`);
      } else {
        missingTables.push(tableName);
        console.log(`❌ Table missing: ${tableName}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Existing: ${existingTables.length}/${REQUIRED_TABLES.length}`);
    console.log(`   Missing: ${missingTables.length}/${REQUIRED_TABLES.length}`);

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:');
      missingTables.forEach(tbl => console.log(`   - ${tbl}`));
      console.log('\n💡 Run database-migration-complete.sql to create missing tables');
    }

    // Verify critical columns
    console.log('\n🔍 Verifying critical columns...\n');
    const columnIssues = [];

    for (const [tableName, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
      if (!existingTables.includes(tableName)) {
        continue; // Skip if table doesn't exist
      }

      for (const colName of requiredCols) {
        const result = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
          )`,
          [tableName, colName]
        );

        if (result.rows[0].exists) {
          console.log(`✅ Column exists: ${tableName}.${colName}`);
        } else {
          columnIssues.push(`${tableName}.${colName}`);
          console.log(`❌ Column missing: ${tableName}.${colName}`);
        }
      }
    }

    if (columnIssues.length > 0) {
      console.log('\n⚠️  Missing columns:');
      columnIssues.forEach(col => console.log(`   - ${col}`));
    }

    // Check for indexes
    console.log('\n🔍 Checking indexes...\n');
    const criticalIndexes = [
      { table: 'users', column: 'email' },
      { table: 'users', column: 'role' },
      { table: 'patient_wallet_mappings', column: 'email' },
      { table: 'patient_wallet_mappings', column: 'wallet_address' },
    ];

    for (const { table, column } of criticalIndexes) {
      if (!existingTables.includes(table)) continue;

      const result = await client.query(
        `SELECT COUNT(*) as count
         FROM pg_indexes 
         WHERE tablename = $1 
         AND indexdef LIKE $2`,
        [table, `%${column}%`]
      );

      if (parseInt(result.rows[0].count) > 0) {
        console.log(`✅ Index exists: ${table}.${column}`);
      } else {
        console.log(`⚠️  Index missing: ${table}.${column} (performance may be affected)`);
      }
    }

    // Final status
    console.log('\n' + '='.repeat(50));
    if (missingTables.length === 0 && columnIssues.length === 0) {
      console.log('✅ Database verification PASSED');
      console.log('All required tables and columns exist');
    } else {
      console.log('❌ Database verification FAILED');
      console.log('Please run database-migration-complete.sql to fix issues');
      process.exit(1);
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});

