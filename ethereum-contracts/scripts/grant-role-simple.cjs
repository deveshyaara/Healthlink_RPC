/**
 * Grant Roles Script
 * Simple wrapper for granting DOCTOR and PATIENT roles
 * 
 * Usage:
 * npx hardhat run scripts/grant-role-simple.ts --network sepolia
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    GRANT DOCTOR ROLE SCRIPT                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Target address - change this to the doctor's wallet address
  const targetAddress = '0x7C5c1D2A8ED6d47Bb3334AF5ac61558Dc1342742';

  console.log(`🎯 Target Address: ${targetAddress}\n`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer Address: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, '../deployment-addresses.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Error: deployment-addresses.json not found');
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const healthlinkAddress = deploymentData.contracts.HealthLink;

  console.log(`📄 HealthLink Contract: ${healthlinkAddress}\n`);

  // Get contract instance
  const HealthLink = await hre.ethers.getContractFactory('HealthLink');
  const healthlink = HealthLink.attach(healthlinkAddress);

  // Calculate role hashes
  const DOCTOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('DOCTOR_ROLE'));
  const PATIENT_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('PATIENT_ROLE'));

  console.log('🔑 Role Hashes:');
  console.log(`   DOCTOR_ROLE:  ${DOCTOR_ROLE}`);
  console.log(`   PATIENT_ROLE: ${PATIENT_ROLE}\n`);

  // Check existing roles
  console.log('🔍 Checking existing roles...');
  const hasDoctor = await healthlink.hasRole(DOCTOR_ROLE, targetAddress);
  const hasPatient = await healthlink.hasRole(PATIENT_ROLE, targetAddress);

  console.log(`   DOCTOR_ROLE:  ${hasDoctor ? '✅ Already has' : '❌ Does not have'}`);
  console.log(`   PATIENT_ROLE: ${hasPatient ? '✅ Already has' : '❌ Does not have'}\n`);

  // Grant DOCTOR_ROLE if needed
  if (!hasDoctor) {
    console.log('⏳ Granting DOCTOR_ROLE...');
    const tx1 = await healthlink.grantRole(DOCTOR_ROLE, targetAddress);
    console.log(`   📤 Transaction Hash: ${tx1.hash}`);
    const receipt1 = await tx1.wait();
    console.log(`   ✅ DOCTOR_ROLE granted! Block: ${receipt1.blockNumber}\n`);
  }

  // Grant PATIENT_ROLE if needed
  if (!hasPatient) {
    console.log('⏳ Granting PATIENT_ROLE...');
    const tx2 = await healthlink.grantRole(PATIENT_ROLE, targetAddress);
    console.log(`   📤 Transaction Hash: ${tx2.hash}`);
    const receipt2 = await tx2.wait();
    console.log(`   ✅ PATIENT_ROLE granted! Block: ${receipt2.blockNumber}\n`);
  }

  // Verify
  console.log('🔍 Verifying roles...');
  const finalHasDoctor = await healthlink.hasRole(DOCTOR_ROLE, targetAddress);
  const finalHasPatient = await healthlink.hasRole(PATIENT_ROLE, targetAddress);

  console.log(`   DOCTOR_ROLE:  ${finalHasDoctor ? '✅ Confirmed' : '❌ Failed'}`);
  console.log(`   PATIENT_ROLE: ${finalHasPatient ? '✅ Confirmed' : '❌ Failed'}\n`);

  if (finalHasDoctor && finalHasPatient) {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                            SUCCESS                                 ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log(`║ ${targetAddress} ║`);
    console.log('║ ✅ DOCTOR_ROLE                                                     ║');
    console.log('║ ✅ PATIENT_ROLE                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
