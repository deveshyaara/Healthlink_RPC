// Script to easily assign roles to wallet addresses
// Usage: npx hardhat run scripts/assign-role.js --network localhost

const hre = require("hardhat");
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("\n🏥 HealthLink Role Assignment Tool\n");

  // Get deployed contract address
  const deploymentPath = require('path').join(__dirname, '..', 'deployment-addresses.json');
  let contractAddress;
  
  try {
    const deployment = require(deploymentPath);
    contractAddress = deployment.contracts.HealthLink;
    console.log(`📝 Using deployed contract: ${contractAddress}\n`);
  } catch (error) {
    console.error("❌ Could not find deployment-addresses.json");
    console.error("   Please deploy contracts first with: npx hardhat run scripts/deploy.js --network localhost");
    process.exit(1);
  }

  // Get contract instance
  const HealthLink = await hre.ethers.getContractFactory("HealthLink");
  const contract = HealthLink.attach(contractAddress);

  // Get signer (admin)
  const [admin] = await hre.ethers.getSigners();
  console.log(`👤 Using admin account: ${admin.address}`);

  // Calculate role hashes
  const ADMIN_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ADMIN_ROLE"));
  const DOCTOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("DOCTOR_ROLE"));
  const PATIENT_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PATIENT_ROLE"));

  // Interactive menu
  while (true) {
    console.log("\n" + "=".repeat(50));
    console.log("What would you like to do?");
    console.log("=".repeat(50));
    console.log("1. Assign PATIENT role");
    console.log("2. Assign DOCTOR role");
    console.log("3. Assign ADMIN role");
    console.log("4. Check address roles");
    console.log("5. Revoke role");
    console.log("6. Exit");
    console.log("=".repeat(50));

    const choice = await question("\nEnter your choice (1-6): ");

    if (choice === '6') {
      console.log("\n👋 Goodbye!");
      rl.close();
      process.exit(0);
    }

    if (choice === '4') {
      // Check roles
      const address = await question("\nEnter wallet address to check: ");
      
      if (!hre.ethers.isAddress(address)) {
        console.log("❌ Invalid address format");
        continue;
      }

      console.log(`\n🔍 Checking roles for ${address}...`);
      
      const isAdmin = await contract.hasRole(ADMIN_ROLE, address);
      const isDoctor = await contract.hasRole(DOCTOR_ROLE, address);
      const isPatient = await contract.hasRole(PATIENT_ROLE, address);

      console.log("\nRoles:");
      console.log(`  👑 Admin:   ${isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`  ⚕️  Doctor:  ${isDoctor ? '✅ YES' : '❌ NO'}`);
      console.log(`  🏥 Patient: ${isPatient ? '✅ YES' : '❌ NO'}`);
      
      if (!isAdmin && !isDoctor && !isPatient) {
        console.log("\n⚠️  This address has no roles assigned.");
      }
      
      continue;
    }

    if (choice === '5') {
      // Revoke role
      const address = await question("\nEnter wallet address: ");
      
      if (!hre.ethers.isAddress(address)) {
        console.log("❌ Invalid address format");
        continue;
      }

      console.log("\nWhich role to revoke?");
      console.log("1. PATIENT");
      console.log("2. DOCTOR");
      console.log("3. ADMIN");
      
      const roleChoice = await question("\nEnter choice (1-3): ");
      
      let roleHash, roleName;
      if (roleChoice === '1') {
        roleHash = PATIENT_ROLE;
        roleName = 'PATIENT';
      } else if (roleChoice === '2') {
        roleHash = DOCTOR_ROLE;
        roleName = 'DOCTOR';
      } else if (roleChoice === '3') {
        roleHash = ADMIN_ROLE;
        roleName = 'ADMIN';
      } else {
        console.log("❌ Invalid choice");
        continue;
      }

      console.log(`\n⏳ Revoking ${roleName} role from ${address}...`);
      
      try {
        const tx = await contract.revokeRole(roleHash, address);
        await tx.wait();
        console.log(`✅ ${roleName} role revoked successfully!`);
        console.log(`   Transaction: ${tx.hash}`);
      } catch (error) {
        console.error("❌ Failed to revoke role:", error.message);
      }
      
      continue;
    }

    if (!['1', '2', '3'].includes(choice)) {
      console.log("❌ Invalid choice. Please select 1-6.");
      continue;
    }

    // Assign role
    const address = await question("\nEnter wallet address to assign role: ");
    
    if (!hre.ethers.isAddress(address)) {
      console.log("❌ Invalid address format");
      continue;
    }

    let roleHash, roleName;
    if (choice === '1') {
      roleHash = PATIENT_ROLE;
      roleName = 'PATIENT';
    } else if (choice === '2') {
      roleHash = DOCTOR_ROLE;
      roleName = 'DOCTOR';
    } else if (choice === '3') {
      roleHash = ADMIN_ROLE;
      roleName = 'ADMIN';
    }

    // Check if already has role
    const hasRole = await contract.hasRole(roleHash, address);
    if (hasRole) {
      console.log(`⚠️  Address already has ${roleName} role.`);
      const confirm = await question("Do you want to continue anyway? (y/n): ");
      if (confirm.toLowerCase() !== 'y') {
        continue;
      }
    }

    console.log(`\n⏳ Assigning ${roleName} role to ${address}...`);
    
    try {
      const tx = await contract.grantRole(roleHash, address);
      await tx.wait();
      console.log(`\n✅ ${roleName} role assigned successfully!`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`\n💡 This address can now:`);
      
      if (roleName === 'PATIENT') {
        console.log("   - View their own medical records");
        console.log("   - Book appointments");
        console.log("   - Manage consent");
      } else if (roleName === 'DOCTOR') {
        console.log("   - View patient records (with consent)");
        console.log("   - Create prescriptions");
        console.log("   - Manage appointments");
      } else if (roleName === 'ADMIN') {
        console.log("   - Assign roles to other addresses");
        console.log("   - Manage system configuration");
        console.log("   - Access audit logs");
      }
    } catch (error) {
      console.error("❌ Failed to assign role:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
