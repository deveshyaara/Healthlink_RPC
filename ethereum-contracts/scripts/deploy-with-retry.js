import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("🚀 Starting HealthLink Ethereum Contract Deployment...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);

    try {
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

        if (balance === 0n) {
            console.error("❌ ERROR: Account has zero balance! Please fund your wallet with Sepolia ETH.");
            console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error checking balance:", error.message);
        console.log("Continuing with deployment anyway...\n");
    }

    const contracts = {};

    try {
        // Deploy HealthLink Contract
        console.log("📄 Deploying HealthLink contract...");
        const HealthLink = await ethers.getContractFactory("HealthLink");
        const healthLink = await HealthLink.deploy(deployer.address);
        await healthLink.waitForDeployment();
        contracts.HealthLink = await healthLink.getAddress();
        console.log("✅ HealthLink deployed to:", contracts.HealthLink);

        // Deploy PatientRecords Contract
        console.log("\n📄 Deploying PatientRecords contract...");
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
        console.log("HealthLink:", contracts.HealthLink);
        console.log("PatientRecords:", contracts.PatientRecords);
        console.log("Appointments:", contracts.Appointments);
        console.log("Prescriptions:", contracts.Prescriptions);
        console.log("DoctorCredentials:", contracts.DoctorCredentials);
        console.log("========================");

        // Save deployment addresses to a file
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

        // Update .env file with contract addresses
        console.log("\n📝 Updating .env with contract addresses...");
        let envContent = await fs.readFile('.env', 'utf8');

        // Update or add contract addresses
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
        console.log("✅ .env updated with contract addresses");

        console.log("\n🎉 All contracts deployed successfully!");
        console.log("\n⚠️  IMPORTANT: Don't forget to update your frontend with these new contract addresses!");

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(error);

        // Save partial deployment info
        if (Object.keys(contracts).length > 0) {
            console.log("\n📝 Saving partial deployment info for already deployed contracts...");
            const fs = await import('fs/promises');
            await fs.writeFile(
                'partial-deployment.json',
                JSON.stringify({ contracts, timestamp: new Date().toISOString() }, null, 2)
            );
            console.log("Partial deployment saved to partial-deployment.json");
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
