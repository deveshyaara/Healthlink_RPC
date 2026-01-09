import hre from "hardhat";
const { ethers } = hre;

async function deployOne() {
    console.log("🚀 Deploying Appointments Only...\n");
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    try {
        const Appointments = await ethers.getContractFactory("Appointments");
        console.log("Deploying...");

        // Manual gas settings
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice ? feeData.gasPrice * 120n / 100n : undefined; // +20%

        const appointments = await Appointments.deploy({
            gasLimit: 3000000,
            gasPrice: gasPrice
        });

        console.log("Tx Hash:", appointments.deploymentTransaction().hash);
        console.log("Waiting...");

        await appointments.waitForDeployment();

        const address = await appointments.getAddress();
        console.log("✅ Appointments Deployed:", address);

        // Save locally
        const fs = await import('fs/promises');
        await fs.writeFile('appt-address.txt', address);

    } catch (error) {
        console.error("❌ ERROR:", error);
    }
}

deployOne();
