import fs from 'fs/promises';

async function updateRPC() {
    try {
        const envPath = '.env';
        let envContent = await fs.readFile(envPath, 'utf8');

        const newRpcUrl = 'https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg';

        // Update SEPOLIA_RPC_URL
        const regex = /^SEPOLIA_RPC_URL=.*$/m;
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `SEPOLIA_RPC_URL=${newRpcUrl}`);
        } else {
            envContent += `\nSEPOLIA_RPC_URL=${newRpcUrl}`;
        }

        await fs.writeFile(envPath, envContent);
        console.log('✅ .env updated with Alchemy RPC URL');
        console.log('RPC URL:', newRpcUrl);
    } catch (error) {
        console.error('❌ Error updating .env:', error.message);
        process.exit(1);
    }
}

updateRPC();
