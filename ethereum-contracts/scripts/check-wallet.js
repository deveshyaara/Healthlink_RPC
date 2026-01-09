import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkWallet() {
    try {
        console.log("🔍 Checking wallet configuration...\n");

        // Check if environment variables are set
        if (!process.env.SEPOLIA_RPC_URL) {
            console.error("❌ SEPOLIA_RPC_URL not found in .env");
            process.exit(1);
        }
        if (!process.env.PRIVATE_KEY) {
            console.error("❌ PRIVATE_KEY not found in .env");
            process.exit(1);
        }

        // Validate private key format
        let privateKey = process.env.PRIVATE_KEY.trim();

        // Add 0x prefix if not present
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }

        // Check if it's a valid hex string of correct length
        if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
            console.error("❌ Invalid private key format. Should be 64 hex characters (with or without 0x prefix)");
            console.error(`   Current length: ${privateKey.length - 2} characters`);
            process.exit(1);
        }

        console.log("✅ Private key format is valid\n");

        // Connect to provider
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        console.log("✅ Connected to Sepolia RPC\n");

        // Create wallet
        const wallet = new ethers.Wallet(privateKey, provider);
        const address = await wallet.getAddress();
        console.log("📍 Wallet Address:", address);

        // Get balance
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);
        console.log("💰 Balance:", balanceInEth, "ETH");

        // Check if balance is sufficient for deployment
        const minRequired = 0.01; // Approximate minimum for deployment
        if (parseFloat(balanceInEth) < minRequired) {
            console.warn(`\n⚠️  WARNING: Balance is low. You need at least ${minRequired} ETH for deployment.`);
            console.warn("   Get Sepolia testnet ETH from: https://sepoliafaucet.com/");
        } else {
            console.log("\n✅ Wallet has sufficient balance for deployment!");
        }

        // Get nonce
        const nonce = await provider.getTransactionCount(address);
        console.log("🔢 Transaction Count (Nonce):", nonce);

        console.log("\n✨ Wallet check complete! Ready to deploy.");

    } catch (error) {
        console.error("\n❌ Error checking wallet:");
        console.error(error.message);
        process.exit(1);
    }
}

checkWallet();
