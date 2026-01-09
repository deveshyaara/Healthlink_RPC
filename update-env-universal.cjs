const fs = require('fs');
const path = require('path');

const envPath = process.argv[2];
if (!envPath) {
    console.error("Please provide .env path");
    process.exit(1);
}

const addresses = {
    HEALTHLINK_ADDRESS: "0x4F20aFa5552f3FE609296567527979F143aBEc86",
    PATIENT_RECORDS_ADDRESS: "0xe19de503f89774b00abEA25e3F9F24c04944813e",
    APPOINTMENTS_ADDRESS: "0xBA9DEe87364F7Eec6934fcbB82091ac2633f97A9",
    PRESCRIPTIONS_ADDRESS: "0xB1e565Af53B93F30c001B834aECCE32Fe5c299af",
    DOCTOR_CREDENTIALS_ADDRESS: "0x8a14031c66797b81E7900cB2C4f97d343E8f50e5",
    ETHEREUM_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg",
    PRIVATE_KEY: "bfb5a3ebc847c166b178e5bd8b8689204c5cb2d76f3516e4c325aa49992f335d",
    DEPLOYER_PRIVATE_KEY: "bfb5a3ebc847c166b178e5bd8b8689204c5cb2d76f3516e4c325aa49992f335d"
};

// Also support NEXT_PUBLIC_ prefix for frontend
const frontendAddresses = {};
Object.entries(addresses).forEach(([key, val]) => {
    frontendAddresses[`NEXT_PUBLIC_${key}`] = val;
});

let content = fs.readFileSync(envPath, 'utf8');

const updateKey = (key, val) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
        console.log(`Updated ${key}`);
    } else {
        // Check if it's likely a frontend env (has NEXT_PUBLIC)
        if (content.includes('NEXT_PUBLIC_') && !key.startsWith('NEXT_PUBLIC_')) {
            // Skip backend keys in frontend file
            return;
        }
        // Check if it's likely a backend env (no NEXT_PUBLIC usually)
        if (!content.includes('NEXT_PUBLIC_') && key.startsWith('NEXT_PUBLIC_')) {
            // Skip frontend keys in backend file
            return;
        }

        content += `\n${key}=${val}`;
        console.log(`Added ${key}`);
    }
};

Object.entries(addresses).forEach(([key, val]) => updateKey(key, val));
Object.entries(frontendAddresses).forEach(([key, val]) => updateKey(key, val));

fs.writeFileSync(envPath, content);
console.log(`Updated ${envPath}`);
