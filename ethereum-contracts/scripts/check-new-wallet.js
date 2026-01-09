import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkWalletBalance(address) {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

        console.log("🔍 Checking wallet:", address);

        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);

        console.log("💰 Balance:", balanceInEth, "ETH");

        if (parseFloat(balanceInEth) === 0) {
            console.log("\n❌ Wallet has ZERO balance!");
            return false;
        } else if (parseFloat(balanceInEth) < 0.05) {
            console.log("\n⚠️  Balance is low. Recommended: 0.05-0.1 ETH for deployment.");
            console.log("   Can deploy but might not complete all contracts.");
            return parseFloat(balanceInEth) > 0.01;
        } else {
            console.log("\n✅ Balance is sufficient for deployment!");
            return true;
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
        return false;
    }
}

// Check the new wallet address
checkWalletBalance("0x28B5bA425023c7206f55f01a7ee56EeD904d2AAf");
