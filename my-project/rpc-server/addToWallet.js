import { Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Helper function to get directory name ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Path to the wallet directory
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Path to the Org1 admin user's credentials
    const adminIdentityPath = path.resolve(
      __dirname,
      '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'
    );

    // Read the certificate and private key
    const certPath = path.join(adminIdentityPath, 'signcerts', 'cert.pem');
    const keyPath = path.join(adminIdentityPath, 'keystore');

    // The keystore directory should contain one file (the private key)
    const keyFiles = fs.readdirSync(keyPath);
    if (keyFiles.length === 0) {
      throw new Error('No private key found in keystore');
    }
    const privateKeyFile = keyFiles[0];
    const keyFilePath = path.join(keyPath, privateKeyFile);

    const cert = fs.readFileSync(certPath, 'utf8');
    const key = fs.readFileSync(keyFilePath, 'utf8');

    // Create the identity object
    const identity = {
      credentials: {
        certificate: cert,
        privateKey: key,
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // Add the identity to the wallet
    await wallet.put('admin', identity);
    console.log('Successfully imported "admin" identity into the wallet');

  } catch (error) {
    console.error(`Failed to import admin identity: ${error}`);
    process.exit(1);
  }
}

main();
