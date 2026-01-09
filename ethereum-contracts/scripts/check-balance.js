import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    console.log("Wallet:", address);
    console.log("Balance:", balanceInEth, "ETH");

    if (parseFloat(balanceInEth) === 0) {
        console.log("\nYour wallet has ZERO balance!");
        console.log("You need to fund it with Sepolia ETH from a faucet.");
        console.log("\nFaucet options:");
        console.log("1. https://sepoliafaucet.com/");
        console.log("2. https://www.alchemy.com/faucets/ethereum-sepolia");
        console.log("3. https://faucet.quicknode.com/ethereum/sepolia");
    } else if (parseFloat(balanceInEth) < 0.05) {
        console.log("\nBalance is low. Recommended: 0.05-0.1 ETH for deployment.");
    } else {
        console.log("\nBalance is sufficient for deployment!");
    }
}

checkBalance();
