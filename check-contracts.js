import { ethers } from 'ethers';

// Configuration
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg';
const CONTRACTS = {
  HealthLink: '0xA94AFCbFF804527315391EA52890c826f897A757',
  PatientRecords: '0xC6b6412fcf144Ce107eD79935cdBEfDC5cE1Cc8F',
  Appointments: '0x1A3F11F1735bB703587274478EEc323dC180304a',
  Prescriptions: '0xBC5BfBF99CE6087034863149B04A2593E562854b',
  DoctorCredentials: '0x7415A95125b64Ed491088FFE153a8D7773Fb1859'
};

async function checkContracts() {
  console.log('\\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           HEALTHLINK BLOCKCHAIN CONTRACT VERIFICATION             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  console.log('📡 Connected to Sepolia via Alchemy\\n');
  
  const results = {};
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`🔍 Checking ${name}...`);
    console.log(`   Address: ${address}`);
    
    try {
      // Check if contract exists (has code)
      const code = await provider.getCode(address);
      
      if (code === '0x') {
        console.log('   ❌ NOT DEPLOYED (no bytecode found)\\n');
        results[name] = { deployed: false, error: 'No bytecode' };
        continue;
      }
      
      console.log(`   ✅ Deployed (${code.length} bytes)`);
      
      // Get contract balance
      const balance = await provider.getBalance(address);
      console.log(`   💰 Balance: ${ethers.formatEther(balance)} ETH`);
      
      results[name] = { 
        deployed: true, 
        address,
        codeSize: code.length,
        balance: ethers.formatEther(balance)
      };
      
      console.log('   ✅ Contract verified\\n');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\\n`);
      results[name] = { deployed: false, error: error.message };
    }
  }
  
  // Summary
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                            SUMMARY                                 ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  
  const deployed = Object.values(results).filter(r => r.deployed).length;
  const total = Object.keys(CONTRACTS).length;
  
  console.log(`║ Total Contracts: ${total}                                                  ║`);
  console.log(`║ Deployed: ${deployed}                                                      ║`);
  console.log(`║ Failed: ${total - deployed}                                                        ║`);
  console.log('╚════════════════════════════════════════════════════════════════════╝\\n');
  
  if (deployed === total) {
    console.log('✅ All contracts deployed and verified on Sepolia!\\n');
  } else {
    console.log('⚠️  Some contracts are not deployed or accessible\\n');
    console.log('Failed contracts:');
    Object.entries(results).forEach(([name, result]) => {
      if (!result.deployed) {
        console.log(`  - ${name}: ${result.error}`);
      }
    });
    console.log('');
  }
  
  return results;
}

checkContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\\n❌ Script failed:', error);
    process.exit(1);
  });
