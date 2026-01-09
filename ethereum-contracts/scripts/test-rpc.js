import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function testRPCs() {
    const rpcUrls = [
        { name: "Your configured RPC", url: process.env.SEPOLIA_RPC_URL },
        { name: "Public Sepolia RPC #1", url: "https://rpc.sepolia.org" },
        { name: "Public Sepolia RPC #2", url: "https://eth-sepolia.public.blastapi.io" },
        { name: "Public Sepolia RPC #3", url: "https://sepolia.gateway.tenderly.co" },
        { name: "Ankr Public RPC", url: "https://rpc.ankr.com/eth_sepolia" }
    ];

    console.log("🔍 Testing Sepolia RPC endpoints...\n");

    for (const rpc of rpcUrls) {
        if (!rpc.url) {
            console.log(`⏭️  ${rpc.name}: Not configured`);
            continue;
        }

        try {
            const startTime = Date.now();
            const provider = new ethers.JsonRpcProvider(rpc.url);

            // Set a timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 10000)
            );

            const blockPromise = provider.getBlockNumber();

            const blockNumber = await Promise.race([blockPromise, timeoutPromise]);
            const responseTime = Date.now() - startTime;

            console.log(`✅ ${rpc.name}`);
            console.log(`   URL: ${rpc.url}`);
            console.log(`   Block: ${blockNumber}`);
            console.log(`   Response time: ${responseTime}ms\n`);
        } catch (error) {
            console.log(`❌ ${rpc.name}`);
            console.log(`   URL: ${rpc.url}`);
            console.log(`   Error: ${error.message}\n`);
        }
    }

    console.log("\n💡 Recommendation: Use the RPC with the fastest response time.");
}

testRPCs();
