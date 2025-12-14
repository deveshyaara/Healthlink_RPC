import hre from "hardhat";
import fs from 'fs';

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentData = JSON.parse(
        fs.readFileSync('./deployment-addresses.json', 'utf8')
    );

    console.log("\n📋 Loading contracts from deployment...");
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

    console.log(`\n🏥 Granting DOCTOR_ROLE to deployer: ${deployer.address}\n`);

    try {
        // Check current roles
        const DOCTOR_ROLE = await healthLink.DOCTOR_ROLE();
        const PATIENT_ROLE = await healthLink.PATIENT_ROLE();
        
        console.log("🔍 Checking current roles...");
        const hasDoctorRole = await healthLink.hasRole(DOCTOR_ROLE, deployer.address);
        const hasPatientRole = await healthLink.hasRole(PATIENT_ROLE, deployer.address);
        
        console.log(`   Doctor role: ${hasDoctorRole ? '✅ Already has' : '❌ Missing'}`);
        console.log(`   Patient role: ${hasPatientRole ? '✅ Already has' : '❌ Missing'}`);

        if (!hasDoctorRole) {
            console.log("\n⏳ Granting DOCTOR_ROLE on all contracts...");
            
            console.log("   [1/4] HealthLink...");
            const tx1 = await healthLink.grantDoctorRole(deployer.address);
            await tx1.wait();
            console.log("      ✅", tx1.hash);
            
            console.log("   [2/4] Appointments...");
            const tx2 = await appointments.grantDoctorRole(deployer.address);
            await tx2.wait();
            console.log("      ✅", tx2.hash);
            
            console.log("   [3/4] Prescriptions...");
            const tx3 = await prescriptions.grantDoctorRole(deployer.address);
            await tx3.wait();
            console.log("      ✅", tx3.hash);
            
            console.log("   [4/4] PatientRecords...");
            const tx4 = await patientRecords.grantDoctorRole(deployer.address);
            await tx4.wait();
            console.log("      ✅", tx4.hash);
        }

        if (!hasPatientRole) {
            console.log("\n⏳ Granting PATIENT_ROLE on all contracts...");
            
            console.log("   [1/4] HealthLink...");
            const tx5 = await healthLink.grantPatientRole(deployer.address);
            await tx5.wait();
            console.log("      ✅", tx5.hash);
            
            console.log("   [2/4] Appointments...");
            const tx6 = await appointments.grantPatientRole(deployer.address);
            await tx6.wait();
            console.log("      ✅", tx6.hash);
            
            console.log("   [3/4] Prescriptions...");
            const tx7 = await prescriptions.grantPatientRole(deployer.address);
            await tx7.wait();
            console.log("      ✅", tx7.hash);
            
            console.log("   [4/4] PatientRecords...");
            const tx8 = await patientRecords.grantPatientRole(deployer.address);
            await tx8.wait();
            console.log("      ✅", tx8.hash);
        }

        console.log("\n✅ All roles granted!");

        // Test creating a patient
        console.log("\n🧪 Testing: Creating a test patient...");
        const testPatientId = "TEST_PATIENT_" + Date.now();
        const publicData = JSON.stringify({ 
            name: "Test Patient", 
            age: 30,
            bloodType: "O+",
            createdBy: "deployment-script"
        });

        try {
            const createTx = await healthLink.createPatient(testPatientId, publicData);
            await createTx.wait();
            console.log("   ✅ Patient created successfully!");
            console.log("   Patient ID:", testPatientId);
            
            // Verify patient exists
            const patient = await healthLink.getPatient(testPatientId);
            console.log("   ✅ Patient verified in contract:", patient.exists);
        } catch (createError) {
            if (createError.message.includes("already exists")) {
                console.log("   ℹ️  Test patient already exists (that's okay)");
            } else {
                throw createError;
            }
        }

        console.log("\n🎉 SUCCESS! Deployer account can now act as both doctor and patient!");
        console.log(`\n📝 Account Details:`);
        console.log(`   Address: ${deployer.address}`);
        console.log(`   Roles: Doctor ✅, Patient ✅`);
        console.log(`\n💡 Use this address to log in to the frontend for testing.`);

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
