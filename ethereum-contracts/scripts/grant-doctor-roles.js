const hre = require("hardhat");
const fs = require('fs');

async function main() {
    // Load deployment addresses
    const deploymentData = JSON.parse(
        fs.readFileSync('./deployment-addresses.json', 'utf8')
    );

    console.log("📋 Loading contracts from deployment...");
    console.log("HealthLink:", deploymentData.contracts.HealthLink);
    console.log("Appointments:", deploymentData.contracts.Appointments);
    console.log("Prescriptions:", deploymentData.contracts.Prescriptions);
    console.log("PatientRecords:", deploymentData.contracts.PatientRecords);
    console.log("");

    const healthLink = await hre.ethers.getContractAt(
        "HealthLink", 
        deploymentData.contracts.HealthLink
    );
    const appointments = await hre.ethers.getContractAt(
        "Appointments", 
        deploymentData.contracts.Appointments
    );
    const prescriptions = await hre.ethers.getContractAt(
        "Prescriptions", 
        deploymentData.contracts.Prescriptions
    );
    const patientRecords = await hre.ethers.getContractAt(
        "PatientRecords", 
        deploymentData.contracts.PatientRecords
    );

    // Get doctor address from environment or command line
    const doctorAddress = process.env.DOCTOR_WALLET_ADDRESS;
    
    if (!doctorAddress) {
        console.error("❌ Error: DOCTOR_WALLET_ADDRESS environment variable not set!");
        console.log("\nUsage:");
        console.log("  DOCTOR_WALLET_ADDRESS=0x... npx hardhat run scripts/grant-doctor-roles.js --network sepolia");
        process.exit(1);
    }

    console.log(`🏥 Granting DOCTOR_ROLE to: ${doctorAddress}\n`);

    try {
        // Grant roles
        console.log("⏳ [1/4] Granting role on HealthLink...");
        const tx1 = await healthLink.grantDoctorRole(doctorAddress);
        await tx1.wait();
        console.log("   ✅ Transaction confirmed:", tx1.hash);
        
        console.log("\n⏳ [2/4] Granting role on Appointments...");
        const tx2 = await appointments.grantDoctorRole(doctorAddress);
        await tx2.wait();
        console.log("   ✅ Transaction confirmed:", tx2.hash);
        
        console.log("\n⏳ [3/4] Granting role on Prescriptions...");
        const tx3 = await prescriptions.grantDoctorRole(doctorAddress);
        await tx3.wait();
        console.log("   ✅ Transaction confirmed:", tx3.hash);
        
        console.log("\n⏳ [4/4] Granting role on PatientRecords...");
        const tx4 = await patientRecords.grantDoctorRole(doctorAddress);
        await tx4.wait();
        console.log("   ✅ Transaction confirmed:", tx4.hash);

        console.log("\n✅ DOCTOR_ROLE granted on all contracts!");

        // Verify
        console.log("\n🔍 Verifying role assignment...");
        const DOCTOR_ROLE = await healthLink.DOCTOR_ROLE();
        const hasRoleHL = await healthLink.hasRole(DOCTOR_ROLE, doctorAddress);
        const hasRoleApp = await appointments.hasRole(DOCTOR_ROLE, doctorAddress);
        const hasRolePresc = await prescriptions.hasRole(DOCTOR_ROLE, doctorAddress);
        const hasRoleRec = await patientRecords.hasRole(DOCTOR_ROLE, doctorAddress);

        console.log(`\n📊 Role Status:`);
        console.log(`   HealthLink:      ${hasRoleHL ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
        console.log(`   Appointments:    ${hasRoleApp ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
        console.log(`   Prescriptions:   ${hasRolePresc ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
        console.log(`   PatientRecords:  ${hasRoleRec ? '✅ HAS ROLE' : '❌ NO ROLE'}`);

        if (hasRoleHL && hasRoleApp && hasRolePresc && hasRoleRec) {
            console.log(`\n🎉 SUCCESS! Doctor can now:`);
            console.log(`   - Create patients`);
            console.log(`   - Schedule appointments`);
            console.log(`   - Write prescriptions`);
            console.log(`   - Create medical records`);
        } else {
            console.log(`\n⚠️  WARNING: Some roles failed to assign!`);
        }

    } catch (error) {
        console.error("\n❌ Error granting roles:", error.message);
        if (error.message.includes("AccessControl")) {
            console.log("\n💡 Tip: Make sure you're using an admin account to grant roles");
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
