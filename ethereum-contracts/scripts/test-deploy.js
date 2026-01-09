import hre from "hardhat";
const { ethers } = hre;

async function testDeploy() {
    try {
        console.log("Testing HealthLink deployment...\n");

        const [deployer] = await ethers.getSigners();
        console.log("Deployer:", deployer.address);
        console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

        const HealthLink = await ethers.getContractFactory("HealthLink");
        console.log("Contract factory created");

        console.log("Deploying with address:", deployer.address);
        const contract = await HealthLink.deploy(deployer.address);
        console.log("Deployment transaction sent");

        await contract.waitForDeployment();
        console.log("Deployment confirmed");

        const address = await contract.getAddress();
        console.log("\n✅ SUCCESS! HealthLink deployed to:", address);

    } catch (error) {
        console.error("\n❌ ERROR:");
        console.error("Message:", error.message);
        console.error("\nFull error:");
        console.error(error);
    }
}

testDeploy();
