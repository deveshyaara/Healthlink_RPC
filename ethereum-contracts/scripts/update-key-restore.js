import fs from 'fs/promises';

async function updateEnv() {
    const envPath = '.env';
    let envContent = await fs.readFile(envPath, 'utf8');

    const privateKey = 'bfb5a3ebc847c166b178e5bd8b8689204c5cb2d76f3516e4c325aa49992f335d';

    // Update PRIVATE_KEY
    const regex = /^PRIVATE_KEY=.*$/m;
    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `PRIVATE_KEY=${privateKey}`);
    } else {
        envContent += `\nPRIVATE_KEY=${privateKey}`;
    }

    await fs.writeFile(envPath, envContent);
    console.log('✅ .env updated with Private Key for 0x38a8...');
}

updateEnv();
