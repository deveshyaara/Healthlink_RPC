#!/usr/bin/env node
/**
 * Debug Registration Script
 * Tests user registration flow with detailed error logging
 * Bypasses global error handler to show full stack traces
 */

import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better visibility
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function debugRegister() {
  try {
    logSection('🔍 DEBUG: User Registration Flow');

    // Step 1: Load environment variables
    log('\n[1/7] Loading Environment Variables...', 'blue');
    const walletPath = process.env.WALLET_PATH || path.resolve(__dirname, 'wallet');
    const connectionProfilePath = process.env.CONNECTION_PROFILE_PATH || 
      path.resolve(__dirname, 'config/connection-profile.json');
    const adminUserId = process.env.ADMIN_USER_ID || 'admin';
    const mspId = process.env.MSP_ID || 'Org1MSP';

    log(`   WALLET_PATH: ${walletPath}`, 'magenta');
    log(`   CONNECTION_PROFILE: ${connectionProfilePath}`, 'magenta');
    log(`   ADMIN_USER_ID: ${adminUserId}`, 'magenta');
    log(`   MSP_ID: ${mspId}`, 'magenta');

    // Step 2: Check wallet directory
    log('\n[2/7] Checking Wallet Directory...', 'blue');
    const walletExists = fs.existsSync(walletPath);
    log(`   Wallet exists: ${walletExists ? '✅ YES' : '❌ NO'}`, walletExists ? 'green' : 'red');
    
    if (!walletExists) {
      log(`   Creating wallet directory: ${walletPath}`, 'yellow');
      fs.mkdirSync(walletPath, { recursive: true });
      log('   ✅ Directory created', 'green');
    }

    // List wallet contents
    const walletFiles = fs.readdirSync(walletPath);
    log(`   Wallet contains ${walletFiles.length} identities:`, 'magenta');
    walletFiles.forEach(file => {
      log(`      - ${file}`, 'magenta');
    });

    // Step 3: Initialize wallet
    log('\n[3/7] Initializing Wallet...', 'blue');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    log('   ✅ Wallet initialized', 'green');

    // Step 4: Check admin identity
    log('\n[4/7] Checking Admin Identity...', 'blue');
    const adminIdentity = await wallet.get(adminUserId);
    
    if (!adminIdentity) {
      log(`   ❌ CRITICAL: Admin identity "${adminUserId}" NOT FOUND in wallet!`, 'red');
      log(`   Location checked: ${walletPath}/${adminUserId}.id`, 'red');
      log('\n   🔧 Fix: Run bootstrap_admin.js to enroll admin', 'yellow');
      process.exit(1);
    }
    
    log(`   ✅ Admin identity found: ${adminUserId}`, 'green');
    log(`      MSP ID: ${adminIdentity.mspId}`, 'magenta');
    log(`      Type: ${adminIdentity.type}`, 'magenta');

    // Step 5: Load connection profile
    log('\n[5/7] Loading Connection Profile...', 'blue');
    if (!fs.existsSync(connectionProfilePath)) {
      log(`   ❌ CRITICAL: Connection profile NOT FOUND!`, 'red');
      log(`   Path: ${connectionProfilePath}`, 'red');
      process.exit(1);
    }

    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
    log('   ✅ Connection profile loaded', 'green');

    // Get CA info
    const caName = Object.keys(connectionProfile.certificateAuthorities)[0];
    const caInfo = connectionProfile.certificateAuthorities[caName];
    
    log(`   CA Name: ${caInfo.caName}`, 'magenta');
    log(`   CA URL: ${caInfo.url}`, 'magenta');

    // Step 6: Initialize CA client
    log('\n[6/7] Initializing CA Client...', 'blue');
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const caClient = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );
    log('   ✅ CA client initialized', 'green');

    // Step 7: Test user registration
    log('\n[7/7] Testing User Registration...', 'blue');
    const testUserId = `debug_user_${Date.now()}`;
    log(`   Test User ID: ${testUserId}`, 'magenta');

    // Check if user already exists
    const existingUser = await wallet.get(testUserId);
    if (existingUser) {
      log(`   ⚠️  User already exists, using different ID`, 'yellow');
    }

    // Build admin user context
    log('   Building admin user context...', 'blue');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
    log('   ✅ Admin context created', 'green');

    // Register the user
    log('   Registering user with CA...', 'blue');
    const secret = await caClient.register(
      {
        affiliation: 'org1.department1',
        enrollmentID: testUserId,
        role: 'client',
        attrs: [{ name: 'role', value: 'client', ecert: true }],
      },
      adminUser
    );
    log(`   ✅ User registered, secret: ${secret.substring(0, 10)}...`, 'green');

    // Enroll the user
    log('   Enrolling user...', 'blue');
    const enrollment = await caClient.enroll({
      enrollmentID: testUserId,
      enrollmentSecret: secret,
    });
    log('   ✅ User enrolled successfully', 'green');

    // Store in wallet
    log('   Storing identity in wallet...', 'blue');
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: mspId,
      type: 'X.509',
    };

    await wallet.put(testUserId, x509Identity);
    log('   ✅ Identity stored in wallet', 'green');
    log(`   Location: ${walletPath}/${testUserId}.id`, 'magenta');

    // Verify it was stored
    const verifyUser = await wallet.get(testUserId);
    if (verifyUser) {
      log('\n✅ SUCCESS: User registration completed!', 'green');
      log(`   User ID: ${testUserId}`, 'green');
      log(`   MSP ID: ${verifyUser.mspId}`, 'green');
      log(`   Type: ${verifyUser.type}`, 'green');
    }

    logSection('✅ All Checks Passed - Registration Working!');

  } catch (error) {
    logSection('❌ ERROR DETECTED');
    log(`Error Type: ${error.constructor.name}`, 'red');
    log(`Error Message: ${error.message}`, 'red');
    
    if (error.stack) {
      log('\nFull Stack Trace:', 'yellow');
      console.error(error.stack);
    }

    if (error.cause) {
      log('\nCaused By:', 'yellow');
      console.error(error.cause);
    }

    log('\n🔧 Common Fixes:', 'cyan');
    log('   1. Run: node bootstrap_admin.js (if admin missing)', 'yellow');
    log('   2. Check WALLET_PATH in .env matches actual wallet location', 'yellow');
    log('   3. Verify CONNECTION_PROFILE_PATH points to valid JSON', 'yellow');
    log('   4. Ensure Fabric CA is running: docker ps | grep ca', 'yellow');
    log('   5. Check middleware-api/logs/ for detailed errors', 'yellow');

    process.exit(1);
  }
}

// Run the debug script
log('Starting HealthLink Registration Debug...', 'cyan');
log('Press Ctrl+C to abort\n', 'yellow');

debugRegister();
