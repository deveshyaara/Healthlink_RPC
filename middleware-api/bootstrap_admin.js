#!/usr/bin/env node
/**
 * Bootstrap Admin Script
 * Re-enrolls admin identity into the wallet
 * Use this if admin identity is missing after path changes
 */

import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// ANSI colors
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

async function bootstrapAdmin() {
  try {
    logSection('🔧 Bootstrap Admin Identity');

    // Configuration from environment
    const walletPath = process.env.WALLET_PATH || path.resolve(__dirname, 'wallet');
    const connectionProfilePath = process.env.CONNECTION_PROFILE_PATH || 
      path.resolve(__dirname, 'config/connection-profile.json');
    const adminUserId = process.env.ADMIN_USER_ID || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpw';
    const mspId = process.env.MSP_ID || 'Org1MSP';

    log('\n📋 Configuration:', 'blue');
    log(`   Wallet Path: ${walletPath}`, 'magenta');
    log(`   Connection Profile: ${connectionProfilePath}`, 'magenta');
    log(`   Admin User ID: ${adminUserId}`, 'magenta');
    log(`   Admin Password: ${adminPassword.substring(0, 3)}***`, 'magenta');
    log(`   MSP ID: ${mspId}`, 'magenta');

    // Step 1: Ensure wallet directory exists
    log('\n[1/5] Ensuring Wallet Directory Exists...', 'blue');
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
      log(`   ✅ Created: ${walletPath}`, 'green');
    } else {
      log(`   ✅ Already exists: ${walletPath}`, 'green');
    }

    // Step 2: Initialize wallet
    log('\n[2/5] Initializing Wallet...', 'blue');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    log('   ✅ Wallet initialized', 'green');

    // Step 3: Check if admin already exists
    log('\n[3/5] Checking Existing Admin Identity...', 'blue');
    const existingAdmin = await wallet.get(adminUserId);
    
    if (existingAdmin) {
      log(`   ⚠️  Admin identity already exists in wallet`, 'yellow');
      log(`   MSP ID: ${existingAdmin.mspId}`, 'magenta');
      log(`   Type: ${existingAdmin.type}`, 'magenta');
      
      log('\n   ❓ Do you want to re-enroll? This will replace the existing identity.', 'yellow');
      log('   If you want to continue, delete the existing admin.id file and re-run:', 'yellow');
      log(`   rm ${walletPath}/${adminUserId}.id`, 'cyan');
      
      process.exit(0);
    }

    log('   ✅ No existing admin found, proceeding with enrollment', 'green');

    // Step 4: Load connection profile and initialize CA
    log('\n[4/5] Initializing Certificate Authority Client...', 'blue');
    
    if (!fs.existsSync(connectionProfilePath)) {
      log(`   ❌ ERROR: Connection profile not found!`, 'red');
      log(`   Path: ${connectionProfilePath}`, 'red');
      process.exit(1);
    }

    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
    
    // Get CA info (first CA in the profile)
    const caKey = Object.keys(connectionProfile.certificateAuthorities)[0];
    const caInfo = connectionProfile.certificateAuthorities[caKey];
    
    log(`   CA Name: ${caInfo.caName}`, 'magenta');
    log(`   CA URL: ${caInfo.url}`, 'magenta');

    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const caClient = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );
    
    log('   ✅ CA client initialized', 'green');

    // Step 5: Enroll admin
    log('\n[5/5] Enrolling Admin User...', 'blue');
    log(`   Enrollment ID: ${adminUserId}`, 'magenta');
    log(`   Enrollment Secret: ${adminPassword}`, 'magenta');

    const enrollment = await caClient.enroll({
      enrollmentID: adminUserId,
      enrollmentSecret: adminPassword,
    });

    log('   ✅ Enrollment successful', 'green');
    log(`   Certificate length: ${enrollment.certificate.length} chars`, 'magenta');
    log(`   Private key length: ${enrollment.key.toBytes().length} chars`, 'magenta');

    // Create X.509 identity
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: mspId,
      type: 'X.509',
    };

    // Store in wallet
    await wallet.put(adminUserId, x509Identity);
    log('   ✅ Identity stored in wallet', 'green');
    log(`   Location: ${walletPath}/${adminUserId}.id`, 'magenta');

    // Verify
    const verifyAdmin = await wallet.get(adminUserId);
    if (verifyAdmin) {
      logSection('✅ SUCCESS: Admin Bootstrap Complete!');
      log(`\n   Admin User ID: ${adminUserId}`, 'green');
      log(`   MSP ID: ${verifyAdmin.mspId}`, 'green');
      log(`   Type: ${verifyAdmin.type}`, 'green');
      log(`   Wallet Location: ${walletPath}`, 'green');
      
      log('\n📝 Next Steps:', 'cyan');
      log('   1. Restart your middleware server', 'yellow');
      log('   2. Test registration: node debug_register.js', 'yellow');
      log('   3. Try signing up via frontend', 'yellow');
    }

  } catch (error) {
    logSection('❌ BOOTSTRAP FAILED');
    log(`Error Type: ${error.constructor.name}`, 'red');
    log(`Error Message: ${error.message}`, 'red');
    
    if (error.stack) {
      log('\nFull Stack Trace:', 'yellow');
      console.error(error.stack);
    }

    log('\n🔧 Troubleshooting:', 'cyan');
    log('   1. Check if Fabric CA is running:', 'yellow');
    log('      docker ps | grep ca-org1', 'cyan');
    log('\n   2. Verify CA is accessible:', 'yellow');
    log('      curl -k https://localhost:7054/cainfo', 'cyan');
    log('\n   3. Check connection profile has correct CA URL:', 'yellow');
    log(`      cat ${process.env.CONNECTION_PROFILE_PATH || 'config/connection-profile.json'}`, 'cyan');
    log('\n   4. Verify admin credentials (admin/adminpw):', 'yellow');
    log('      Default Fabric test network uses admin/adminpw', 'cyan');
    log('\n   5. If CA is on different port, update .env:', 'yellow');
    log('      CA_URL=https://localhost:7054', 'cyan');

    process.exit(1);
  }
}

// Run the bootstrap
log('Starting Admin Bootstrap Process...', 'cyan');
log('This will enroll admin user with the Certificate Authority\n', 'yellow');

bootstrapAdmin();
