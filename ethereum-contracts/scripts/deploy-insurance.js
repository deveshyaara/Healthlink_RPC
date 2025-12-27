/**
 * Deploy InsuranceClaims Contract
 * Deploys the new Phase 1 InsuranceClaims smart contract to specified network
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Deploying InsuranceClaims contract...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get account balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy InsuranceClaims contract
    console.log("\n📄 Deploying InsuranceClaims...");
    const InsuranceClaims = await hre.ethers.getContractFactory("InsuranceClaims");
    const insuranceClaims = await InsuranceClaims.deploy();

    await insuranceClaims.waitForDeployment();
    const contractAddress = await insuranceClaims.getAddress();

    console.log("✅ InsuranceClaims deployed to:", contractAddress);

    // Save contract address to file
    const deploymentData = {
        network: hre.network.name,
        contractAddress: contractAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(
        deploymentsDir,
        `InsuranceClaims-${hre.network.name}.json`
    );

    fs.writeFileSync(
        deploymentFile,
        JSON.stringify(deploymentData, null, 2)
    );

    console.log("\n📝 Deployment info saved to:", deploymentFile);

    // Wait for a few block confirmations before verification
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n⏳ Waiting for 5 block confirmations...");
        await insuranceClaims.deploymentTransaction().wait(5);
        console.log("✅ Confirmations received");

        // Verify contract on Etherscan (if supported network)
        if (process.env.ETHERSCAN_API_KEY) {
            console.log("\n🔍 Verifying contract on Etherscan...");
            try {
                await hre.run("verify:verify", {
                    address: contractAddress,
                    constructorArguments: [],
                });
                console.log("✅ Contract verified on Etherscan");
            } catch (error) {
                console.log("⚠️ Verification failed:", error.message);
            }
        }
    }

    console.log("\n✅ Deployment complete!");
    console.log("\n📋 Next steps:");
    console.log("1. Add contract address to .env:");
    console.log(`   INSURANCE_CLAIMS_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("2. Grant roles to insurance providers and hospitals");
    console.log("3. Test claim submission");

    return contractAddress;
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

export default main;
