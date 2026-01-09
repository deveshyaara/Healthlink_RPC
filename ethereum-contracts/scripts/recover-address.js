import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

async function recoverAddress() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const walletAddress = "0x38a82C7B5Df148eE345dA4F69d4f8C1eB600b424";

    const nonce = await provider.getTransactionCount(walletAddress);

    if (nonce > 0) {
        const contractAddress = ethers.getCreateAddress({
            from: walletAddress,
            nonce: 0
        });
        console.log(contractAddress);
        await fs.writeFile('recovered-address.txt', contractAddress);
    } else {
        console.log("NO_DEPLOYMENT");
    }
}

recoverAddress();
