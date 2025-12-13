require('dotenv').config();
const pg = require('pg');

const { Client } = pg;

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Step 1: Add missing columns
    console.log('\n📋 Adding missing columns...');
    await client.query(`
      ALTER TABLE healthlink_users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ Columns added successfully');

    // Step 2: Insert test users
    console.log('\n👥 Creating test users...');
    const passwordHash = '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG';
    
    await client.query(`
      INSERT INTO healthlink_users (
        email, password_hash, role, fabric_enrollment_id, 
        full_name, phone_number, email_verified, is_active
      ) VALUES 
        ($1, $2, 'admin', 'admin-fabric-001', 'System Administrator', '+1234567890', true, true),
        ($3, $2, 'doctor', 'doctor-fabric-001', 'Dr. John Smith', '+1234567891', true, true),
        ($4, $2, 'patient', 'patient-fabric-001', 'Jane Doe', '+1234567892', true, true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        fabric_enrollment_id = EXCLUDED.fabric_enrollment_id,
        full_name = EXCLUDED.full_name
    `, ['admin@healthlink.com', passwordHash, 'doctor@healthlink.com', 'patient@healthlink.com']);
    
    console.log('✅ Test users created');

    // Step 3: Verify
    console.log('\n📋 Users in database:');
    const result = await client.query('SELECT email, role, full_name, email_verified FROM healthlink_users ORDER BY created_at');
    result.rows.forEach(user => {
      console.log(`  ✓ ${user.email} (${user.role}) - ${user.full_name}`);
    });

    console.log('\n🎉 Setup complete! You can now login with:');
    console.log('   Email: admin@healthlink.com');
    console.log('   Password: Password@123');
    console.log('\n   OR');
    console.log('   Email: doctor@healthlink.com');
    console.log('   Password: Password@123');
    console.log('\n   OR');
    console.log('   Email: patient@healthlink.com');
    console.log('   Password: Password@123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
