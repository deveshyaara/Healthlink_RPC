import hre from "hardhat";
const { ethers } = hre;

async function deployContracts() {
    console.log("🚀 Deploying HealthLink Contracts to Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");

    const contracts = {};

    try {
        // Deploy HealthLink
        console.log("1️⃣ Deploying HealthLink...");
        const HealthLink = await ethers.getContractFactory("HealthLink");
        const healthLink = await HealthLink.deploy(deployer.address);
        await healthLink.waitForDeployment();
        contracts.HealthLink = await healthLink.getAddress();
        console.log("✅ HealthLink:", contracts.HealthLink, "\n");

        // Deploy PatientRecords
        console.log("2️⃣ Deploying PatientRecords...");
        const PatientRecords = await ethers.getContractFactory("PatientRecords");
        const patientRecords = await PatientRecords.deploy();
        await patientRecords.waitForDeployment();
        contracts.PatientRecords = await patientRecords.getAddress();
        console.log("✅ PatientRecords:", contracts.PatientRecords, "\n");

        // Deploy Appointments
        console.log("3️⃣ Deploying Appointments...");
        const Appointments = await ethers.getContractFactory("Appointments");
        const appointments = await Appointments.deploy();
        await appointments.waitForDeployment();
        contracts.Appointments = await appointments.getAddress();
        console.log("✅ Appointments:", contracts.Appointments, "\n");

        // Deploy Prescriptions
        console.log("4️⃣ Deploying Prescriptions...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        const prescriptions = await Prescriptions.deploy();
        await prescriptions.waitForDeployment();
        contracts.Prescriptions = await prescriptions.getAddress();
        console.log("✅ Prescriptions:", contracts.Prescriptions, "\n");

        // Deploy DoctorCredentials
        console.log("5️⃣ Deploying DoctorCredentials...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy();
        await doctorCredentials.waitForDeployment();
        contracts.DoctorCredentials = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials:", contracts.DoctorCredentials, "\n");

        console.log("=".repeat(60));
        console.log("✨ ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
        console.log("=".repeat(60));
        Object.entries(contracts).forEach(([name, address]) => {
            console.log(`${name}: ${address}`);
        });
        console.log("=".repeat(60));

        // Save to JSON
        const fs = await import('fs/promises');
        const network = await ethers.provider.getNetwork();

        const deploymentInfo = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts
        };

        await fs.writeFile('deployment-addresses.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Saved to deployment-addresses.json");

    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        throw error;
    }
}

deployContracts();
