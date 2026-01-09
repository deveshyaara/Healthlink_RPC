import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function recoverMore() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const walletAddress = "0x38a82C7B5Df148eE345dA4F69d4f8C1eB600b424";

    console.log("Checking deployments for:", walletAddress);

    // HealthLink (Nonce 0)
    const healthLink = ethers.getCreateAddress({ from: walletAddress, nonce: 0 });
    console.log(`Nonce 0 (HealthLink): ${healthLink}`);

    // PatientRecords (Nonce 1)
    const patientRecords = ethers.getCreateAddress({ from: walletAddress, nonce: 1 });
    console.log(`Nonce 1 (PatientRecords): ${patientRecords}`);

    // Check if code exists at these addresses
    const code0 = await provider.getCode(healthLink);
    const code1 = await provider.getCode(patientRecords);

    console.log(`HealthLink Deployed? ${code0 !== "0x"}`);
    console.log(`PatientRecords Deployed? ${code1 !== "0x"}`);
}

recoverMore();
