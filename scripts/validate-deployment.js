#!/usr/bin/env node

/**
 * HealthLink Environment & Deployment Validator
 * Run this script to validate all components before deployment
 */

import { createClient } from '@supabase/supabase-js';
import pinataSDK from '@pinata/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 HealthLink Deployment Validator');
console.log('==================================\n');

// Validation results
const results = {
  environment: false,
  supabase: false,
  pinata: false,
  gemini: false,
  database: false,
  files: false
};

async function validateEnvironment() {
  console.log('1️⃣  Validating Environment Variables...');

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PINATA_API_KEY',
    'PINATA_SECRET_API_KEY',
    'GEMINI_API_KEY',
    'ETHEREUM_RPC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

async function validateSupabase() {
  console.log('\n2️⃣  Validating Supabase Connection...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('patients')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function validatePinata() {
  console.log('\n3️⃣  Validating Pinata IPFS...');

  try {
    const pinata = new pinataSDK(
      process.env.PINATA_API_KEY,
      process.env.PINATA_SECRET_API_KEY
    );

    // Test authentication
    const result = await pinata.testAuthentication();
    if (result.authenticated) {
      console.log('✅ Pinata authentication successful');
      return true;
    } else {
      console.log('❌ Pinata authentication failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Pinata validation failed:', error.message);
    return false;
  }
}

async function validateGemini() {
  console.log('\n4️⃣  Validating Google Gemini...');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Simple test prompt
    const result = await model.generateContent('Hello, respond with "OK" if you can read this.');
    const response = result.response.text();

    if (response.includes('OK')) {
      console.log('✅ Gemini API working correctly');
      return true;
    } else {
      console.log('⚠️  Gemini responded but not as expected');
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini validation failed:', error.message);
    return false;
  }
}

async function validateDatabase() {
  console.log('\n5️⃣  Validating Database Schema...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if patients table exists and has correct structure
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('id, email, name, age, gender, wallet_address, ipfs_hash')
      .limit(1);

    if (patientsError) throw patientsError;

    // Check RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase.rpc('get_rls_status');

    if (rlsError && !rlsError.message.includes('function get_rls_status() does not exist')) {
      throw rlsError;
    }

    console.log('✅ Database schema is correct');
    return true;
  } catch (error) {
    console.log('❌ Database validation failed:', error.message);
    return false;
  }
}

async function validateFiles() {
  console.log('\n6️⃣  Validating Required Files...');

  const requiredFiles = [
    'frontend/src/app/api/patients/create/route.ts',
    'frontend/public/grid.svg',
    'middleware-api/src/controllers/chat.controller.js',
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql'
  ];

  const missingFiles = [];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.log('❌ Missing required files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }

  console.log('✅ All required files are present');
  return true;
}

async function runValidation() {
  results.environment = await validateEnvironment();
  results.supabase = await validateSupabase();
  results.pinata = await validatePinata();
  results.gemini = await validateGemini();
  results.database = await validateDatabase();
  results.files = await validateFiles();

  console.log('\n📊 Validation Summary');
  console.log('====================');

  const allPassed = Object.values(results).every(result => result);

  Object.entries(results).forEach(([key, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${key.charAt(0).toUpperCase() + key.slice(1)}`);
  });

  console.log('\n' + '='.repeat(30));

  if (allPassed) {
    console.log('🎉 All validations passed! Ready for deployment.');
    console.log('\n🚀 Next steps:');
    console.log('1. Deploy middleware API to Render');
    console.log('2. Deploy frontend to Vercel');
    console.log('3. Run health checks');
    console.log('4. Test patient creation and chat functionality');
    process.exit(0);
  } else {
    console.log('❌ Some validations failed. Please fix the issues above before deploying.');
    console.log('\n🔧 Common fixes:');
    console.log('- Check environment variables in .env.local');
    console.log('- Verify API keys are correct');
    console.log('- Ensure database migrations are applied');
    console.log('- Check file paths and permissions');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run validation
runValidation().catch((error) => {
  console.error('💥 Validation failed with error:', error);
  process.exit(1);
});