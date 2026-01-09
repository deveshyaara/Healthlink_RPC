import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkNonce2() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const walletAddress = "0x38a82C7B5Df148eE345dA4F69d4f8C1eB600b424";

    console.log("Checking nonce 2 for:", walletAddress);

    // Appointments (Nonce 2)
    const address = ethers.getCreateAddress({ from: walletAddress, nonce: 2 });
    console.log(`Nonce 2 Address: ${address}`);

    const code = await provider.getCode(address);
    console.log(`Deployed? ${code !== "0x"}`);

    // Pending
    const pending = await provider.getTransactionCount(walletAddress, "pending");
    const latest = await provider.getTransactionCount(walletAddress, "latest");
    console.log(`Pending: ${pending}, Latest: ${latest}`);
}

checkNonce2();
