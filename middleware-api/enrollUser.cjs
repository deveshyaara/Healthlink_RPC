const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function enrollUser() {
  try {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    // Create CA client
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem[0];
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
    
    // Load wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if admin exists
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.error('Admin identity not found. Please import admin first.');
      return;
    }
    
    // Build admin user object
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    
    // Register and enroll appUser
    try {
      const secret = await ca.register({
        affiliation: 'org1.department1',
        enrollmentID: 'appUser',
        role: 'client'
      }, adminUser);
      
      const enrollment = await ca.enroll({
        enrollmentID: 'appUser',
        enrollmentSecret: secret
      });
      
      const userIdentity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: 'Org1MSP',
        type: 'X.509',
      };
      
      await wallet.put('appUser', userIdentity);
      console.log('✅ Successfully registered and enrolled appUser');
      
    } catch (registerError) {
      if (registerError.message && registerError.message.includes('is already registered')) {
        console.log('⚠️  User already registered. Identity should exist in wallet.');
      } else {
        throw registerError;
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to enroll user: ${error.message}`);
    console.error(error.stack);
  }
}

enrollUser();
