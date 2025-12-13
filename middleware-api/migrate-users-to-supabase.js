/**
 * ============================================
 * MIGRATION SCRIPT: JSON to Supabase
 * ============================================
 * Purpose: Migrate users from local JSON file to Supabase PostgreSQL
 * Safe: Preserves original JSON file, skips existing users
 * ============================================
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Configuration
const JSON_FILE_PATH = './data/users.json';
const DRY_RUN = process.argv.includes('--dry-run'); // Test without writing

/**
 * Initialize Supabase client with service role
 */
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Load users from JSON file
 */
function loadUsersFromJSON() {
  console.log(`📖 Reading users from: ${JSON_FILE_PATH}`);
  const fileContent = readFileSync(JSON_FILE_PATH, 'utf-8');
  const data = JSON.parse(fileContent);
  
  const users = data.users || [];
  console.log(`✅ Found ${users.length} users in JSON file\n`);
  
  return users;
}

/**
 * Transform JSON user to Supabase schema
 */
function transformUser(jsonUser) {
  // Extract role-specific fields from userId or metadata
  const isDoctorRole = jsonUser.role === 'doctor';
  const isPatientRole = jsonUser.role === 'patient';

  return {
    email: jsonUser.email.toLowerCase(),
    password_hash: jsonUser.passwordHash, // Already bcrypt hashed
    role: jsonUser.role,
    fabric_enrollment_id: jsonUser.userId,
    full_name: jsonUser.name || jsonUser.email.split('@')[0],
    phone_number: jsonUser.phoneNumber || null,
    
    // Doctor fields (if applicable)
    doctor_license_number: isDoctorRole ? jsonUser.doctorLicenseNumber || null : null,
    doctor_specialization: isDoctorRole ? jsonUser.doctorSpecialization || null : null,
    doctor_hospital_affiliation: isDoctorRole ? jsonUser.doctorHospitalAffiliation || null : null,
    doctor_verification_status: isDoctorRole ? 'pending' : null,
    
    // Patient fields (if applicable)
    patient_date_of_birth: isPatientRole ? jsonUser.patientDateOfBirth || null : null,
    patient_blood_group: isPatientRole ? jsonUser.patientBloodGroup || null : null,
    patient_emergency_contact: isPatientRole ? jsonUser.patientEmergencyContact || null : null,
    
    // Status fields
    is_active: jsonUser.isActive !== false,
    email_verified: false,
    last_login_at: jsonUser.lastLogin || null,
    created_at: jsonUser.createdAt || new Date().toISOString(),
  };
}

/**
 * Check if user already exists in Supabase
 */
async function userExists(supabase, email, fabricId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .or(`email.eq.${email},fabric_enrollment_id.eq.${fabricId}`)
    .limit(1);

  if (error) {
    console.error(`   ❌ Error checking user: ${error.message}`);
    return true; // Assume exists to avoid duplicates
  }

  return data && data.length > 0;
}

/**
 * Insert user into Supabase
 */
async function insertUser(supabase, user, dryRun = false) {
  if (dryRun) {
    console.log(`   🔍 [DRY RUN] Would insert: ${user.email}`);
    return { success: true, data: user };
  }

  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select('id, email, fabric_enrollment_id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('============================================');
  console.log('  JSON to Supabase Migration');
  console.log('============================================\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE: No changes will be made\n');
  }

  try {
    // Step 1: Initialize
    const supabase = initializeSupabase();
    console.log('✅ Supabase connected\n');

    // Step 2: Load JSON users
    const jsonUsers = loadUsersFromJSON();

    if (jsonUsers.length === 0) {
      console.log('⚠️  No users found in JSON file. Nothing to migrate.');
      return;
    }

    // Step 3: Migrate users
    console.log('📊 Migration Progress:');
    console.log('─────────────────────────────────────────\n');

    const stats = {
      total: jsonUsers.length,
      success: 0,
      skipped: 0,
      failed: 0,
    };

    for (const jsonUser of jsonUsers) {
      const email = jsonUser.email;
      console.log(`Processing: ${email}`);

      try {
        // Check if already exists
        const exists = await userExists(supabase, email, jsonUser.userId);
        
        if (exists) {
          console.log(`   ⏭️  Already exists (skipping)\n`);
          stats.skipped++;
          continue;
        }

        // Transform and insert
        const transformedUser = transformUser(jsonUser);
        const result = await insertUser(supabase, transformedUser, DRY_RUN);

        if (result.success) {
          console.log(`   ✅ Migrated successfully`);
          if (result.data) {
            console.log(`      ID: ${result.data.id || 'N/A'}`);
            console.log(`      Fabric ID: ${result.data.fabric_enrollment_id || jsonUser.userId}`);
          }
          console.log('');
          stats.success++;
        } else {
          console.log(`   ❌ Failed: ${result.error}\n`);
          stats.failed++;
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        stats.failed++;
      }
    }

    // Step 4: Print summary
    console.log('============================================');
    console.log('  Migration Summary');
    console.log('============================================');
    console.log(`Total Users:       ${stats.total}`);
    console.log(`✅ Migrated:       ${stats.success}`);
    console.log(`⏭️  Skipped:        ${stats.skipped}`);
    console.log(`❌ Failed:         ${stats.failed}`);
    console.log('============================================\n');

    if (DRY_RUN) {
      console.log('💡 This was a DRY RUN. Run without --dry-run to apply changes.\n');
    } else if (stats.success > 0) {
      console.log('✅ Migration complete! Users are now in Supabase.\n');
      console.log('🔧 Next steps:');
      console.log('   1. Verify data in Supabase dashboard');
      console.log('   2. Test login with migrated accounts');
      console.log('   3. Enable Supabase in .env (set SUPABASE_URL and SUPABASE_SERVICE_KEY)');
      console.log('   4. Restart your backend server');
      console.log('   5. Backup/archive users.json file\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log('Done!');
  process.exit(0);
});
