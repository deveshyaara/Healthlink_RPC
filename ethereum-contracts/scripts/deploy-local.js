import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("🚀 Deploying HealthLink Contracts Locally...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");

    const deployedContracts = {};

    try {
        // 1. HealthLink - requires initialAdmin parameter
        console.log("1️⃣ Deploying HealthLink...");
        const HealthLink = await ethers.getContractFactory("HealthLink");
        const healthLink = await HealthLink.deploy(deployer.address); // Pass deployer as admin
        await healthLink.waitForDeployment();
        deployedContracts.HealthLink = await healthLink.getAddress();
        console.log("✅ HealthLink:", deployedContracts.HealthLink);

        // 2. PatientRecords
        console.log("\n2️⃣ Deploying PatientRecords...");
        const PatientRecords = await ethers.getContractFactory("PatientRecords");
        const patientRecords = await PatientRecords.deploy();
        await patientRecords.waitForDeployment();
        deployedContracts.PatientRecords = await patientRecords.getAddress();
        console.log("✅ PatientRecords:", deployedContracts.PatientRecords);

        // 3. Appointments
        console.log("\n3️⃣ Deploying Appointments...");
        const Appointments = await ethers.getContractFactory("Appointments");
        const appointments = await Appointments.deploy();
        await appointments.waitForDeployment();
        deployedContracts.Appointments = await appointments.getAddress();
        console.log("✅ Appointments:", deployedContracts.Appointments);

        // 4. Prescriptions
        console.log("\n4️⃣ Deploying Prescriptions...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        const prescriptions = await Prescriptions.deploy();
        await prescriptions.waitForDeployment();
        deployedContracts.Prescriptions = await prescriptions.getAddress();
        console.log("✅ Prescriptions:", deployedContracts.Prescriptions);

        // 5. DoctorCredentials
        console.log("\n5️⃣ Deploying DoctorCredentials...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy();
        await doctorCredentials.waitForDeployment();
        deployedContracts.DoctorCredentials = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials:", deployedContracts.DoctorCredentials);

        console.log("\n" + "=".repeat(80));
        console.log("✨ ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
        console.log("=".repeat(80));

        Object.entries(deployedContracts).forEach(([name, address]) => {
            console.log(`${name.padEnd(25)} ${address}`);
        });
        console.log("=".repeat(80));

        // Save to JSON
        const fs = await import('fs/promises');
        const network = await ethers.provider.getNetwork();

        const deploymentInfo = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deployedContracts
        };

        const filename = network.name === 'localhost' || network.name === 'hardhat'
            ? 'deployment-localhost.json'
            : 'deployment-addresses.json';

        await fs.writeFile(filename, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Saved to: ${filename}`);
        console.log("\n✅ Local deployment complete! All contracts working correctly.");

    } catch (error) {
        console.error("\n❌ DEPLOYMENT FAILED!");
        console.error("Error:", error.message);
        if (error.stack) {
            console.error("\nStack trace:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Fatal error:");
        console.error(error);
        process.exit(1);
    });
