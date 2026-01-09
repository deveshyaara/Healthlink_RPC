import hre from "hardhat";
const { ethers } = hre;

async function main() {
    try {
        console.log("🚀 Starting HealthLink Contract Deployment...\n");

        const [deployer] = await ethers.getSigners();
        console.log("Deploying with:", deployer.address);

        const balance = await ethers.provider.getBalance(deployer.address);
        console.log("Balance:", ethers.formatEther(balance), "ETH\n");

        // 1. HealthLink
        console.log("1. Deploying HealthLink...");
        const HealthLink = await ethers.getContractFactory("HealthLink");
        const healthLink = await HealthLink.deploy(deployer.address);
        console.log("Waiting for deployment...");
        await healthLink.waitForDeployment();
        const healthLinkAddress = await healthLink.getAddress();
        console.log("✅ HealthLink:", healthLinkAddress, "\n");

        // 2. PatientRecords
        console.log("2. Deploying PatientRecords...");
        const PatientRecords = await ethers.getContractFactory("PatientRecords");
        const patientRecords = await PatientRecords.deploy();
        console.log("Waiting for deployment...");
        await patientRecords.waitForDeployment();
        const patientRecordsAddress = await patientRecords.getAddress();
        console.log("✅ PatientRecords:", patientRecordsAddress, "\n");

        // 3. Appointments
        console.log("3. Deploying Appointments...");
        const Appointments = await ethers.getContractFactory("Appointments");
        const appointments = await Appointments.deploy();
        console.log("Waiting for deployment...");
        await appointments.waitForDeployment();
        const appointmentsAddress = await appointments.getAddress();
        console.log("✅ Appointments:", appointmentsAddress, "\n");

        // 4. Prescriptions
        console.log("4. Deploying Prescriptions...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        const prescriptions = await Prescriptions.deploy();
        console.log("Waiting for deployment...");
        await prescriptions.waitForDeployment();
        const prescriptionsAddress = await prescriptions.getAddress();
        console.log("✅ Prescriptions:", prescriptionsAddress, "\n");

        // 5. DoctorCredentials
        console.log("5. Deploying DoctorCredentials...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy();
        console.log("Waiting for deployment...");
        await doctorCredentials.waitForDeployment();
        const doctorCredentialsAddress = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials:", doctorCredentialsAddress, "\n");

        console.log("=".repeat(80));
        console.log("✨ ALL CONTRACTS DEPLOYED!");
        console.log("=".repeat(80));
        console.log("HealthLink:", healthLinkAddress);
        console.log("PatientRecords:", patientRecordsAddress);
        console.log("Appointments:", appointmentsAddress);
        console.log("Prescriptions:", prescriptionsAddress);
        console.log("DoctorCredentials:", doctorCredentialsAddress);
        console.log("=".repeat(80));

        // Save deployment info
        const fs = await import('fs/promises');
        const network = await ethers.provider.getNetwork();

        const deploymentInfo = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                HealthLink: healthLinkAddress,
                PatientRecords: patientRecordsAddress,
                Appointments: appointmentsAddress,
                Prescriptions: prescriptionsAddress,
                DoctorCredentials: doctorCredentialsAddress
            }
        };

        await fs.writeFile('deployment-addresses.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Saved to: deployment-addresses.json");

        console.log("\n✅ Deployment complete!");

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
