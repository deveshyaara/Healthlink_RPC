import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkNonce() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();

    console.log(`Wallet: ${address}`);

    const nonce = await provider.getTransactionCount(address);
    console.log(`Latest Nonce: ${nonce}`);

    const pendingNonce = await provider.getTransactionCount(address, "pending");
    console.log(`Pending Nonce: ${pendingNonce}`);

    if (pendingNonce > nonce) {
        console.log(`⚠️  ${pendingNonce - nonce} transactions pending`);
    } else {
        console.log("✅ No pending transactions");
    }

    const feeData = await provider.getFeeData();
    console.log(`Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
}

checkNonce();
