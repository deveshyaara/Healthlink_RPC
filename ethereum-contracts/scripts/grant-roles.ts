/**
 * Grant Roles Script
 * 
 * Grants DOCTOR_ROLE to a specified address
 * Run as deployer/admin who has permission to grant roles
 * 
 * Usage:
 * ```bash
 * npx hardhat run scripts/grant-roles.js --network sepolia ADDRESS
 * # or
 * node scripts/grant-roles.js 0x1234567890abcdef1234567890abcdef12345678
 * ```
 * 
 * Features:
 * - Accepts address as command line argument
 * - Connects as deployer (has DEFAULT_ADMIN_ROLE)
 * - Grants DOCTOR_ROLE to specified address
 * - Waits for transaction confirmation
 * - Prints success message only after mining
 * - Verifies role was granted successfully
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    GRANT DOCTOR ROLE SCRIPT                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Get address from command line
  const targetAddress = process.argv[2];
  
  if (!targetAddress) {
    console.error('❌ Error: No address provided');
    console.log('\n📖 Usage:');
    console.log('   npx hardhat run scripts/grant-roles.js --network sepolia ADDRESS');
    console.log('   node scripts/grant-roles.js 0x1234567890abcdef1234567890abcdef12345678\n');
    process.exit(1);
  }

  // Validate address format
  if (!ethers.isAddress(targetAddress)) {
    console.error(`❌ Error: Invalid Ethereum address: ${targetAddress}`);
    process.exit(1);
  }

  console.log(`🎯 Target Address: ${targetAddress}\n`);

  // Get deployer (should have DEFAULT_ADMIN_ROLE)
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer Address: ${deployer.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, '../contracts/deployment-addresses.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Error: deployment-addresses.json not found');
    console.log('   Please deploy contracts first using: npx hardhat run scripts/deploy.js --network sepolia\n');
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const healthlinkAddress = deploymentData.HealthLink;

  if (!healthlinkAddress) {
    console.error('❌ Error: HealthLink contract address not found in deployment file');
    process.exit(1);
  }

  console.log(`📄 HealthLink Contract: ${healthlinkAddress}\n`);

  // Get contract instance
  const HealthLink = await ethers.getContractFactory('HealthLink');
  const healthlink = HealthLink.attach(healthlinkAddress);

  // Calculate role hashes
  const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'));
  const PATIENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE'));

  console.log('🔑 Role Hashes:');
  console.log(`   DOCTOR_ROLE:  ${DOCTOR_ROLE}`);
  console.log(`   PATIENT_ROLE: ${PATIENT_ROLE}\n`);

  // Check if address already has roles
  console.log('🔍 Checking existing roles...');
  const hasDoctor = await healthlink.hasRole(DOCTOR_ROLE, targetAddress);
  const hasPatient = await healthlink.hasRole(PATIENT_ROLE, targetAddress);

  console.log(`   DOCTOR_ROLE:  ${hasDoctor ? '✅ Already has' : '❌ Does not have'}`);
  console.log(`   PATIENT_ROLE: ${hasPatient ? '✅ Already has' : '❌ Does not have'}\n`);

  // Grant roles
  const rolesToGrant: Array<{name: string, hash: string, has: boolean}> = [];
  
  if (!hasDoctor) {
    rolesToGrant.push({ name: 'DOCTOR_ROLE', hash: DOCTOR_ROLE, has: hasDoctor });
  }
  if (!hasPatient) {
    rolesToGrant.push({ name: 'PATIENT_ROLE', hash: PATIENT_ROLE, has: hasPatient });
  }

  if (rolesToGrant.length === 0) {
    console.log('✅ Address already has all roles. Nothing to do.\n');
    return;
  }

  console.log(`📝 Will grant ${rolesToGrant.length} role(s):\n`);

  // Grant each role
  for (const role of rolesToGrant) {
    try {
      console.log(`⏳ Granting ${role.name}...`);
      
      const tx = await healthlink.grantRole(role.hash, targetAddress);
      console.log(`   📤 Transaction Hash: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log(`   ✅ ${role.name} granted successfully!`);
        console.log(`   🧱 Block Number: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}\n`);
      } else {
        console.error(`   ❌ Transaction failed for ${role.name}\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error granting ${role.name}:`, error);
      if (error instanceof Error) {
        console.error(`      ${error.message}\n`);
      }
    }
  }

  // Verify roles were granted
  console.log('🔍 Verifying roles were granted...');
  const finalHasDoctor = await healthlink.hasRole(DOCTOR_ROLE, targetAddress);
  const finalHasPatient = await healthlink.hasRole(PATIENT_ROLE, targetAddress);

  console.log(`   DOCTOR_ROLE:  ${finalHasDoctor ? '✅ Confirmed' : '❌ Failed'}`);
  console.log(`   PATIENT_ROLE: ${finalHasPatient ? '✅ Confirmed' : '❌ Failed'}\n`);

  if (finalHasDoctor && finalHasPatient) {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                            SUCCESS                                 ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Address ${targetAddress} now has:         ║`);
    console.log('║ ✅ DOCTOR_ROLE                                                     ║');
    console.log('║ ✅ PATIENT_ROLE                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  } else {
    console.log('⚠️  Warning: Some roles may not have been granted successfully.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
