import hre from "hardhat";
const { ethers } = hre;

async function deployLastTwo() {
    console.log("🚀 Deploying Prescriptions & DoctorCredentials (Retry)...\n");
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Known addresses
    const contracts = {
        HealthLink: "0x4F20aFa5552f3FE609296567527979F143aBEc86",
        PatientRecords: "0xe19de503f89774b00abEA25e3F9F24c04944813e",
        Appointments: "0xBA9DEe87364F7Eec6934fcbB82091ac2633f97A9"
    };

    try {
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice ? feeData.gasPrice * 120n / 100n : undefined;

        // 4. Prescriptions
        console.log("\n4️⃣ Deploying Prescriptions...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        // Increased gas limit to 8M
        const prescriptions = await Prescriptions.deploy({ gasLimit: 8000000, gasPrice });
        console.log("Tx Sent:", prescriptions.deploymentTransaction().hash);
        await prescriptions.waitForDeployment();
        contracts.Prescriptions = await prescriptions.getAddress();
        console.log("✅ Prescriptions:", contracts.Prescriptions);

        // 5. DoctorCredentials
        console.log("\n5️⃣ Deploying DoctorCredentials...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy({ gasLimit: 8000000, gasPrice });
        console.log("Tx Sent:", doctorCredentials.deploymentTransaction().hash);
        await doctorCredentials.waitForDeployment();
        contracts.DoctorCredentials = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials:", contracts.DoctorCredentials);

        // Save All
        console.log("\n💾 Saving all configuration...");
        const fs = await import('fs/promises');
        const network = await ethers.provider.getNetwork();

        // Save JSON
        const deploymentInfo = {
            network: network.name,
            chainId: Number(network.chainId),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts
        };
        await fs.writeFile('deployment-addresses.json', JSON.stringify(deploymentInfo, null, 2));

        // Update .env
        let envContent = await fs.readFile('.env', 'utf8');
        const updateEnvVar = (content, key, value) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            return regex.test(content) ? content.replace(regex, `${key}=${value}`) : content + `\n${key}=${value}`;
        };

        envContent = updateEnvVar(envContent, 'HEALTHLINK_ADDRESS', contracts.HealthLink);
        envContent = updateEnvVar(envContent, 'PATIENT_RECORDS_ADDRESS', contracts.PatientRecords);
        envContent = updateEnvVar(envContent, 'APPOINTMENTS_ADDRESS', contracts.Appointments);
        envContent = updateEnvVar(envContent, 'PRESCRIPTIONS_ADDRESS', contracts.Prescriptions);
        envContent = updateEnvVar(envContent, 'DOCTOR_CREDENTIALS_ADDRESS', contracts.DoctorCredentials);

        await fs.writeFile('.env', envContent);
        console.log("✅ .env updated!");
        console.log("🎉 ALL DEPLOYED SUCCESSFULLY!");

    } catch (error) {
        console.error("❌ ERROR:", error);
    }
}

deployLastTwo();
