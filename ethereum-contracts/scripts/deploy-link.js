import hre from "hardhat";
const { ethers } = hre;

async function linkAndDeploy() {
    console.log("🚀 Link & Deploy Remaining Contracts...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // 1. Recovered Addresses
    const contracts = {
        HealthLink: "0x4F20aFa5552f3FE609296567527979F143aBEc86",
        PatientRecords: "0xe19de503f89774b00abEA25e3F9F24c04944813e"
    };
    console.log("HealthLink:", contracts.HealthLink);
    console.log("PatientRecords:", contracts.PatientRecords);

    try {
        // 3. Appointments
        console.log("\n3️⃣ Deploying Appointments...");
        const Appointments = await ethers.getContractFactory("Appointments");
        // Manually specify gas limit to avoid estimation errors
        const appointments = await Appointments.deploy({ gasLimit: 3000000 });
        console.log("Tx sent:", appointments.deploymentTransaction().hash);
        await appointments.waitForDeployment();
        contracts.Appointments = await appointments.getAddress();
        console.log("✅ Appointments:", contracts.Appointments);

        // 4. Prescriptions
        console.log("\n4️⃣ Deploying Prescriptions...");
        const Prescriptions = await ethers.getContractFactory("Prescriptions");
        const prescriptions = await Prescriptions.deploy({ gasLimit: 3000000 });
        console.log("Tx sent:", prescriptions.deploymentTransaction().hash);
        await prescriptions.waitForDeployment();
        contracts.Prescriptions = await prescriptions.getAddress();
        console.log("✅ Prescriptions:", contracts.Prescriptions);

        // 5. DoctorCredentials
        console.log("\n5️⃣ Deploying DoctorCredentials...");
        const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
        const doctorCredentials = await DoctorCredentials.deploy({ gasLimit: 3000000 });
        console.log("Tx sent:", doctorCredentials.deploymentTransaction().hash);
        await doctorCredentials.waitForDeployment();
        contracts.DoctorCredentials = await doctorCredentials.getAddress();
        console.log("✅ DoctorCredentials:", contracts.DoctorCredentials);

        // SAVE
        console.log("\n💾 Saving configuration...");
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

        console.log("\n🎉 DONE! All contracts deployed.");

    } catch (error) {
        console.error("\n❌ FAILED:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

linkAndDeploy().catch(console.error);
