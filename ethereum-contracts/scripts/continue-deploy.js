import hre from "hardhat";
const { ethers } = hre;

async function continueDeployment() {
    console.log("🚀 Continuing HealthLink Contract Deployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    const contracts = {
        HealthLink: "0x54348485951c4106F1e912a0b2bF864c1c7769B5" // Already deployed
    };

    try {
        // Deploy PatientRecords Contract
        console.log("📄 Deploying PatientRecords contract...");
        const PatientRecords = await ethers.getContractFactory("PatientRecords");
        const patientRecords = await PatientRecords.deploy();
        await patientRecords.waitForDeployment();
        contracts.PatientRecords = await patientRecords.getAddress();
        console.log("✅ PatientRecords deployed to:", contracts.PatientRecords);

        // Deploy Appointments Contract
        console.log("\n📄 Deploying Appointments contract...");
        const Appointments = await ethers.getContractFactory("Appointments");
        const appointments = await Appointments.deploy();
        await appointments.waitForDeployment();
        contracts.Appointments = await appointments.getAddress();
        console.log("✅ Appointments deployed to:", contracts.Appointments);

        // Deploy Prescriptions Contract
        console.log("\n📄 Deploying Prescriptions contract...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        const prescriptions = await Prescriptions.deploy();
        await prescriptions.waitForDeployment();
        contracts.Prescriptions = await prescriptions.getAddress();
        console.log("✅ Prescriptions deployed to:", contracts.Prescriptions);

        // Deploy DoctorCredentials Contract
        console.log("\n📄 Deploying DoctorCredentials contract...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy();
        await doctorCredentials.waitForDeployment();
        contracts.DoctorCredentials = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials deployed to:", contracts.DoctorCredentials);

        console.log("\n✨ Deployment Summary:");
        console.log("========================");
        Object.entries(contracts).forEach(([name, address]) => {
            console.log(`${name}: ${address}`);
        });
        console.log("========================");

        // Save deployment addresses
        const fs = await import('fs/promises');
        const network = await ethers.provider.getNetwork();
        const deploymentInfo = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: contracts
        };

        await fs.writeFile(
            'deployment-addresses.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\n💾 Deployment addresses saved to deployment-addresses.json");

        // Update .env file
        console.log("\n📝 Updating .env with contract addresses...");
        let envContent = await fs.readFile('.env', 'utf8');

        const updateEnvVar = (content, key, value) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                return content.replace(regex, `${key}=${value}`);
            } else {
                return content + `\n${key}=${value}`;
            }
        };

        envContent = updateEnvVar(envContent, 'HEALTHLINK_ADDRESS', contracts.HealthLink);
        envContent = updateEnvVar(envContent, 'PATIENT_RECORDS_ADDRESS', contracts.PatientRecords);
        envContent = updateEnvVar(envContent, 'APPOINTMENTS_ADDRESS', contracts.Appointments);
        envContent = updateEnvVar(envContent, 'PRESCRIPTIONS_ADDRESS', contracts.Prescriptions);
        envContent = updateEnvVar(envContent, 'DOCTOR_CREDENTIALS_ADDRESS', contracts.DoctorCredentials);

        await fs.writeFile('.env', envContent);
        console.log("✅ .env updated with all contract addresses");

        console.log("\n🎉 All contracts deployed successfully!");

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(error.message);
        console.error(error);
        process.exit(1);
    }
}

continueDeployment()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
