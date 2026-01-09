import fs from 'fs/promises';

async function updateEnv() {
    const envPath = '.env';
    let envContent = await fs.readFile(envPath, 'utf8');

    const privateKey = '0ce524e7a89d96497a0d2ab561be6eca00d0f8a4514d2cf0d33b7907dde4f935';

    // Update PRIVATE_KEY
    const regex = /^PRIVATE_KEY=.*$/m;
    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `PRIVATE_KEY=${privateKey}`);
    } else {
        envContent += `\nPRIVATE_KEY=${privateKey}`;
    }

    await fs.writeFile(envPath, envContent);
    console.log('✅ .env updated with new Private Key');
}

updateEnv();
