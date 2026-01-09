const fs = require('fs');
const path = require('path');

const contracts = [
    'HealthLink',
    'PatientRecords',
    'Appointments',
    'Prescriptions',
    'DoctorCredentials'
];

const sourceDir = path.join(__dirname, 'ethereum-contracts', 'artifacts', 'contracts');
const destDir = path.join(__dirname, 'frontend', 'public', 'contracts');
const deploySource = path.join(__dirname, 'ethereum-contracts', 'deployment-addresses.json');

// Ensure destination exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy Deployment Addresses
if (fs.existsSync(deploySource)) {
    fs.copyFileSync(deploySource, path.join(destDir, 'deployment-addresses.json'));
    console.log('✅ Copied deployment-addresses.json');
} else {
    console.error('❌ deployment-addresses.json not found!');
}

// Copy ABIs
contracts.forEach(contract => {
    const src = path.join(sourceDir, `${contract}.sol`, `${contract}.json`);
    const dest = path.join(destDir, `${contract}.json`);

    if (fs.existsSync(src)) {
        // Read and minify (optional, but good practice)
        const content = JSON.parse(fs.readFileSync(src, 'utf8'));
        // We only need the ABI usually, but copying whole file is safer for debug
        fs.writeFileSync(dest, JSON.stringify(content, null, 2));
        console.log(`✅ Copied ${contract}.json`);

        // Also try to update backend contracts folder if it exists, just in case
        // (Though backend reads from artifacts directly usually)
    } else {
        console.error(`❌ Artifact not found: ${src}`);
    }
});

console.log('🎉 Frontend assets updated!');
